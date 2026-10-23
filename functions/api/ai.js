import Anthropic from "@anthropic-ai/sdk";
import { HttpError, handle, json, participantId, readJson } from "../../server/lib.js";

const MAX_CHARS = 60000;
const SYSTEM =
  "Sen RuhAI platformasining bir qismisan: o'zbekistonlik talabalar uchun psixologik qo'llab-quvvatlash va psixolog uchun yordamchi vosita. " +
  "Foydalanuvchi so'ragan formatga qat'iy amal qil. Tashxis qo'yma va dori tavsiya qilma.";

// Sahifa yuboradigan { input, tier } so'rovini Claude'ga uzatadi; API kaliti faqat serverda saqlanadi
export const onRequestPost = handle(async ({ request, env }) => {
  if (!env.ANTHROPIC_API_KEY) throw new HttpError(503, "ai_not_configured");
  participantId(request);
  const body = await readJson(request, 300 * 1024);
  const messages = toMessages(body.input);
  await rateLimit(env, request);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await client.beta.messages.create({
      model: env.AI_MODEL || "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: body.tier === "quick" ? "low" : "medium" },
      system: SYSTEM,
      messages,
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new HttpError(429, "rate_limited");
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY noto'g'ri yoki bekor qilingan");
      throw new HttpError(503, "ai_not_configured");
    }
    if (e instanceof Anthropic.BadRequestError) {
      console.error("Claude API so'rovni rad etdi:", e.message);
      throw new HttpError(400, "bad_request");
    }
    if (e instanceof Anthropic.APIError) {
      console.error(`Claude API xatosi ${e.status}:`, e.message);
      throw new HttpError(502, "ai_unavailable");
    }
    throw e;
  }

  if (response.stop_reason === "refusal") throw new HttpError(422, "refused");
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return json({ text, truncated: response.stop_reason === "max_tokens" });
});

// Matn yoki suhbat navbatlarini Messages API formatiga keltiradi; ketma-ket bir xil roldagi xabarlar birlashtiriladi
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

// IP manzil bo'yicha kunlik limit: API xarajatini nazorat qilish uchun
async function rateLimit(env, request) {
  if (!env.DB) return;
  const limit = Number(env.AI_DAILY_LIMIT || 100);
  const key = request.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    `INSERT INTO ai_usage (key, day, n) VALUES (?1, ?2, 1)
     ON CONFLICT(key, day) DO UPDATE SET n = n + 1 RETURNING n`,
  ).bind(key, day).first();
  if (row && row.n > limit) throw new HttpError(429, "daily_limit");
}
