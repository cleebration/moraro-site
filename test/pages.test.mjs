/**
 * Prüft die gebauten Seiten: keine offenen {{Platzhalter}}, Menü vollständig,
 * aktiver Menüpunkt gesetzt, Feeds zeigen auf die cleebration-Hubs mit Key „moraro“,
 * alle lokal verlinkten Assets existieren, überall „H0“ (nie „HO“ / „HØ“).
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import assert from "node:assert";

const PUB = new URL("../public/", import.meta.url);
let bestanden = 0;
const ok = (b, t) => { assert.ok(b, t); console.log("  ✓ " + t); bestanden++; };

console.log("\nSeiten moraro.world\n");
const seiten = readdirSync(new URL("../src/pages/", import.meta.url)).filter((f) => f.endsWith(".html"));
for (const s of seiten) {
  const html = readFileSync(new URL(s, PUB), "utf8");
  assert.ok(!/\{\{\w+\}\}/.test(html), `${s}: offener Platzhalter`);
  for (const nav of ["/anlage", "/fahrzeuge", "/dampflokfahrten", "/museumsbahnen", "/modellbahnanlagen", "/blog", "/galerie"]) assert.ok(html.includes(`href="${nav}"`), `${s}: Menü ${nav} fehlt`);
  const text = html.replace(/<[^>]+>/g, " ");
  assert.ok(!/\bHO\b|HØ/.test(text), `${s}: Schreibweise H0 verletzt`);
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"#?]+)"/g)) {
    assert.ok(existsSync(new URL("." + m[1], PUB)), `${s}: ${m[1]} fehlt`);
  }
  for (const m of html.matchAll(/feed="([^"]+)"/g)) {
    assert.ok(/^https:\/\/cleebration-(blog|gallery)-hub\.vercel\.app\/feed\/sites\/moraro\.\{lang\}\.json$/.test(m[1]), `${s}: Feed ${m[1]}`);
  }
}
ok(true, `${seiten.length} Seiten: keine Platzhalter, Menü komplett, Assets da, Feeds richtig, „H0“`);

for (const [s, nav] of [["anlage.html", "anlage"], ["fahrzeuge.html", "fahrzeuge"], ["dampflokfahrten.html", "dampflokfahrten"], ["museumsbahnen.html", "museumsbahnen"], ["modellbahnanlagen.html", "modellbahnanlagen"], ["blog.html", "blog"], ["galerie.html", "galerie"]]) {
  const html = readFileSync(new URL(s, PUB), "utf8");
  assert.ok(html.includes(`data-nav="${nav}" aria-current="page"`), `${s}: aktiver Menüpunkt`);
}
ok(true, "aktiver Menüpunkt auf allen Bereichsseiten");

const mb = readFileSync(new URL("museumsbahnen.html", PUB), "utf8");
ok((mb.match(/class="mb-karte"/g) || []).length >= 10 && !/<img[^>]+src="https?:/.test(mb), "Museumsbahnen: Verzeichnis gebaut, keine fremden Bilder");

const ma = readFileSync(new URL("modellbahnanlagen.html", PUB), "utf8");
ok((ma.match(/class="mb-karte"/g) || []).length >= 10 && !/<img[^>]+src="https?:/.test(ma), "Modellbahnanlagen: Verzeichnis gebaut, keine fremden Bilder");

const idx = readFileSync(new URL("index.html", PUB), "utf8");
ok(idx.includes("cleebration-credit"), "Credit-Baustein „Website von cleebration“ im Fuß");
ok(existsSync(new URL("favicon.ico", PUB)) && existsSync(new URL("assets/img/apple-touch-icon.png", PUB)), "Favicon + Apple-Touch-Icon vorhanden");

console.log(`\n${bestanden} Prüfungen bestanden\n`);
