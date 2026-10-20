/**
 * Einstiegspunkt für Cloudflare Workers — moraro.world.
 * Abgeleitet vom Worker von klangerie-site (ohne Newsletter).
 *
 * Mit `run_worker_first: true` (wrangler.jsonc) sieht dieser Worker JEDE
 * Anfrage. Er hat genau zwei Aufgaben:
 *   1. Weiterleitungen aus public/_redirects (Kurzadressen)
 *   2. auf den kanonischen Namen führen: www.moraro.world → moraro.world
 * Alles Übrige geht über die ASSETS-Bindung an die Asset-Schicht.
 *
 * Warum der Worker und nicht eine Cloudflare-Regel im Dashboard: eine Stelle
 * entscheidet, und diese Stelle ist getestet (test/redirects.test.mjs).
 */
import regeln from "./redirects.generated.js";

const KANONISCH = "moraro.world";
const DOMAIN = "moraro.world";

/** Eine Regel anwenden: exakter Pfad oder abschliessendes `*` (→ :splat). */
function passt(regel, pfad) {
  const { von, nach } = regel;
  if (von.endsWith("*")) {
    const praefix = von.slice(0, -1);
    if (!pfad.startsWith(praefix)) return null;
    return nach.replace(":splat", pfad.slice(praefix.length));
  }
  return pfad === von ? nach : null;
}

/** Erste passende Regel gewinnt — wie bei Cloudflare selbst. */
function findeWeiterleitung(pfad) {
  for (const regel of regeln) {
    const ziel = passt(regel, pfad);
    if (ziel !== null) return { ziel, code: regel.code };
  }
  return null;
}

/** Formular „Melden“ (20.10.2026): an die Redaktion weiterreichen – intern, ohne Umweg übers Internet. */
async function melden(request, env) {
  if (request.method !== "POST") return Response.json({ fehler: "Nur POST." }, { status: 405 });
  if (!env.REDAKTION) return Response.json({ fehler: "Gerade klappt es nicht." }, { status: 503 });
  const body = await request.text();
  if (body.length > 20000) return Response.json({ fehler: "Zu viel Text." }, { status: 413 });
  try {
    const r = await env.REDAKTION.fetch("https://redaktion.intern/api/moraro/einreichung", {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        "Origin": "https://moraro.world",
        "X-Melder-IP": request.headers.get("CF-Connecting-IP") || ""
      }
    });
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  } catch (err) {
    console.error("melden", err);
    return Response.json({ fehler: "Gerade klappt es nicht. Bitte später noch einmal versuchen." }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/melden") return melden(request, env);

    const treffer = findeWeiterleitung(url.pathname);
    const ziel = treffer ? new URL(treffer.ziel, url) : new URL(url);

    const eigenerName = ziel.hostname === DOMAIN || ziel.hostname.endsWith("." + DOMAIN);
    const umziehen = eigenerName && ziel.hostname !== KANONISCH;
    if (umziehen) ziel.hostname = KANONISCH;

    if (treffer || umziehen) {
      return Response.redirect(ziel.toString(), treffer ? treffer.code : 301);
    }
    return env.ASSETS.fetch(request);
  }
};
