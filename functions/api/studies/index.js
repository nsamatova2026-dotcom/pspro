import { handle, json, requireDb, requirePsychologist } from "../../../server/lib.js";

// Tadqiqotchi uchun barcha tadqiqotlar ro'yxati
export const onRequestGet = handle(async ({ request, env }) => {
  await requirePsychologist(request, env);
  const db = await requireDb(env);
  const { results } = await db.prepare("SELECT id, data FROM studies ORDER BY updated_at DESC").all();
  return json({ items: results.map((r) => ({ id: r.id, data: JSON.parse(r.data) })) });
});
