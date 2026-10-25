import { handle, isPsychologist, json, participantId, pickProvider, requireDb } from "../../server/lib.js";

// AI limitlari: respondent o'z kunlik so'rovlarini ko'radi; tadqiqotchi barcha xizmatlar bo'yicha batafsil hisobni ko'radi
export const onRequestGet = handle(async ({ request, env }) => {
  const pid = participantId(request);
  const db = await requireDb(env);
  const now = Date.now(), dayIso = new Date(now).toISOString().slice(0, 10);
  const limits = { perUser: Number(env.AI_DAILY_LIMIT || 60), perIp: Number(env.AI_DAILY_LIMIT_IP || 1500) };
  const mine = await db.prepare("SELECT n FROM ai_usage WHERE key = ?1 AND day = ?2").bind("p:" + pid, dayIso).first();
  const hits = (await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'limit:%'").all()).results
    .map((r) => { try { return { service: r.key.slice(6), ...JSON.parse(r.value) }; } catch { return null; } })
    .filter(Boolean);
  // Hozir faol cheklov: kutish vaqti hali o'tmagan yoki bugungi kunlik limit tugagan
  const active = hits
    .map((h) => {
      const daily = /day|kunlik/i.test(h.quotaId || "");
      const until = h.retrySec ? h.at + h.retrySec * 1000 : daily && new Date(h.at).toISOString().slice(0, 10) === dayIso ? null : 0;
      return until === 0 || (until && until < now) ? null : { service: h.service, daily, retryAfter: until ? Math.ceil((until - now) / 1000) : null };
    })
    .filter(Boolean);
  const out = {
    you: { used: mine?.n || 0, limit: limits.perUser },
    provider: pickProvider(env),
    voice: !!(env.GEMINI_API_KEY || env.AI),
    limited: active,
  };
  if (!(await isPsychologist(request, env))) return json(out);

  // Tadqiqotchi uchun: har bir xizmat/model bo'yicha bugungi va joriy daqiqadagi so'rovlar, tokenlar, Google bildirgan limitlar
  const minute = "m:" + new Date(now).toISOString().slice(0, 16), prevMinute = "m:" + new Date(now - 60e3).toISOString().slice(0, 16);
  const rows = (await db.prepare("SELECT key, bucket, n, tokens FROM api_usage WHERE bucket IN (?1, ?2, ?3)").bind("d:" + dayIso, minute, prevMinute).all()).results;
  const services = {};
  for (const r of rows) {
    const s = (services[r.key] ??= { service: r.key, today: 0, tokensToday: 0, lastMinute: 0 });
    if (r.bucket.startsWith("d:")) { s.today = r.n; s.tokensToday = r.tokens; }
    else if (r.bucket === minute) s.lastMinute += r.n;
  }
  for (const h of hits) {
    const s = (services[h.service] ??= { service: h.service, today: 0, tokensToday: 0, lastMinute: 0 });
    s.lastLimitHit = h;
  }
  const users = (await db.prepare("SELECT key, n FROM ai_usage WHERE day = ?1").bind(dayIso).all()).results;
  const respondents = users.filter((u) => u.key.startsWith("p:"));
  const ips = users.filter((u) => u.key.startsWith("ip:"));
  return json({
    ...out,
    limits,
    services: Object.values(services).sort((a, b) => b.today - a.today),
    platform: {
      requestsToday: respondents.reduce((n, u) => n + u.n, 0),
      activeRespondents: respondents.length,
      maxPerRespondent: Math.max(0, ...respondents.map((u) => u.n)),
      atLimit: respondents.filter((u) => u.n >= limits.perUser).length,
      maxPerIp: Math.max(0, ...ips.map((u) => u.n)),
    },
  });
});
