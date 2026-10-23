import { handle, json, requireDb } from "../../../server/lib.js";

// Muallif metodikalari ro'yxati: respondentlar ham o'qiydi, chunki tadqiqot topshiriqlari shu ta'riflardan tuziladi
export const onRequestGet = handle(async ({ env }) => {
  const db = await requireDb(env);
  const { results } = await db.prepare("SELECT id, data FROM instruments ORDER BY updated_at DESC").all();
  return json({ items: results.map((r) => ({ id: r.id, data: JSON.parse(r.data) })) });
});
