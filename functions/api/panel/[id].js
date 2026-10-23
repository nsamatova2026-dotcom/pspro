import { HttpError, handle, json, loadParticipant, readJson, requireDb, requirePsychologist, saveParticipant } from "../../../server/lib.js";

export const onRequestGet = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  return json({ data: await loadParticipant(requireDb(env), params.id) });
});

// Psixolog faqat «ko'rib chiqildi» vaqtini o'zgartira oladi
export const onRequestPatch = handle(async ({ request, env, params }) => {
  await requirePsychologist(request, env);
  const db = requireDb(env);
  const body = await readJson(request, 1024);
  if (typeof body?.reviewedAt !== "number") throw new HttpError(400, "bad_body");
  const data = await loadParticipant(db, params.id);
  if (!data) throw new HttpError(404, "not_found");
  data.reviewedAt = body.reviewedAt;
  await saveParticipant(db, params.id, data);
  return json({ ok: true });
});
