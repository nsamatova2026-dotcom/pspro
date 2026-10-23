import { handle, json, requireDb, requirePsychologist } from "../../../server/lib.js";

// Psixolog paneli: umumiy rozilik bergan yoki biror tadqiqotga qo'shilgan barcha respondentlar
export const onRequestGet = handle(async ({ request, env }) => {
  await requirePsychologist(request, env);
  const db = await requireDb(env);
  const { results } = await db
    .prepare("SELECT id, data FROM participants WHERE consent = 1 ORDER BY updated_at DESC LIMIT 1000")
    .all();
  return json({ items: results.map((r) => ({ id: r.id, data: JSON.parse(r.data) })) });
});
