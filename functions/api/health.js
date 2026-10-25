import { json, providerOrder } from "../../server/lib.js";

// Sahifa server mavjudligini va qaysi imkoniyatlar sozlanganini shu yerdan bilib oladi
export const onRequestGet = ({ env }) => {
  const provider = providerOrder(env)[0] || null;
  return json({ ok: true, ai: !!provider, provider, voice: !!(env.GEMINI_API_KEY || env.AI), db: !!env.DB, psychologist: !!env.PSY_TOKEN });
};
