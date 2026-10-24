import { HttpError, checkRateLimit, handle, json, participantId, readJson, synthesize } from "../../server/lib.js";

// Matnni Gemini ovozida o'qish: { text } → { audio (base64 PCM), mime }
export const onRequestPost = handle(async ({ request, env }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "voice_not_configured");
  participantId(request);
  const body = await readJson(request, 16 * 1024);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1500) : "";
  if (!text) throw new HttpError(400, "bad_input");
  await checkRateLimit(env, request);
  return json(await synthesize(env, text));
});
