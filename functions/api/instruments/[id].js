import { handle, instrumentId, json, readJson, requireDb, requirePsychologist, validateInstrument } from "../../../server/lib.js";

export const onRequestGet = handle(async ({ env, params }) => {
  const db = await requireDb(env);
  const row = await db.prepare("SELECT data FROM instruments WHERE id = ?1").bind(instrumentId(params)).first();
  return json({ data: row ? JSON.parse(row.data) : null });
});

export const onRequestPut = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  const id = instrumentId(params);
  const def = validateInstrument(await readJson(request, 64 * 1024), id);
  const db = await requireDb(env);
  await db
    .prepare(
      `INSERT INTO instruments (id, data, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
    .bind(id, JSON.stringify(def), Date.now())
    .run();
  return json({ ok: true });
});

export const onRequestDelete = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  const db = await requireDb(env);
  await db.prepare("DELETE FROM instruments WHERE id = ?1").bind(instrumentId(params)).run();
  return json({ ok: true });
});
