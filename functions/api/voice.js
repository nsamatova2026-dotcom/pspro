import { HttpError, checkRateLimit, geminiGenerate, handle, json, participantId, readJson, synthesize, thinkingFor } from "../../server/lib.js";

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

const MAX_AUDIO_B64 = 4 * 1024 * 1024; // ~3 MB WAV, 16 kHz da taxminan 90 soniya

// Ovozli suhbat: audio → Gemini (nutqni matnga aylantirish + KXT javobi) → { transcript, reply }
export const onRequestPost = handle(async ({ request, env, waitUntil = (p) => p }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "voice_not_configured");
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

  const schema = { type: "OBJECT", properties: { transcript: { type: "STRING" }, reply: { type: "STRING" } }, required: ["transcript", "reply"] };
  const t0 = Date.now();
  const { cand, model } = await geminiGenerate(env, "voice", (model, plain) => ({
    systemInstruction: { parts: [{ text: VOICE_SYSTEM }] },
    contents: [...history, { role: "user", parts: [{ inlineData: { mimeType: body.mime, data: body.audio } }, { text: "Bu foydalanuvchining navbatdagi gapi." }] }],
    generationConfig: {
      maxOutputTokens: 1024, responseMimeType: "application/json", responseSchema: schema,
      ...thinkingFor(model, plain),
    },
  }));
  const raw = (cand.content?.parts || []).map((p) => p.text || "").join("");
  let out;
  try { out = JSON.parse(raw); } catch { throw new HttpError(502, "bad_json"); }
  const result = { type: "text", transcript: String(out.transcript || "").trim(), reply: String(out.reply || "").trim(), model, ms: Date.now() - t0 };
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
      await line({ type: "audio_error", error: e instanceof HttpError ? e.code : "ai_unavailable" }).catch(() => {});
    } finally { await writer.close().catch(() => {}); }
  })());
  return new Response(readable, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
});
