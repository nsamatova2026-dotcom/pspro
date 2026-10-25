import { HttpError, checkRateLimit, geminiGenerate, handle, json, participantId, readJson, synthesize, thinkingFor, withTimeout } from "../../server/lib.js";
import { runTextChain } from "./ai.js";

const VOICE_SYSTEM = `Sen "RuhAI" — o'zbekistonlik talabalar uchun o'zbek tilida gaplashadigan psixologik qo'llab-quvvatlash ovozli suhbatdoshisan.
Senga foydalanuvchining navbatdagi gapi audio ko'rinishida keladi. Ikki narsani qaytar:
1) transcript — foydalanuvchi aytgan gapni o'zbek tilida, lotin yozuvida, aynan yoz. Audio tushunarsiz yoki bo'sh bo'lsa, transcript bo'sh qolsin.
2) reply — unga javobing.
Javob qoidalari:
- Kognitiv-xulqiy terapiya (KXT) usullaridan foydalan: his-tuyg'uni aks ettirish, avtomatik fikrni aniqlash, dalillarni tekshirish, muqobil fikr topish, kichik amaliy qadam, nafas mashqlari.
- Javob ovoz chiqarib o'qiladi: 2-3 ta qisqa, sodda gap (jami 45 so'zdan oshmasin); ro'yxat, raqamlash, qavslar va maxsus belgilar ishlatma; oxirida bitta ochiq savol ber.
- Iliq va hurmatli ("siz" deb) gapir, o'zbek madaniyatini hisobga ol.
- Tashxis qo'yma, dori tavsiya qilma, o'zingni psixolog deb ko'rsatma.
- Agar foydalanuvchi o'z joniga qasd qilish, o'ziga yoki boshqaga zarar yetkazish haqida gapirsa: xavfsizligi haqida ochiq so'ra, yolg'iz emasligini ayt, darhol ishonchli inson, universitet psixologi yoki 103 yoki 112 raqamlariga murojaat qilishni so'ra.
- Audio tushunarsiz bo'lsa, reply da muloyimlik bilan qayta aytib berishni so'ra.`;

// Whisper matnga aylantirgandan keyin ishlatiladigan matnli ko'rsatma
const TEXT_SYSTEM = VOICE_SYSTEM
  .replace(/Senga foydalanuvchining[\s\S]*?2\) reply — unga javobing\.\n/, "Foydalanuvchining gapi nutqni aniqlash dasturi orqali matnga aylantirilgan, unda xatolar bo'lishi mumkin: ma'nosini tushunishga harakat qil. Faqat javob matnini yoz.\n")
  .replace("- Audio tushunarsiz bo'lsa, reply da", "- Gap tushunarsiz bo'lsa,");

const MAX_AUDIO_B64 = 4 * 1024 * 1024; // ~3 MB WAV, 16 kHz da taxminan 90 soniya

