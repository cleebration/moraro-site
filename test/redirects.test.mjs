/**
 * Prüft den Worker von moraro.world: Kurzadressen, www → ohne www, Asset-Schicht.
 *
 *   npm test          (baut vorher, damit worker/redirects.generated.js stimmt)
 */
import { readFileSync } from "node:fs";
import assert from "node:assert";
import worker from "../worker/index.js";

let bestanden = 0;
const ok = (bedingung, text) => { assert.ok(bedingung, text); console.log("  ✓ " + text); bestanden++; };

const BASIS = "https://moraro.world";
async function hole(pfad, host = BASIS, init) {
  const env = { ASSETS: { fetch: async () => new Response("ASSET", { status: 200 }) } };
  return worker.fetch(new Request(host + pfad, init), env, {});
}
const ziel = (res) => (res.headers.get("location") || "").replace(BASIS, "");

console.log("\nWeiterleitungen moraro.world\n");

for (const [alt, neu] of [["/bau", "/anlage"], ["/gleisplan", "/anlage"], ["/loks", "/fahrzeuge"], ["/dampfbahnen", "/dampflokfahrten"], ["/dampflokbahnen", "/dampflokfahrten"], ["/gallerie", "/"], ["/blog", "/anlage#baubericht"], ["/galerie", "/"]]) {
  const r = await hole(alt);
  ok(r.status === 301 && ziel(r) === neu, `${alt} → ${neu} (301)`);
}
ok(ziel(await hole("/post/irgendwas")) === "/anlage", "/post/… → /anlage");

{
  const r = await hole("/anlage", "https://www.moraro.world");
  ok(r.status === 301 && r.headers.get("location") === BASIS + "/anlage", "www → ohne www (301)");
  const r2 = await hole("/bau", "https://www.moraro.world");
  ok(r2.headers.get("location") === BASIS + "/anlage", "www + Kurzadresse: EIN Sprung");
  for (const p of ["/", "/anlage", "/fahrzeuge", "/fahrzeug", "/dampflokfahrten", "/fahrt", "/post", "/bild", "/museumsbahnen", "/modellbahnanlagen", "/impressum", "/datenschutz"]) {
    const r3 = await hole(p);
    if (r3.status !== 200 || (await r3.text()) !== "ASSET") assert.fail(`${p} geht nicht an die Asset-Schicht`);
  }
  ok(true, "alle Seiten gehen an die Asset-Schicht");
  const r4 = await hole("/", "https://moraro-site.beispiel.workers.dev");
  ok(r4.status === 200, "workers.dev-Vorschau wird nicht umgeleitet");
}

{
  const roh = readFileSync(new URL("../public/_redirects", import.meta.url), "utf8");
  const zweihundert = roh.split("\n").filter((z) => !z.trim().startsWith("#") && /\s2\d\d\s*$/.test(z));
  ok(zweihundert.length === 0, "keine 200er-Umschreibungen in _redirects");
  const wr = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  ok(/"run_worker_first":\s*true/.test(wr), "run_worker_first: true — der Worker entscheidet");
}

console.log(`\n${bestanden} Prüfungen bestanden\n`);
