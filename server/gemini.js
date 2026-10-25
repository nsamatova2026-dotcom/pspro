// Google Gemini API bilan ishlash: platformadagi barcha AI funksiyalari (matnli suhbat, ovozli suhbat, ovoz) shu fayl orqali ishlaydi.
import { HttpError, requireDb } from "./lib.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
// Sozlamadagi model topilmasa yoki band bo'lsa, shu tartibda boshqasi sinaladi
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const TTS_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
// Bu kalitda topilmagan modellar 10 daqiqa davomida o'tkazib yuboriladi (kalit almashtirilsa, keyin qayta sinaladi)
const missingUntil = new Map();
const missing = { has: (m) => (missingUntil.get(m) || 0) > Date.now(), add: (m) => missingUntil.set(m, Date.now() + 10 * 60e3) };

const uniq = (list) => [...new Set(list.filter(Boolean))];
export const chatModels = (env) => uniq([env.GEMINI_MODEL, ...FALLBACK_MODELS]);
export const voiceModels = (env) => uniq([env.GEMINI_VOICE_MODEL, env.GEMINI_MODEL, ...FALLBACK_MODELS]);
export const ttsModels = (env) => uniq([env.GEMINI_TTS_MODEL, ...TTS_MODELS]);

// Google javobidagi xatoni platforma kodiga aylantirish; detail — Google xabarining o'zi (kalit qiymati unda bo'lmaydi)
function geminiError(status, text, model) {
  let err = {};
  try { err = JSON.parse(text).error || {}; } catch {}
  const msg = String(err.message || text || "").slice(0, 300);
  const detail = `${model}: ${status} ${err.status || ""} ${msg}`.replace(/\s+/g, " ").trim();
  if (/location is not supported|user location/i.test(msg)) return new HttpError(503, "gemini_location", { detail });
  if (status === 401 || status === 403 || /API key|API_KEY/i.test(msg)) return new HttpError(503, "gemini_key", { detail });
  if (status === 429) {
    const ri = (err.details || []).find((d) => String(d["@type"] || "").includes("RetryInfo"));
    const qv = (err.details || []).find((d) => String(d["@type"] || "").includes("QuotaFailure"))?.violations?.[0] || {};
    const retry = ri?.retryDelay ? Math.ceil(parseFloat(ri.retryDelay)) : null;
    const quota = { quotaId: qv.quotaId || qv.quotaMetric || null, limit: qv.quotaValue != null ? Number(qv.quotaValue) : null };
    return new HttpError(429, "gemini_quota", { detail, quota, ...(retry ? { retryAfter: retry } : {}) });
  }
  if (status === 404 || /not found|not supported for generateContent/i.test(msg)) return new HttpError(502, "model_not_found", { detail });
  if (status === 400) return new HttpError(400, "bad_request", { detail });
  return new HttpError(502, "gemini_unavailable", { detail });
}

// Bitta generateContent so'rovi
async function call(env, model, body, timeoutMs) {
  let r;
  try {
    r = await fetch(`${BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") throw new HttpError(504, "timeout", { detail: `${model}: ${Math.round(timeoutMs / 1000)} soniyada javob kelmadi` });
    throw new HttpError(502, "network", { detail: String(e?.message || e).slice(0, 200) });
  }
  if (!r.ok) {
    const text = await r.text();
    console.error(`Gemini xatosi ${r.status} (${model}):`, text.slice(0, 500));
    const e = geminiError(r.status, text, model);
    if (e.code === "gemini_quota") await recordUsage(env, model, 0, { ...e.extra.quota, retrySec: e.extra.retryAfter || null, message: e.extra.detail, model, at: Date.now() });
    throw e;
  }
  const data = await r.json();
  await recordUsage(env, model, data.usageMetadata?.totalTokenCount || 0);
  return data;
}

// Gemini'dan javob olish. Model topilmasa yoki vaqtincha band bo'lsa, ro'yxatdagi keyingisi sinaladi.
// «O'ylash» bosqichi tezlik uchun o'chiriladi; model buni qabul qilmasa, parametrsiz qayta yuboriladi.
// Natija: { text, model, ms, attempts }
export async function generate(env, { models, system, contents, maxTokens = 2048, schema = null, timeoutMs }) {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "gemini_not_configured");
  timeoutMs ??= Number(env.GEMINI_TIMEOUT_MS || 30000);
  const started = Date.now(), attempts = [];
  let last = null;
  const list = models.filter((m) => !missing.has(m));
  for (const model of list.length ? list : models) {
    for (const noThinking of [true, false]) {
      const generationConfig = {
        maxOutputTokens: maxTokens,
        ...(schema ? { responseMimeType: "application/json", responseSchema: schema } : {}),
        ...(noThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
      };
      const body = { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents, generationConfig };
      const t = Date.now();
      try {
        const data = await call(env, model, body, Math.max(5000, timeoutMs - (t - started)));
        const cand = data.candidates?.[0];
        if (!cand) throw new HttpError(422, "refused", { detail: `${model}: ${data.promptFeedback?.blockReason || "javob bo'sh"}` });
        if (cand.finishReason === "SAFETY") throw new HttpError(422, "refused", { detail: `${model}: SAFETY` });
        const text = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
        if (!text) throw new HttpError(502, "gemini_unavailable", { detail: `${model}: bo'sh javob (${cand.finishReason || "?"})` });
        attempts.push({ model, result: "ok", ms: Date.now() - t });
        return { text, model, truncated: cand.finishReason === "MAX_TOKENS", ms: Date.now() - started, attempts };
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        attempts.push({ model, result: e.code, ms: Date.now() - t, detail: e.extra?.detail });
        last = e;
        if (e.code === "bad_request" && noThinking) continue; // «o'ylash» parametrisiz qayta urinish
        if (e.code === "model_not_found") missing.add(model);
        break;
      }
    }
    // Kalit, joylashuv, limit va vaqt xatolarida boshqa modelni sinash foyda bermaydi
    if (!["model_not_found", "bad_request", "gemini_unavailable"].includes(last?.code) || Date.now() - started > timeoutMs) break;
  }
  last.extra = { ...(last.extra || {}), attempts };
  throw last;
}

