// Cloudflare Worker: /api/* so'rovlarini server funksiyalariga yo'naltiradi, qolganini public/ dagi statik fayllardan beradi
import * as ai from "../functions/api/ai.js";
import * as tts from "../functions/api/tts.js";
import * as voice from "../functions/api/voice.js";
import * as auth from "../functions/api/auth.js";
import * as health from "../functions/api/health.js";
import * as me from "../functions/api/me.js";
import * as panelIndex from "../functions/api/panel/index.js";
import * as panelItem from "../functions/api/panel/[id].js";
import * as studiesIndex from "../functions/api/studies/index.js";
import * as studyItem from "../functions/api/studies/[id].js";
import * as studyByCode from "../functions/api/studies/code/[code].js";
import * as studyAssign from "../functions/api/studies/[id]/assign.js";
import * as instrumentsIndex from "../functions/api/instruments/index.js";
import * as instrumentItem from "../functions/api/instruments/[id].js";
import { json } from "../server/lib.js";

const ROUTES = [
  [/^\/api\/health$/, health],
  [/^\/api\/me$/, me],
  [/^\/api\/auth$/, auth],
  [/^\/api\/ai$/, ai],
  [/^\/api\/voice$/, voice],
  [/^\/api\/tts$/, tts],
  [/^\/api\/panel$/, panelIndex],
  [/^\/api\/panel\/([^/]+)$/, panelItem, "id"],
  [/^\/api\/studies$/, studiesIndex],
  [/^\/api\/studies\/code\/([^/]+)$/, studyByCode, "code"],
  [/^\/api\/studies\/([^/]+)\/assign$/, studyAssign, "id"],
  [/^\/api\/studies\/([^/]+)$/, studyItem, "id"],
  [/^\/api\/instruments$/, instrumentsIndex],
  [/^\/api\/instruments\/([^/]+)$/, instrumentItem, "id"],
];

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    for (const [pattern, mod, param] of ROUTES) {
      const m = pathname.match(pattern);
      if (!m) continue;
      const method = request.method.charAt(0) + request.method.slice(1).toLowerCase();
      const handler = mod["onRequest" + method];
      if (!handler) return json({ error: "method_not_allowed" }, 405);
      const params = param ? { [param]: decodeURIComponent(m[1]) } : {};
      return handler({ request, env, params, waitUntil: ctx.waitUntil.bind(ctx) });
    }
    return json({ error: "not_found" }, 404);
  },
};
