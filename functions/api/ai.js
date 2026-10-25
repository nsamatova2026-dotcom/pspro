import Anthropic from "@anthropic-ai/sdk";
import { HttpError, checkRateLimit, geminiGenerate, handle, thinkingFor, json, participantId, providerOrder, readJson, recordApiUsage, withTimeout } from "../../server/lib.js";

const MAX_CHARS = 60000;
const MAX_OUTPUT = 4096;
const SYSTEM =
  "Sen RuhAI platformasining bir qismisan: o'zbekistonlik talabalar uchun psixologik qo'llab-quvvatlash va psixolog uchun yordamchi vosita. " +
  "Javoblarni o'zbek tilida (lotin yozuvida) ber. Foydalanuvchi so'ragan formatga qat'iy amal qil. Tashxis qo'yma va dori tavsiya qilma.";

// Sahifa yuboradigan { input, tier } so'rovini AI provayderiga uzatadi; kalitlar faqat serverda saqlanadi
export const onRequestPost = handle(async ({ request, env }) => {
  if (!providerOrder(env).length) throw new HttpError(503, "ai_not_configured");
  participantId(request);
  const body = await readJson(request, 300 * 1024);
  const messages = toMessages(body.input);
  await checkRateLimit(env, request);
  const { text, truncated, provider, tried } = await runTextChain(env, messages, { tier: body.tier });
  return json({ text, truncated, provider, tried });
});

// Zaxira zanjiri: sozlamadagi provayder xato bersa, mavjud boshqa provayder sinaladi (Gemini ↔ Workers AI).
// Platformaning o'z limiti (daily_limit) va xavfsizlik rad etishi (refused) zanjirni to'xtatadi.
const FALLBACK_CODES = new Set(["ai_unavailable", "timeout", "model_not_found", "network", "bad_request", "rate_limited", "ai_not_configured", "voice_not_configured", "provider_limit", "bad_json"]);
export async function runTextChain(env, messages, { tier, system = SYSTEM, maxOutput = MAX_OUTPUT } = {}) {
  const order = providerOrder(env), tried = [];
  if (!order.length) throw new HttpError(503, "ai_not_configured");
  let lastErr = null;
  for (const provider of order) {
    const t = Date.now();
    try {
      const res = await PROVIDERS[provider](env, messages, tier, system, maxOutput);
      tried.push({ provider, model: res.model, result: "ok", ms: Date.now() - t });
      return { ...res, provider, tried };
    } catch (e) {
      const err = e instanceof HttpError ? e : new HttpError(502, "ai_unavailable", { detail: String(e?.message || e).slice(0, 200) });
      tried.push({ provider, result: err.code, ms: Date.now() - t, ...(err.extra?.detail ? { detail: err.extra.detail } : {}) });
      lastErr = err;
      if (!FALLBACK_CODES.has(err.code)) break;
    }
  }
  lastErr.extra = { ...(lastErr.extra || {}), tried };
  throw lastErr;
}

// Workers AI javobi modelga qarab turli ko'rinishda keladi
const workersText = (out) => typeof out === "string" ? out
  : typeof out?.response === "string" ? out.response
  : out?.result?.response || out?.choices?.[0]?.message?.content || "";

const PROVIDERS = {
  // Cloudflare Workers AI: wrangler.toml dagi [ai] bog'lanishi orqali, kalitsiz, kunlik bepul limit bilan
  async "workers-ai"(env, messages, tier, system = SYSTEM, maxOutput = MAX_OUTPUT) {
    const model = env.WORKERS_AI_MODEL || "@cf/google/gemma-3-12b-it";
    let out;
    try {
      out = await withTimeout(env.AI.run(model, {
        messages: [{ role: "system", content: system }, ...messages],
        max_tokens: maxOutput,
      }), Number(env.GEMINI_TIMEOUT_MS || 25000));
    } catch (e) {
      if (e instanceof HttpError) throw e;
      console.error("Workers AI xatosi:", e?.message || e);
      if (/limit|quota|allocation|exceeded/i.test(String(e?.message))) {
        await recordApiUsage(env, "workers-ai:" + model, 0, { quotaId: "Workers AI kunlik bepul limiti", limit: null, retrySec: null, message: String(e?.message || "").slice(0, 300), model, at: Date.now() });
        throw new HttpError(429, "provider_limit", { detail: "Workers AI kunlik bepul limiti tugagan" });
      }
      throw new HttpError(502, "ai_unavailable", { detail: "Workers AI: " + String(e?.message || e).slice(0, 200) });
    }
    await recordApiUsage(env, "workers-ai:" + model, out?.usage?.total_tokens || 0);
    const text = workersText(out);
    if (!text) throw new HttpError(502, "ai_unavailable", { detail: "Workers AI bo'sh javob qaytardi" });
    return { text, truncated: false, model };
  },

  // Google Gemini API: GEMINI_API_KEY; model topilmasa yoki sekin bo'lsa avtomatik boshqasi tanlanadi
  async gemini(env, messages, tier, system = SYSTEM, maxOutput = MAX_OUTPUT) {
    const { cand, model } = await geminiGenerate(env, "chat", (model, variant) => ({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: maxOutput, ...thinkingFor(model, variant) },
    }), "ai_not_configured", { budgetMs: env.AI ? 30000 : 70000 }); // zaxira bo'lsa, Gemini'ni uzoq kutmaymiz
    const text = (cand.content?.parts || []).map((p) => p.text || "").join("");
    if (!text) throw new HttpError(502, "ai_unavailable", { detail: "Gemini bo'sh javob qaytardi" });
    return { text, truncated: cand.finishReason === "MAX_TOKENS", model };
  },

  // Anthropic Claude API (pullik): ANTHROPIC_API_KEY
  async anthropic(env, messages, tier, system = SYSTEM) {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    let response;
    try {
      response = await client.beta.messages.create({
        model: env.ANTHROPIC_MODEL || "claude-opus-5-5",
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: tier === "quick" ? "low" : "medium" },
        system,
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
