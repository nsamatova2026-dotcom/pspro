// Pages Functions uchun umumiy yordamchi funksiyalar

export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Har bir handler xatolarini bir xil JSON ko'rinishida qaytaradi
export const handle = (fn) => async (ctx) => {
  try {
    return await fn(ctx);
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code }, e.status);
    console.error(e);
    return json({ error: "server_error" }, 500);
  }
};

const PID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Talaba brauzerida yaratilgan tasodifiy UUID — anonim identifikator
export function participantId(request) {
  const id = request.headers.get("x-participant-id") || "";
  if (!PID_RE.test(id)) throw new HttpError(400, "bad_participant_id");
  return id;
}

const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));

export async function isPsychologist(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!env.PSY_TOKEN || !token) return false;
  const [a, b] = await Promise.all([sha256(token), sha256(env.PSY_TOKEN)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function requirePsychologist(request, env) {
  if (!(await isPsychologist(request, env))) throw new HttpError(401, "unauthorized");
}

// Jadvallar birinchi so'rovda avtomatik yaratiladi (schema.sql bilan bir xil)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS participants (id TEXT PRIMARY KEY, data TEXT NOT NULL, consent INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_participants_consent ON participants (consent, updated_at)`,
  `CREATE TABLE IF NOT EXISTS ai_usage (key TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (key, day))`,
  `CREATE TABLE IF NOT EXISTS studies (id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, status TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS instruments (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
];
let schemaReady = null;

export async function requireDb(env) {
  if (!env.DB) throw new HttpError(503, "db_not_configured");
  schemaReady ??= env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql))).catch((e) => {
    schemaReady = null;
    throw e;
  });
  await schemaReady;
  return env.DB;
}

export async function readJson(request, maxBytes) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_json");
  }
}

export async function loadParticipant(db, id) {
  const row = await db.prepare("SELECT data FROM participants WHERE id = ?1").bind(id).first();
  return row ? JSON.parse(row.data) : null;
}

// Respondent umumiy rozilik bergan yoki biror tadqiqotga qo'shilgan bo'lsa, psixolog/tadqiqotchi uni ko'radi
const visibleToResearcher = (data) => !!data.consent || Object.keys(data.studies || {}).length > 0;

export async function saveParticipant(db, id, data) {
  await db
    .prepare(
      `INSERT INTO participants (id, data, consent, updated_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, consent = excluded.consent, updated_at = excluded.updated_at`,
    )
    .bind(id, JSON.stringify(data), visibleToResearcher(data) ? 1 : 0, Date.now())
    .run();
}

const STUDY_ID_RE = /^[a-z0-9-]{4,40}$/;
const STUDY_CODE_RE = /^[A-Z0-9]{4,12}$/;

export function studyId(params) {
  if (!STUDY_ID_RE.test(params.id || "")) throw new HttpError(400, "bad_study_id");
  return params.id;
}

export async function loadStudy(db, id) {
  const row = await db.prepare("SELECT data FROM studies WHERE id = ?1").bind(id).first();
  return row ? JSON.parse(row.data) : null;
}

export function validateStudy(body, id) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_body");
  if (!STUDY_CODE_RE.test(body.code || "")) throw new HttpError(400, "bad_study_code");
  if (!["draft", "active", "closed"].includes(body.status)) throw new HttpError(400, "bad_status");
  if (typeof body.title !== "string" || !body.title.trim()) throw new HttpError(400, "bad_title");
  return { ...body, id };
}

// AI provayderini tanlash: AI_PROVIDER aniq ko'rsatilgan bo'lsa shu, aks holda mavjud kalitga qarab.
// Workers AI (Cloudflare, bepul kunlik limit) va Gemini (Google, bepul tarif) — bepul variantlar.
export function pickProvider(env) {
  const ready = { anthropic: !!env.ANTHROPIC_API_KEY, gemini: !!env.GEMINI_API_KEY, "workers-ai": !!env.AI };
  const wanted = (env.AI_PROVIDER || "").trim().toLowerCase();
  if (wanted) return ready[wanted] ? wanted : null;
  return ["anthropic", "gemini", "workers-ai"].find((p) => ready[p]) || null;
}

// Muallif metodikalari (tadqiqotchi yaratgan so'rovnomalar)
const INSTRUMENT_ID_RE = /^c-[a-z0-9]{4,20}$/;
const isStr = (v, max) => typeof v === "string" && v.length <= max;

export function instrumentId(params) {
  if (!INSTRUMENT_ID_RE.test(params.id || "")) throw new HttpError(400, "bad_instrument_id");
  return params.id;
}

export function validateInstrument(b, id) {
  const bad = () => { throw new HttpError(400, "bad_instrument"); };
  if (!b || typeof b !== "object" || Array.isArray(b)) bad();
  if (!isStr(b.name, 40) || !b.name.trim() || !isStr(b.full || "", 200) || !isStr(b.lead || "", 1000)) bad();
  if (!Array.isArray(b.items) || b.items.length < 2 || b.items.length > 100 || !b.items.every((q) => isStr(q, 500) && q.trim())) bad();
  if (!Array.isArray(b.opts) || b.opts.length < 2 || b.opts.length > 11 || !b.opts.every((o) => isStr(o, 80) && o.trim())) bad();
  if (![0, 1].includes(b.start) || !["sum", "mean"].includes(b.scoring)) bad();
  if (b.reverse && (!Array.isArray(b.reverse) || !b.reverse.every((i) => Number.isInteger(i) && i >= 1 && i <= b.items.length))) bad();
  if (!Array.isArray(b.bands) || !b.bands.length || b.bands.length > 10) bad();
  return { ...b, id, custom: true };
}

// Kunlik AI limiti: har bir respondentga AI_DAILY_LIMIT, bitta IP manzilga AI_DAILY_LIMIT_IP so'rov
// (universitet tarmog'ida butun auditoriya bitta IP orqali chiqadi, shuning uchun IP limiti kattaroq)
export async function checkRateLimit(env, request, cost = 1) {
  if (!env.DB) return;
  const db = await requireDb(env);
  const day = new Date().toISOString().slice(0, 10);
  const keys = [
    ["p:" + (request.headers.get("x-participant-id") || "unknown"), Number(env.AI_DAILY_LIMIT || 60)],
    ["ip:" + (request.headers.get("cf-connecting-ip") || "unknown"), Number(env.AI_DAILY_LIMIT_IP || 1500)],
  ];
  const sql = `INSERT INTO ai_usage (key, day, n) VALUES (?1, ?2, ?3) ON CONFLICT(key, day) DO UPDATE SET n = n + ?3 RETURNING n`;
  // Ikkala hisoblagich bazaga bitta murojaat bilan yangilanadi
  const res = await db.batch(keys.map(([key]) => db.prepare(sql).bind(key, day, cost)));
  keys.forEach(([, limit], i) => { if ((res[i]?.results?.[0]?.n || 0) > limit) throw new HttpError(429, "daily_limit"); });
}

// Gemini API so'rovi: xatolarni platformaning umumiy kodlariga aylantiradi
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
export async function callGemini(env, model, body, notConfigured = "voice_not_configured") {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, notConfigured);
  const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (r.status === 429) throw new HttpError(429, "rate_limited");
  if (!r.ok) {
    const text = (await r.text()).slice(0, 800);
    console.error(`Gemini xatosi ${r.status} (${model}):`, text);
    // Kalit bilan bog'liq xatolar va so'rov parametri bilan bog'liq xatolar alohida ajratiladi
    if (r.status === 401 || r.status === 403 || /API key|API_KEY|PERMISSION_DENIED/i.test(text)) throw new HttpError(503, notConfigured);
    if (r.status === 404 || /not found|is not supported for generateContent/i.test(text)) throw new HttpError(502, "model_not_found");
    if (r.status === 400) throw new HttpError(400, "bad_request");
    throw new HttpError(502, "ai_unavailable");
  }
  const data = await r.json();
  const cand = data.candidates?.[0];
  if (!cand) throw new HttpError(data.promptFeedback?.blockReason ? 422 : 502, data.promptFeedback?.blockReason ? "refused" : "ai_unavailable");
  if (cand.finishReason === "SAFETY") throw new HttpError(422, "refused");
  return cand;
}

// Kalit uchun mavjud Gemini modellari (1 soat keshlanadi)
const geminiState = { models: null, at: 0, resolved: {} };
export async function listGeminiModels(env) {
  if (geminiState.models && Date.now() - geminiState.at < 3600e3) return geminiState.models;
  const out = [];
  let page = "";
  for (let i = 0; i < 5; i++) {
    const r = await fetch(`${GEMINI_BASE}/models?pageSize=1000${page ? "&pageToken=" + encodeURIComponent(page) : ""}`, { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
    if (!r.ok) { console.error("Gemini modellar ro'yxati xatosi", r.status, (await r.text()).slice(0, 300)); break; }
    const d = await r.json();
    (d.models || []).forEach((m) => out.push({ name: String(m.name || "").replace(/^models\//, ""), methods: m.supportedGenerationMethods || [] }));
    if (!d.nextPageToken) break;
    page = d.nextPageToken;
  }
  if (out.length) { geminiState.models = out; geminiState.at = Date.now(); }
  return out;
}

// Ro'yxatdan mos modelni tanlash: yangi versiya, «flash» oilasi (bepul tarifda qulay), barqaror (preview emas)
export function pickGeminiModels(models, kind) {
  const ok = models.filter((m) => m.methods.includes("generateContent") && /^gemini-/.test(m.name));
  const isTts = (n) => /tts/.test(n);
  let list = kind === "tts"
    ? ok.filter((m) => isTts(m.name))
    : ok.filter((m) => !isTts(m.name) && /flash/.test(m.name) && !/image|live|embed|native-audio|computer|robotics|lite/.test(m.name));
  if (!list.length && kind !== "tts") list = ok.filter((m) => !isTts(m.name) && !/image|live|embed|native-audio|computer|robotics/.test(m.name));
  const version = (n) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || "0");
  const unstable = (n) => (/preview|exp/.test(n) ? 1 : 0);
  return list
    .map((m) => m.name)
    .sort((a, b) => (/-latest$/.test(b) - /-latest$/.test(a)) || version(b) - version(a) || (/flash/.test(b) - /flash/.test(a)) || unstable(a) - unstable(b) || a.length - b.length);
}

// «O'ylash» sozlamasi: 2.5 flash'da o'chiriladi, yangi modellarda minimal darajaga tushiriladi (javob ancha tezlashadi).
// plain=true bo'lsa yuborilmaydi (model bu parametrni qabul qilmasa, qayta urinish uchun).
export function thinkingFor(model, plain) {
  if (plain) return {};
  if (/2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  if (/2\.5|2\.0|1\.5/.test(model)) return {};
  return { thinkingConfig: { thinkingLevel: /flash/.test(model) ? "minimal" : "low" } };
}

const MODEL_KEYS = { chat: "gemini_chat", voice: "gemini_voice", tts: "gemini_tts" };
async function loadResolved(env) {
  if (geminiState.loaded || !env.DB) return;
  geminiState.loaded = true;
  try {
    const db = await requireDb(env);
    const { results } = await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'gemini_%'").all();
    for (const [kind, key] of Object.entries(MODEL_KEYS)) {
      const row = results.find((r) => r.key === key);
      if (row && !geminiState.resolved[kind]) geminiState.resolved[kind] = row.value;
    }
  } catch (e) { console.error("Saqlangan modellarni o'qib bo'lmadi:", e?.message || e); }
}
async function saveResolved(env, kind, model) {
  if (geminiState.resolved[kind] === model) return;
  geminiState.resolved[kind] = model;
  if (!env.DB) return;
  try {
    const db = await requireDb(env);
    await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(MODEL_KEYS[kind], model, Date.now()).run();
  } catch (e) { console.error("Modelni saqlab bo'lmadi:", e?.message || e); }
}

// Gemini'ga so'rov: sozlamadagi model topilmasa, mavjud modellardan mosini avtomatik tanlaydi va bazada eslab qoladi.
// tune(model, plain) — model nomiga qarab so'rov tanasini tayyorlaydi.
export async function geminiGenerate(env, kind, tune, notConfigured = "voice_not_configured") {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, notConfigured);
  await loadResolved(env);
  const configured = kind === "tts" ? env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts"
    : kind === "voice" ? env.GEMINI_VOICE_MODEL || env.GEMINI_MODEL || "gemini-flash-latest"
    : env.GEMINI_MODEL || "gemini-flash-latest";
  const tried = new Set();
  let lastErr = null;
  const attempt = async (model) => {
    if (!model || tried.has(model)) return null;
    tried.add(model);
    for (const plain of [false, true]) {
      try {
        const cand = await callGemini(env, model, tune(model, plain), notConfigured);
        await saveResolved(env, kind, model);
        return { cand, model };
      } catch (e) {
        if (!(e instanceof HttpError)) throw e;
        if (e.code === "bad_request" && !plain) continue; // parametrsiz qayta urinish
        if (e.code === "model_not_found" || e.code === "bad_request") { lastErr = e; return null; }
        throw e;
      }
    }
    return null;
  };
  for (const m of [geminiState.resolved[kind], configured, kind === "tts" ? null : "gemini-flash-latest"]) {
    const res = await attempt(m);
    if (res) return res;
  }
  let models = [];
  try { models = await listGeminiModels(env); } catch (e) { console.error("Gemini modellar ro'yxatini olib bo'lmadi:", e?.message || e); }
  for (const m of pickGeminiModels(models, kind === "tts" ? "tts" : "chat").slice(0, 4)) {
    const res = await attempt(m);
    if (res) return res;
  }
  throw lastErr || new HttpError(502, "model_not_found");
}

// Matnni Gemini ovozida o'qish: base64 PCM va uning formati
export async function synthesize(env, text) {
  const { cand } = await geminiGenerate(env, "tts", () => ({
    contents: [{ parts: [{ text: `O'zbek tilida iliq va xotirjam ohangda o'qing: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.GEMINI_TTS_VOICE || "Kore" } } },
    },
  }));
  const part = (cand.content?.parts || []).find((p) => p.inlineData?.data);
  if (!part) throw new HttpError(502, "ai_unavailable");
  return { audio: part.inlineData.data, mime: part.inlineData.mimeType || "audio/L16;rate=24000" };
}
export const geminiResolved = () => ({ ...geminiState.resolved });
