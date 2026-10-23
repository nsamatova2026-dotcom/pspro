import { json } from "../../server/lib.js";

// Sahifa server mavjudligini va qaysi imkoniyatlar sozlanganini shu yerdan bilib oladi
export const onRequestGet = ({ env }) =>
  json({ ok: true, ai: !!env.ANTHROPIC_API_KEY, db: !!env.DB, psychologist: !!env.PSY_TOKEN });
