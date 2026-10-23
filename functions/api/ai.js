import Anthropic from "@anthropic-ai/sdk";
import { HttpError, handle, json, participantId, pickProvider, readJson, requireDb } from "../../server/lib.js";

const MAX_CHARS = 60000;
const MAX_OUTPUT = 4096;
const SYSTEM =
  "Sen RuhAI platformasining bir qismisan: o'zbekistonlik talabalar uchun psixologik qo'llab-quvvatlash va psixolog uchun yordamchi vosita. " +
  "Javoblarni o'zbek tilida (lotin yozuvida) ber. Foydalanuvchi so'ragan formatga qat'iy amal qil. Tashxis qo'yma va dori tavsiya qilma.";

// Sahifa yuboradigan { input, tier } so'rovini tanlangan AI provayderiga uzatadi; kalitlar faqat serverda saqlanadi
export const onRequestPost = handle(async ({ request, env }) => {
  const provider = pickProvider(env);
  if (!provider) throw new HttpError(503, "ai_not_configured");
  participantId(request);
  const body = await readJson(request, 300 * 1024);
  const messages = toMessages(body.input);
  await rateLimit(env, request);
  const { text, truncated } = await PROVIDERS[provider](env, messages, body.tier);
  return json({ text, truncated, provider });
});

const PROVIDERS = {
  // Cloudflare Workers AI: wrangler.toml dagi [ai] bog'lanishi orqali, kalitsiz, kunlik bepul limit bilan
  async "workers-ai"(env, messages) {
    let out;
    try {
      out = await env.AI.run(env.WORKERS_AI_MODEL || "@cf/google/gemma-3-12b-it", {
        messages: [{ role: "system", content: SYSTEM }, ...messages],
        max_tokens: MAX_OUTPUT,
      });
    } catch (e) {
      console.error("Workers AI xatosi:", e?.message || e);
      if (/limit|quota|allocation|exceeded/i.test(String(e?.message))) throw new HttpError(429, "daily_limit");
      throw new HttpError(502, "ai_unavailable");
    }
    const text = typeof out?.response === "string" ? out.response : "";
    if (!text) throw new HttpError(502, "ai_unavailable");
    return { text, truncated: false };
  },

  // Google Gemini API: GEMINI_API_KEY (Google AI Studio'da bepul olinadi)
  async gemini(env, messages) {
    const model = env.GEMINI_MODEL || "gemini-2.5-flash";
    const generationConfig = { maxOutputTokens: MAX_OUTPUT };
    // Flash modellarida «o'ylash» bosqichini o'chiramiz: bepul limit tejaladi va javob tezroq keladi
    if (model.includes("flash")) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig,
      }),
    });
    if (r.status === 429) throw new HttpError(429, "rate_limited");
    if (!r.ok) {
      console.error(`Gemini xatosi ${r.status}:`, (await r.text()).slice(0, 500));
      if (r.status === 400 || r.status === 401 || r.status === 403) throw new HttpError(503, "ai_not_configured");
      throw new HttpError(502, "ai_unavailable");
    }
    const data = await r.json();
    const cand = data.candidates?.[0];
    if (!cand) throw new HttpError(data.promptFeedback?.blockReason ? 422 : 502, data.promptFeedback?.blockReason ? "refused" : "ai_unavailable");
    if (cand.finishReason === "SAFETY") throw new HttpError(422, "refused");
    const text = (cand.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new HttpError(502, "ai_unavailable");
    return { text, truncated: cand.finishReason === "MAX_TOKENS" };
  },

  // Anthropic Claude API (pullik): ANTHROPIC_API_KEY
  async anthropic(env, messages, tier) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let response;
    try {
      response = await client.beta.messages.create({
        model: env.ANTHROPIC_MODEL || "claude-opus-5-5",
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: tier === "quick" ? "low" : "medium" },
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
    return { text, truncated: response.stop_reason === "max_tokens" };
  },
};

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

// IP manzil bo'yicha kunlik limit: bepul kvotani bir kishi tugatib qo'ymasligi uchun
async function rateLimit(env, request) {
  if (!env.DB) return;
  await requireDb(env);
  const limit = Number(env.AI_DAILY_LIMIT || 100);
  const key = request.headers.get("cf-connecting-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    `INSERT INTO ai_usage (key, day, n) VALUES (?1, ?2, 1)
     ON CONFLICT(key, day) DO UPDATE SET n = n + 1 RETURNING n`,
  ).bind(key, day).first();
  if (row && row.n > limit) throw new HttpError(429, "daily_limit");
}
