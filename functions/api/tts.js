import { HttpError, callGemini, checkRateLimit, handle, json, participantId, readJson } from "../../server/lib.js";

// Matnni Gemini ovozida o'qish: { text } → { audio (base64 PCM), mime }
export const onRequestPost = handle(async ({ request, env }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "voice_not_configured");
  participantId(request);
  const body = await readJson(request, 16 * 1024);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1500) : "";
  if (!text) throw new HttpError(400, "bad_input");
  await checkRateLimit(env, request);
  const cand = await callGemini(env, env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts", {
    contents: [{ parts: [{ text: `O'zbek tilida iliq, xotirjam va sekinroq ohangda o'qing: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE || "Kore" } } },
    },
  });
  const part = (cand.content?.parts || []).find((p) => p.inlineData?.data);
  if (!part) throw new HttpError(502, "ai_unavailable");
  return json({ audio: part.inlineData.data, mime: part.inlineData.mimeType || "audio/L16;rate=24000" });
});
