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
