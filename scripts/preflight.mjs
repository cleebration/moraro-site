/**
 * preflight.mjs — vor dem Livegang von moraro.world einmal laufen lassen.
 *
 *     npm run preflight
 *
 * Rückgabe: 0 wenn alles Kritische passt, 1 wenn ein ✗ dabei ist.
 */
import { readFile } from "node:fs/promises";
import { existsSync, statSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import config from "../site.config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const PUBLIC = join(ROOT, "public");

let fail = 0, warn = 0;
const ok   = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad  = (m) => { fail++; console.log(`  \x1b[31m✗\x1b[0m ${m}`); };
const soso = (m) => { warn++; console.log(`  \x1b[33m!\x1b[0m ${m}`); };

console.log("\nmoraro.world — Kontrolle vor dem Livegang\n");

console.log("Bilder der Website");
for (const [name, p] of Object.entries(config.images)) {
  const f = join(PUBLIC, p.replace(/^\//, ""));
  if (existsSync(f) && statSync(f).size > 0) ok(`${name} liegt lokal (${Math.round(statSync(f).size / 1024)} kB)`);
  else bad(`${name} fehlt: ${p}`);
}

console.log("\nFeeds (aus den cleebration-Hubs)");
for (const [name, url] of Object.entries(config.feeds)) {
  for (const lang of config.locales) {
    const probe = url.replace("{lang}", lang);
    try {
      const res = await fetch(probe, { redirect: "follow" });
      if (res.status === 404) { soso(`${name}/${lang}: noch kein Eintrag mit sites: [moraro] im Hub (Seite zeigt „Derzeit keine …“)`); continue; }
      if (!res.ok) { bad(`${name}/${lang}: HTTP ${res.status} — ${probe}`); continue; }
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.posts ?? [];
      if (!items.length) bad(`${name}/${lang}: leer — ist der Hub mit sites: moraro schon deployt?`);
      else ok(`${name}/${lang}: ${items.length} Einträge`);
      const fremd = JSON.stringify(data).match(/static\.wixstatic\.com/g);
      if (fremd) bad(`${name}/${lang}: ${fremd.length} Bildadressen zeigen noch auf Wix — im Hub "npm run media:pull", Ergebnis committen`);
    } catch (err) {
      bad(`${name}/${lang} nicht erreichbar: ${err.message}`);
    }
  }
}

console.log("\nAufbau");
const seiten = readdirSync(join(ROOT, "src/pages")).filter((f) => f.endsWith(".html"));
const fehlend = seiten.filter((s) => !existsSync(join(PUBLIC, s)));
if (fehlend.length) bad(`gebaute Seiten fehlen: ${fehlend.join(", ")} — "npm run build"`);
else ok(`alle ${seiten.length} Seiten gebaut`);
existsSync(join(PUBLIC, "_redirects")) ? ok("_redirects vorhanden") : bad("_redirects fehlt");
existsSync(join(ROOT, "worker/redirects.generated.js")) ? ok("Worker-Weiterleitungen erzeugt") : bad("worker/redirects.generated.js fehlt — npm run build");

const alles = seiten.map((s) => existsSync(join(PUBLIC, s)) ? s : null).filter(Boolean);
let wix = 0;
for (const s of alles) if (/wixstatic|wixsite|\.wix\.com/.test(await readFile(join(PUBLIC, s), "utf8"))) wix++;
wix ? bad(`${wix} Seite(n) enthalten noch Wix-Adressen`) : ok("keine Seite verweist auf Wix");

console.log("\nBleibt Handarbeit (kann dieses Skript nicht prüfen)");
console.log("  · Schritt 0: alte DNS-Zone vollständig abgeschrieben (Wix → Domain → DNS)");
console.log("  · E-Mail: MX (Google) und EmailOctopus-CNAMEs nach Cloudflare übernommen? Test-Mail hin und zurück");
console.log("  · Impressum und Datenschutz gelesen (Adresse, E-Mail)");

console.log(`\n${fail} Fehler · ${warn} Hinweise\n`);
process.exit(fail ? 1 : 0);
