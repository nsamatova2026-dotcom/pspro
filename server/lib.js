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
  for (const [key, limit] of keys) {
    const row = await db
      .prepare(`INSERT INTO ai_usage (key, day, n) VALUES (?1, ?2, ?3) ON CONFLICT(key, day) DO UPDATE SET n = n + ?3 RETURNING n`)
      .bind(key, day, cost)
      .first();
    if (row && row.n > limit) throw new HttpError(429, "daily_limit");
  }
}

// Gemini API so'rovi: xatolarni platformaning umumiy kodlariga aylantiradi
export async function callGemini(env, model, body) {
  if (!env.GEMINI_API_KEY) throw new HttpError(503, "voice_not_configured");
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (r.status === 429) throw new HttpError(429, "rate_limited");
  if (!r.ok) {
    console.error(`Gemini xatosi ${r.status} (${model}):`, (await r.text()).slice(0, 500));
    if (r.status === 400 || r.status === 401 || r.status === 403) throw new HttpError(503, "voice_not_configured");
    if (r.status === 404) throw new HttpError(502, "model_not_found");
    throw new HttpError(502, "ai_unavailable");
  }
  const data = await r.json();
  const cand = data.candidates?.[0];
  if (!cand) throw new HttpError(data.promptFeedback?.blockReason ? 422 : 502, data.promptFeedback?.blockReason ? "refused" : "ai_unavailable");
  if (cand.finishReason === "SAFETY") throw new HttpError(422, "refused");
  return cand;
}
