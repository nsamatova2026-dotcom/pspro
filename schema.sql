-- RuhAI ma'lumotlar bazasi (Cloudflare D1)

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,              -- talaba brauzerida yaratilgan anonim UUID
  data TEXT NOT NULL,               -- natijalar, kundalik ko'rsatkichlari, kunlik holat (JSON)
  consent INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_participants_consent ON participants (consent, updated_at);

CREATE TABLE IF NOT EXISTS ai_usage (
  key TEXT NOT NULL,                -- IP manzil
  day TEXT NOT NULL,                -- YYYY-MM-DD
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, day)
);

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,        -- respondentlar qo'shilish uchun kiritadigan kod
  status TEXT NOT NULL,             -- draft | active | closed
  data TEXT NOT NULL,               -- instrumentlar, to'lqinlar, guruhlar, treyninglar (JSON)
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS instruments (
  id TEXT PRIMARY KEY,              -- tadqiqotchi yaratgan metodika (c-...)
  data TEXT NOT NULL,               -- savollar, javob shkalasi, hisoblash qoidasi (JSON)
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,             -- masalan, avtomatik topilgan Gemini modeli
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