// Ovozli suhbat: audio → Whisper (matn) → Gemini/Workers AI (KXT javobi) → { transcript, reply }; zaxira: Gemini audio tahlili
export const onRequestPost = handle(async ({ request, env, waitUntil = (p) => p }) => {
  if (!env.GEMINI_API_KEY && !env.AI) throw new HttpError(503, "voice_not_configured");
  participantId(request);
  const body = await readJson(request, MAX_AUDIO_B64 + 64 * 1024);
  if (typeof body.audio !== "string" || !body.audio || body.audio.length > MAX_AUDIO_B64) throw new HttpError(400, "bad_audio");
  if (!["audio/wav", "audio/webm", "audio/ogg", "audio/mp4"].includes(body.mime)) throw new HttpError(400, "bad_audio");
  await checkRateLimit(env, request);

  // Oldingi suhbat: faqat matn, navbatma-navbat, foydalanuvchidan boshlanadi
  const history = [];
  for (const m of Array.isArray(body.history) ? body.history.slice(-12) : []) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const role = m.role === "assistant" ? "model" : "user", text = m.content.slice(0, 4000);
    const last = history[history.length - 1];
    if (last && last.role === role) last.parts[0].text += "\n\n" + text;
    else if (history.length || role === "user") history.push({ role, parts: [{ text }] });
  }
  if (history.length && history[history.length - 1].role === "user") history.push({ role: "model", parts: [{ text: "Tushundim." }] });

  const t0 = Date.now();
  // Asosiy yo'l: Cloudflare Whisper nutqni matnga aylantiradi (1–3 s), keyin oddiy matnli javob olinadi.
  // Whisper yo'q yoki xato bersa — Gemini audio tahlili (sekinroq) ishlatiladi.
  let result = null, sttErr = null;
  if (env.AI && (env.VOICE_STT || "whisper") === "whisper") {
    try { result = await viaWhisper(env, body, history); }
    catch (e) {
      if (e.afterStt || (e instanceof HttpError && e.code === "daily_limit")) throw e; // matn olingan, javob provayderlari ishlamadi
      sttErr = e; console.error("Whisper yo'li ishlamadi:", e?.code || e?.message || e);
    }
  }
  if (!result) {
    if (!env.GEMINI_API_KEY) throw sttErr || new HttpError(503, "voice_not_configured");
    result = await viaGeminiAudio(env, body, history);
    if (sttErr) result.trace = [{ model: "whisper", result: sttErr.code || "error", ...(sttErr.extra?.detail ? { detail: sttErr.extra.detail } : {}) }, ...(result.trace || [])];
  }
  result.ms = Date.now() - t0;
  if (!body.speak || !result.reply) return json(result);

  // Oqimli javob (NDJSON): matn darhol yuboriladi, ovoz tayyor bo'lgach ikkinchi qator bo'lib keladi
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter(), enc = new TextEncoder();
  const line = (o) => writer.write(enc.encode(JSON.stringify(o) + "\n"));
  waitUntil((async () => {
    try {
      await line(result);
      await checkRateLimit(env, request);
      const t1 = Date.now();
      await line({ type: "audio", ...(await synthesize(env, result.reply)), ms: Date.now() - t1 });
    } catch (e) {
      // Gemini ovozi bo'lmasa, sahifa brauzer ovozida o'qiydi
      await line({ type: "audio_error", error: e instanceof HttpError ? e.code : "ai_unavailable" }).catch(() => {});
    } finally { await writer.close().catch(() => {}); }
  })());
  return new Response(readable, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
});

async function viaWhisper(env, body, history) {
  const model = env.WHISPER_MODEL || "@cf/openai/whisper-large-v3-turbo";
  const t = Date.now();
  let out;
  try {
    out = await withTimeout(env.AI.run(model, { audio: body.audio, language: "uz", vad_filter: true }), 20000);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(502, "ai_unavailable", { detail: "Whisper: " + String(e?.message || e).slice(0, 200) });
  }
  const sttMs = Date.now() - t;
  const transcript = String(out?.text || out?.result?.text || "").trim();
  const trace = [{ model: "whisper", result: "ok", ms: sttMs }];
  if (!transcript) {
    return { type: "text", transcript: "", reply: "Kechirasiz, gapingizni eshita olmadim. Iltimos, yana bir bor aytib bering.", model: "whisper", trace };
  }
  const messages = history.map((m) => ({ role: m.role === "model" ? "assistant" : "user", content: m.parts[0].text }));
  if (messages.length && messages[messages.length - 1].role === "user") messages[messages.length - 1].content += "\n\n" + transcript;
  else messages.push({ role: "user", content: transcript });
  let res;
  try { res = await runTextChain(env, messages, { system: TEXT_SYSTEM, maxOutput: 400 }); }
  catch (e) { e.afterStt = true; e.extra = { ...(e.extra || {}), trace: [...trace, ...(e.extra?.tried || []).map((x) => ({ model: x.model || x.provider, ...x }))] }; throw e; }
  for (const x of res.tried) trace.push({ model: x.model || x.provider, result: x.result, ms: x.ms, ...(x.detail ? { detail: x.detail } : {}) });
  return { type: "text", transcript, reply: res.text.trim(), model: "whisper + " + (res.model || res.provider), sttMs, trace };
}

async function viaGeminiAudio(env, body, history) {
  const schema = { type: "OBJECT", properties: { transcript: { type: "STRING" }, reply: { type: "STRING" } }, required: ["transcript", "reply"] };
  const { cand, model, trace } = await geminiGenerate(env, "voice", (model, variant) => ({
    systemInstruction: { parts: [{ text: VOICE_SYSTEM }] },
    contents: [...history, { role: "user", parts: [{ inlineData: { mimeType: body.mime, data: body.audio } }, { text: "Bu foydalanuvchining navbatdagi gapi." }] }],
    generationConfig: {
      maxOutputTokens: 1024, responseMimeType: "application/json", responseSchema: schema,
      ...thinkingFor(model, variant),
    },
  }));
  const raw = (cand.content?.parts || []).map((p) => p.text || "").join("");
  let out;
  try { out = JSON.parse(raw); } catch { throw new HttpError(502, "bad_json"); }
  return { type: "text", transcript: String(out.transcript || "").trim(), reply: String(out.reply || "").trim(), model, trace };
}
