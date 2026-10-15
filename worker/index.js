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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
