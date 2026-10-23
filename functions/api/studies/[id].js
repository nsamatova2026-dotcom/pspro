import { HttpError, handle, isPsychologist, json, loadStudy, readJson, requireDb, requirePsychologist, studyId, validateStudy } from "../../../server/lib.js";

// Respondent qo'shilgan tadqiqotni o'qiydi (qoralamalarni faqat tadqiqotchi ko'radi)
export const onRequestGet = handle(async ({ request, env, params }) => {
  const id = studyId(params);
  const study = await loadStudy(await requireDb(env), id);
  if (study && study.status === "draft" && !(await isPsychologist(request, env))) return json({ data: null });
  return json({ data: study });
});

export const onRequestPut = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  const id = studyId(params);
  const study = validateStudy(await readJson(request, 128 * 1024), id);
  const db = await requireDb(env);
  const clash = await db.prepare("SELECT id FROM studies WHERE code = ?1 AND id != ?2").bind(study.code, id).first();
  if (clash) throw new HttpError(409, "code_taken");
  await db
    .prepare(
      `INSERT INTO studies (id, code, status, data, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(id) DO UPDATE SET code = excluded.code, status = excluded.status, data = excluded.data, updated_at = excluded.updated_at`,
    )
    .bind(id, study.code, study.status, JSON.stringify(study), Date.now())
    .run();
  return json({ ok: true });
});

export const onRequestDelete = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  const db = await requireDb(env);
  await db.prepare("DELETE FROM studies WHERE id = ?1").bind(studyId(params)).run();
  return json({ ok: true });
});
