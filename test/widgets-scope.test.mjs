/*
 * Prueft, dass kein Anzeige-Modul eine Variable benutzt, die es in der
 * eigenen Methode gar nicht gibt.
 *
 * Anlass: <blog-post>._paint() benutzte `t` fuer die Beschriftungen, deklariert
 * war `t` aber nur in _render(). Jeder Aufruf warf einen ReferenceError, den
 * _render() auffing und als "Beitrag konnte nicht geladen werden" anzeigte.
 * Die Einzelansicht war damit komplett unbenutzbar -- und das faellt fast
 * nicht auf, weil die Liste einwandfrei laeuft und sogar der Titel im
 * Browsertab stimmt (document.title wird eine Zeile vor dem Fehler gesetzt).
 *
 * Warum kein echter Browser-Test: die Module brauchen DOM, Shadow DOM und
 * einen erreichbaren Feed. Das waere richtig, ist aber ein groesseres Stueck
 * Arbeit. Dieser Test kostet nichts und faengt genau die Klasse von Fehlern,
 * die hier zweimal aufgetreten waere.
 */
import { readFileSync, readdirSync } from "node:fs";

let bestanden = 0;
const funde = [];

/* Kurze Bezeichner, die als Beschriftungs- oder Hilfsobjekt durchgereicht
   werden und deshalb leicht aus dem Rahmen fallen. */
const VERDAECHTIG = ["t", "e", "p"];

const DIR = new URL("../public/assets/", import.meta.url);
const dateien = readdirSync(DIR).filter((f) => f.endsWith("-widget.js") || f.endsWith("-widget.i18n.js"));

for (const datei of dateien) {
  const quelle = readFileSync(new URL(datei, DIR), "utf8");

  /* Methoden grob abgrenzen: Zeile der Form `  name(args) {` bis zur
     schliessenden Klammer auf derselben Einrueckung. Reicht fuer diese
     Dateien -- sie sind alle gleich aufgebaut. */
  const zeilen = quelle.split("\n");
  for (let i = 0; i < zeilen.length; i++) {
    const kopf = zeilen[i].match(/^(\s+)(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{\s*$/);
    if (!kopf) continue;
    const [, einzug, name] = kopf;
    if (name === "if" || name === "for" || name === "while" || name === "switch" || name === "catch") continue;

    let ende = zeilen.length;
    for (let j = i + 1; j < zeilen.length; j++) {
      if (zeilen[j] === einzug + "}") { ende = j; break; }
    }
    const koerper = zeilen.slice(i + 1, ende).join("\n");

    for (const v of VERDAECHTIG) {
      const benutzt = new RegExp(`(?<![\\w$.])${v}\\.`).test(koerper);
      if (!benutzt) continue;
      const deklariert =
        new RegExp(`(?:const|let|var)\\s+${v}\\b`).test(koerper) ||
        new RegExp(`\\(\\s*${v}\\s*[,)]|,\\s*${v}\\s*[,)]`).test(zeilen[i]) ||
        new RegExp(`(?:\\(|,)\\s*\\(?\\s*${v}\\b[^)]*\\)?\\s*=>`).test(koerper);
      if (!deklariert) funde.push(`${datei} · ${name}() benutzt \`${v}.\`, deklariert es aber nicht`);
    }
  }
}

console.log("\nModule: benutzte Variablen\n");
if (funde.length) {
  for (const f of funde) console.log("  ✗ " + f);
  console.error(`\n${funde.length} Fund(e).`);
  process.exit(1);
}
bestanden++;
console.log(`  ✓ ${dateien.length} Module geprueft, keine Variable ausserhalb ihres Rahmens`);
console.log(`\n${bestanden} Pruefung bestanden.\n`);
