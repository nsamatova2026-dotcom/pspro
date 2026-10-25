import { json } from "../../server/lib.js";

// Sahifa server mavjudligini va qaysi imkoniyatlar sozlanganini shu yerdan bilib oladi
export const onRequestGet = ({ env }) => {
  const ai = !!env.GEMINI_API_KEY;
  return json({ ok: true, ai, provider: ai ? "gemini" : null, voice: ai, db: !!env.DB, psychologist: !!env.PSY_TOKEN });
};
