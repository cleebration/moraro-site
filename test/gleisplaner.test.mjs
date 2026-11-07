/**
 * Prüft den Gleisplaner auf moraro.world (Seite /gleisplaner + App /gleisplaner-app).
 *   node build.mjs && node test/gleisplaner.test.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { Script } from "node:vm";
import assert from "node:assert";

const PUB = new URL("../public/", import.meta.url);
let bestanden = 0;
const ok = (b, t) => { assert.ok(b, t); console.log("  ✓ " + t); bestanden++; };
console.log("\nGleisplaner moraro.world\n");

const quelle = readFileSync(new URL("../src/apps/gleisplaner.html", import.meta.url), "utf8");
ok(existsSync(new URL("gleisplaner-app.html", PUB)) && existsSync(new URL("gleisplaner.html", PUB)), "App und Seite gebaut");
const app = readFileSync(new URL("gleisplaner-app.html", PUB), "utf8");
const seite = readFileSync(new URL("gleisplaner.html", PUB), "utf8");

ok(/^<!DOCTYPE html>/.test(app) && app.includes('<meta charset="utf-8"') && app.includes('name="viewport"'), "App mit Seitengerüst");
ok(!/fonts\.(googleapis|gstatic)\.com/.test(app) && app.includes('href="/assets/fonts.css"'), "App: Schriften vom eigenen Server, keine Google Fonts");
ok(app.includes('<meta name="robots" content="noindex"') && app.includes('rel="canonical" href="https://moraro.world/gleisplaner"'), "App: noindex, kanonisch /gleisplaner");
ok((app.match(/<title>/g) || []).length === 1 && app.includes("<title>MoRaRo Gleisplaner</title>"), "App: genau ein Titel");
ok(!/claude:/.test(app), "App: keine claude-Metadaten");

const skripte = [...app.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok(skripte.length >= 1, "App: Skript vorhanden");
for (const s of skripte) new Script(s);
ok(true, "App: Skript syntaktisch gültig");
const qSkripte = [...quelle.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok(qSkripte.join("") === skripte.join(""), "App: Skript unverändert aus src/apps/gleisplaner.html");
const qStil = (quelle.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
ok(qStil && app.includes(qStil), "App: Gestaltung unverändert übernommen");

for (const merkmal of ["7286", "localStorage", "gleisplan-moraro.json", "Datei laden"]) ok(app.includes(merkmal), `App enthält „${merkmal}“`);
ok(/Wendel/i.test(app) && /Rampe/i.test(app), "App: Rampe und Wendel");
ok(/Unterbau/.test(app) && /lichte Höhe/.test(app) && /Kiste/.test(app), "App: Unterbau-Module mit Kisten und lichter Höhe");
ok(!/<(script|img)[^>]+src="https?:\/\//.test(app) && !/<link(?![^>]*rel="canonical")[^>]+href="https?:\/\//.test(app), "App lädt nichts von fremden Servern");

ok(seite.includes('<iframe src="/gleisplaner-app"') && seite.includes('href="/gleisplaner-app"'), "Seite: App eingebettet + Vollbild-Knopf");
ok(seite.includes('data-nav="gleisplaner" aria-current="page"'), "Seite: Menüpunkt aktiv");
ok(seite.includes('href="/datenschutz#gleisplaner"'), "Seite: Verweis auf Datenschutz");
const ds = readFileSync(new URL("datenschutz.html", PUB), "utf8");
ok(ds.includes('id="gleisplaner"') && ds.includes("localStorage"), "Datenschutz: Abschnitt Gleisplaner");
const idx = readFileSync(new URL("index.html", PUB), "utf8");
ok(idx.includes('href="/gleisplaner"'), "Menü (Kopf/Fuß) mit Gleisplaner");

console.log(`\n${bestanden} Prüfungen bestanden\n`);
