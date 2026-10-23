import { HttpError, handle, json, loadStudy, participantId, requireDb, studyId } from "../../../../server/lib.js";

// Muvozanatlashtirilgan randomizatsiya: yangi respondent eng kam to'lgan guruhga, teng bo'lsa tasodifiy guruhga tushadi
export const onRequestPost = handle(async ({ request, env, params }) => {
  participantId(request);
  const id = studyId(params);
  const db = await requireDb(env);
  const study = await loadStudy(db, id);
  if (!study || study.status !== "active") throw new HttpError(404, "not_found");
  const arms = (study.arms || []).map((a) => a.id);
  if (!arms.length) return json({ arm: "A" });
  // id faqat [a-z0-9-] belgilaridan iborat (studyId tekshiradi), shuning uchun JSON yo'liga xavfsiz qo'yiladi
  const path = `$.studies."${id}".arm`;
  const { results } = await db
    .prepare("SELECT json_extract(data, ?1) AS arm, COUNT(*) AS n FROM participants WHERE json_extract(data, ?1) IS NOT NULL GROUP BY arm")
    .bind(path)
    .all();
  const counts = Object.fromEntries(arms.map((a) => [a, 0]));
  results.forEach((r) => { if (r.arm in counts) counts[r.arm] = r.n; });
  const min = Math.min(...Object.values(counts));
  const candidates = arms.filter((a) => counts[a] === min);
  return json({ arm: candidates[Math.floor(Math.random() * candidates.length)] });
});