// Matnni Gemini ovozida o'qish: base64 PCM va uning formati
export async function speak(env, text) {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "gemini_not_configured");
  let last = null;
  for (const model of ttsModels(env).filter((m) => !missing.has(m))) {
    try {
      const data = await call(env, model, {
        contents: [{ parts: [{ text: `O'zbek tilida iliq va xotirjam ohangda o'qing: ${text}` }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE || "Kore" } } },
        },
      }, Number(env.GEMINI_TTS_TIMEOUT_MS || 40000));
      const part = (data.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData?.data);
      if (!part) throw new HttpError(502, "gemini_unavailable", { detail: `${model}: ovoz qaytmadi` });
      return { audio: part.inlineData.data, mime: part.inlineData.mimeType || "audio/L16;rate=24000", model };
    } catch (e) {
      last = e;
      if (e?.code !== "model_not_found") throw e;
      missing.add(model);
    }
  }
  throw last || new HttpError(502, "model_not_found");
}

// Kalit uchun mavjud modellar ro'yxati (tekshiruv sahifasi uchun)
export async function listModels(env) {
  const r = await fetch(`${BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": env.GEMINI_API_KEY }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw geminiError(r.status, await r.text(), "models");
  const d = await r.json();
  return (d.models || []).filter((m) => (m.supportedGenerationMethods || []).includes("generateContent")).map((m) => String(m.name).replace(/^models\//, ""));
}

// Foydalanish hisobi: kunlik va daqiqalik so'rovlar, tokenlar; limit tugasa — oxirgi limit xabari.
// Google qolgan limitni oldindan bildirmaydi, shuning uchun so'rovlarni platformaning o'zi sanaydi.
async function recordUsage(env, model, tokens = 0, limitHit = null) {
  if (!env.DB) return;
  try {
    const db = await requireDb(env), key = "gemini:" + model;
    const now = new Date(), day = "d:" + now.toISOString().slice(0, 10), minute = "m:" + now.toISOString().slice(0, 16);
    const up = `INSERT INTO api_usage (key, bucket, n, tokens) VALUES (?1, ?2, 1, ?3) ON CONFLICT(key, bucket) DO UPDATE SET n = n + 1, tokens = tokens + ?3`;
    const stmts = [db.prepare(up).bind(key, day, tokens), db.prepare(up).bind(key, minute, tokens)];
    if (limitHit) {
      stmts.push(db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
        .bind("limit:" + key, JSON.stringify(limitHit), Date.now()));
    }
    if (Math.random() < 0.05) stmts.push(db.prepare("DELETE FROM api_usage WHERE bucket LIKE 'm:%' AND bucket < ?1").bind("m:" + new Date(Date.now() - 3600e3).toISOString().slice(0, 16)));
    await db.batch(stmts);
  } catch (e) { console.error("Foydalanish hisobini yozib bo'lmadi:", e?.message || e); }
}
