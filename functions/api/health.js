import { json, pickProvider } from "../../server/lib.js";

// Sahifa server mavjudligini va qaysi imkoniyatlar sozlanganini shu yerdan bilib oladi
export const onRequestGet = ({ env }) => {
  const provider = pickProvider(env);
  return json({ ok: true, ai: !!provider, provider, db: !!env.DB, psychologist: !!env.PSY_TOKEN });
};
