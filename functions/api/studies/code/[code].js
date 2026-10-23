import { handle, json, requireDb } from "../../../../server/lib.js";

// Respondent kod orqali faol tadqiqotni topadi
export const onRequestGet = handle(async ({ env, params }) => {
  const code = String(params.code || "").toUpperCase();
  const row = await requireDb(env).prepare("SELECT data FROM studies WHERE code = ?1 AND status = 'active'").bind(code).first();
  return json({ data: row ? JSON.parse(row.data) : null });
});
