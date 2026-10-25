import { HttpError, checkRateLimit, handle, json, participantId, readJson } from "../../server/lib.js";
import { chatModels, generate } from "../../server/gemini.js";

const MAX_CHARS = 60000;
const SYSTEM =
  "Sen RuhAI platformasining bir qismisan: o'zbekistonlik talabalar uchun psixologik qo'llab-quvvatlash va psixolog uchun yordamchi vosita. " +
  "Javoblarni o'zbek tilida (lotin yozuvida) ber. Foydalanuvchi so'ragan formatga qat'iy amal qil. Tashxis qo'yma va dori tavsiya qilma.";

// Matnli AI so'rovi: { input, tier } → Gemini → { text }. Kalit faqat serverda saqlanadi.
export const onRequestPost = handle(async ({ request, env }) => {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "gemini_not_configured");
  participantId(request);
  const body = await readJson(request, 300 * 1024);
  const messages = toMessages(body.input);
  await checkRateLimit(env, request);
  const res = await generate(env, {
    models: chatModels(env),
    system: SYSTEM,
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    maxTokens: body.tier === "quick" ? 1024 : 4096,
  });
  return json({ text: res.text, truncated: res.truncated, model: res.model, ms: res.ms, attempts: res.attempts });
});

// Matn yoki suhbat navbatlarini umumiy formatga keltiradi; ketma-ket bir xil roldagi xabarlar birlashtiriladi
function toMessages(input) {
  const list = typeof input === "string" ? [{ role: "user", content: input }] : input;
  if (!Array.isArray(list) || !list.length) throw new HttpError(400, "bad_input");
  const out = [];
  let total = 0;
  for (const m of list) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") throw new HttpError(400, "bad_input");
    total += m.content.length;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += "\n\n" + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  if (total > MAX_CHARS) throw new HttpError(413, "too_large");
  if (out[0].role !== "user" || out[out.length - 1].role !== "user") throw new HttpError(400, "bad_input");
  return out;
}
