import { HttpError, handle, json } from "../../server/lib.js";
import { chatModels, generate, listModels, voiceModels } from "../../server/gemini.js";

// Gemini tekshiruvi: kalit ishlayaptimi, qaysi model javob beradi, qancha vaqt oladi.
// Xato bo'lsa — Google xabarining o'zi. Kalit qiymati qaytarilmaydi.
let cached = null;
export const onRequestGet = handle(async ({ request, env }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "gemini_not_configured");
  if (cached && Date.now() - cached.at < 20000) return json(cached.data);
  const where = { colo: request.cf?.colo || null, country: request.cf?.country || null };
  const out = { key: "bor", where, models: { chat: chatModels(env), voice: voiceModels(env), tts: env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts" } };
  try {
    const list = await listModels(env);
    out.available = { count: list.length, flash: list.filter((m) => /flash/.test(m)).slice(0, 12) };
  } catch (e) {
    out.available = { error: e.code || "error", detail: e.extra?.detail || String(e?.message || e) };
  }
  try {
    const r = await generate(env, { models: chatModels(env), contents: [{ role: "user", parts: [{ text: "Bitta so'z bilan javob ber: salom" }] }], maxTokens: 50 });
    out.test = { ok: true, model: r.model, ms: r.ms, reply: r.text.slice(0, 80), attempts: r.attempts };
  } catch (e) {
    out.test = { ok: false, error: e.code || "error", detail: e.extra?.detail || String(e?.message || e), attempts: e.extra?.attempts || [] };
  }
  cached = { at: Date.now(), data: out };
  return json(out);
});
