import { HttpError, handle, json, loadParticipant, participantId, readJson, requireDb, saveParticipant } from "../../server/lib.js";

// Talabaning o'z hujjati: faqat o'z anonim identifikatori bilan o'qiydi va yozadi
export const onRequestGet = handle(async ({ request, env }) => {
  const id = participantId(request);
  return json({ data: await loadParticipant(await requireDb(env), id) });
});

export const onRequestPut = handle(async ({ request, env }) => {
  const id = participantId(request);
  const db = await requireDb(env);
  const body = await readJson(request, 256 * 1024);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "bad_body");
  // «Ko'rib chiqildi» belgisini faqat psixolog qo'yadi — talaba yozuvi uni o'zgartirmaydi
  const prev = await loadParticipant(db, id);
  delete body.reviewedAt;
  if (prev?.reviewedAt) body.reviewedAt = prev.reviewedAt;
  await saveParticipant(db, id, body);
  return json({ ok: true });
});
