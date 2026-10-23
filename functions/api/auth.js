import { handle, json, requirePsychologist } from "../../server/lib.js";

export const onRequestPost = handle(async ({ request, env }) => {
  await requirePsychologist(request, env);
  return json({ ok: true });
});
