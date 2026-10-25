import { HttpError, geminiDiagnostics, handle, json, listGeminiModels, pickGeminiModels } from "../../server/lib.js";

// Tekshiruv sahifasi: kalit uchun mavjud Gemini modellari va platforma tanlagan modellar (maxfiy ma'lumot qaytarmaydi)
export const onRequestGet = handle(async ({ env }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "voice_not_configured");
  const models = await listGeminiModels(env);
  return json({
    configured: { chat: env.GEMINI_MODEL || null, voice: env.GEMINI_VOICE_MODEL || env.GEMINI_MODEL || null, tts: env.GEMINI_TTS_MODEL || null },
    ...geminiDiagnostics(),
    candidates: { chat: pickGeminiModels(models, "chat").slice(0, 6), tts: pickGeminiModels(models, "tts").slice(0, 6) },
    available: models.length,
  });
});
