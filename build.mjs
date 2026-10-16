/**
 * Baut die statischen Seiten aus src/ nach public/.
 *
 *   src/layout.html          Seitengerüst (head, header, footer)
 *   src/partials/*.html      Kopf- und Fußbereich — eine einzige Quelle
 *   src/pages/*.html         Nur der Inhalt der jeweiligen Seite
 *
 * Jede Seite beginnt mit einem <!--meta { … } --> Block.
 * Aufruf:  npm run build
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import config from "./site.config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src");
const OUT = join(HERE, "public");

const read = (p) => readFile(p, "utf8");

/** <!--meta { … } --> vom Seiteninhalt trennen. */
function splitMeta(raw, file) {
  const m = raw.match(/^\s*<!--meta([\s\S]*?)-->/);
  if (!m) throw new Error(`${file}: <!--meta … --> Block fehlt`);
  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (err) {
    throw new Error(`${file}: meta-Block ist kein gültiges JSON — ${err.message}`);
  }
  return { meta, body: raw.slice(m[0].length).trim() };
}

/** Platzhalter ersetzen. Unbekannte {{…}} bleiben stehen und fallen auf. */
function fill(tpl, values) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (all, key) =>
    key in values ? values[key] : all
  );
}

/** Lokale Bilddatei prüfen. Einen Rückfall auf fremde Adressen gibt es nicht. */
function image(path) {
  const local = join(OUT, path.replace(/^\//, ""));
  if (!existsSync(local)) console.warn(`  ! ${path} fehlt`);
  return path;
}

/**
 * public/_redirects → worker/redirects.generated.js
 *
 * Warum überhaupt? `_redirects` wird von Cloudflare selbst ausgewertet, aber
 * nur für Anfragen, die die Asset-Schicht bedient. Sobald ein Worker-Skript
 * im Spiel ist, ist laut Dokumentation nicht garantiert, dass eine Adresse
 * ohne passende Datei — und genau das sind die alten Wix-Adressen — vorher
 * noch durch die Weiterleitungen läuft.
 *
 * Deshalb wertet der Worker dieselben Regeln selbst aus. `_redirects` bleibt
 * die einzige Quelle, die gepflegt wird; diese Datei entsteht daraus beim
 * Build und wird nicht von Hand bearbeitet.
 *
 * Nur 3xx wird übernommen. Die 200er-Regeln (/blog → /blog.html) braucht
 * es nicht: Workers liefert `foo.html` von Haus aus unter `/foo` aus
 * (`html_handling: auto-trailing-slash`), und zwar bevor der Worker startet.
 */
async function buildRedirects() {
  const src = join(OUT, "_redirects");
  if (!existsSync(src)) {
    console.warn("  ! public/_redirects fehlt — keine Weiterleitungen erzeugt");
    return 0;
  }

  const regeln = [];
  let zeilenNr = 0;
  for (const zeile of (await read(src)).split("\n")) {
    zeilenNr++;
    const t = zeile.trim();
    if (!t || t.startsWith("#")) continue;

    const [von, nach, codeRoh] = t.split(/\s+/);
    if (!von || !nach) {
      console.warn(`  ! _redirects Zeile ${zeilenNr} unvollständig — übersprungen: ${t}`);
      continue;
    }
    const code = Number(codeRoh ?? 302);
    if (!Number.isFinite(code)) {
      console.warn(`  ! _redirects Zeile ${zeilenNr}: "${codeRoh}" ist kein Status — übersprungen`);
      continue;
    }
    if (code < 300 || code > 399) continue;   // 200er übernimmt die Asset-Schicht

    regeln.push({ von, nach, code });
  }

  const ziel = join(HERE, "worker", "redirects.generated.js");
  await mkdir(dirname(ziel), { recursive: true });
  await writeFile(
    ziel,
    "// ERZEUGT von build.mjs aus public/_redirects — nicht von Hand ändern.\n" +
      `// Stand: ${new Date().toISOString().slice(0, 10)}\n` +
      "export default " +
      JSON.stringify(regeln, null, 2) +
      ";\n",
    "utf8"
  );
  return regeln.length;
}

/**
 * Einbindung der Webfonts — entweder von Google oder vom eigenen Server.
 * Siehe `fonts` in site.config.mjs und scripts/fonts-fetch.mjs.
 */
function fontLinks() {
  const f = config.fonts ?? {};
  if (f.selfHost) {
    const datei = join(OUT, "assets", "fonts.css");
    if (!existsSync(datei)) {
      console.warn("  ! fonts.selfHost ist an, aber public/assets/fonts.css fehlt.");
      console.warn("    Einmal  npm run fonts:fetch  laufen lassen.");
    }
    return '<link rel="stylesheet" href="/assets/fonts.css" />';
  }
  throw new Error("fonts.selfHost muss an sein (Datenschutzerklärung nennt keine Google Fonts)");
}

/* Gleisband als Trenner (Markenelement: Schienen in Messing, Schwellen in Schotter).
   Reines CSS (.gleis), damit es bei jeder Breite sauber kachelt. */
const GLEIS = '<div class="gleis" aria-hidden="true"></div>';


/* Verzeichnis Museumsbahnen (Seite /museumsbahnen).
   Quelle: src/data/museumsbahnen.json – Export aus dem Dampfbahn-Register (claude.ai).
   Bewusst ohne fremde Bilder (Datenschutz): nur Text und Links. */
const LAENDER = { AT: "Österreich", DE: "Deutschland", CH: "Schweiz", IT: "Italien", CZ: "Tschechien", PL: "Polen", SK: "Slowakei", HU: "Ungarn", SI: "Slowenien", International: "International" };
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const datum = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d ?? ""); return m ? `${m[3]}.${m[2]}.${m[1]}` : ""; };
async function museumsbahnen() {
  const datei = join(SRC, "data", "museumsbahnen.json");
  if (!existsSync(datei)) return { MUSEUMSBAHNEN: "", MB_STAND: "", MB_ANZAHL: "0", MB_FILTER: "" };
  const { stand, eintraege } = JSON.parse(await read(datei));
  const ueber = (e) => e.kategorie === "Übersicht/Verband";
  const liste = eintraege.filter((e) => !ueber(e)).sort((a, b) => { const r = Object.keys(LAENDER); return (r.indexOf(a.land) - r.indexOf(b.land)) || a.titel.localeCompare(b.titel, "de"); });
  const karte = (e) => {
    let host = ""; try { host = new URL(e.link).hostname.replace(/^www\./, ""); } catch {}
    return `<article class="mb-karte" data-land="${esc(e.land)}" data-kat="${esc(e.kategorie)}" data-dampf="${esc(e.dampf)}">
  <div class="mb-karte__kopf"><span class="mb-land">${esc(e.land)}</span><span class="mb-kat">${esc(e.kategorie)}</span><span class="mb-dampf mb-dampf--${esc(e.dampf.normalize("NFD").replace(/[^a-z]/g, ""))}">Dampf: ${esc(e.dampf)}</span></div>
  <h3>${esc(e.titel)}</h3>
  <p class="mb-region">${esc([e.region, LAENDER[e.land]].filter(Boolean).join(", "))}</p>
  <p>${esc(e.beschreibung)}</p>
  <dl class="mb-daten">${e.adresse ? `<dt>Adresse</dt><dd>${esc(e.adresse)}</dd>` : ""}${e.link ? `<dt>Web</dt><dd><a href="${esc(e.link)}" rel="noopener" target="_blank">${esc(host)}</a></dd>` : ""}</dl>
  ${e.aktuelles ? `<p class="mb-aktuell"><span>Aktuell · Stand ${datum(e.geprueftAm)}</span>${esc(e.aktuelles)}</p>` : ""}
</article>`;
  };
  const verz = eintraege.filter(ueber).map((e) => `<li><a href="${esc(e.link)}" rel="noopener" target="_blank">${esc(e.titel)}</a> – ${esc(e.beschreibung)}</li>`).join("\n");
  const laender = Object.keys(LAENDER).filter((l) => liste.some((e) => e.land === l));
  const kats = [...new Set(liste.map((e) => e.kategorie))].sort((a, b) => a.localeCompare(b, "de"));
  const opt = (v, t) => `<option value="${esc(v)}">${esc(t)}</option>`;
  const filter = `<div class="mb-filter" role="search">
  <label>Land<select id="mb-land"><option value="">Alle</option>${laender.map((l) => opt(l, LAENDER[l] ?? l)).join("")}</select></label>
  <label>Art<select id="mb-kat"><option value="">Alle</option>${kats.map((k) => opt(k, k)).join("")}</select></label>
  <label>Dampf<select id="mb-dampf"><option value="">Alle</option>${["regelmäßig", "zeitweise", "nein", "unbekannt"].map((d) => opt(d, d)).join("")}</select></label>
  <p class="mb-zahl" id="mb-zahl" aria-live="polite">${liste.length} Einträge</p>
</div>`;
  return {
    MUSEUMSBAHNEN: `<div class="mb-grid" id="mb-grid">${liste.map(karte).join("\n")}</div>`,
    MB_VERZEICHNISSE: verz,
    MB_STAND: datum(stand),
    MB_ANZAHL: String(liste.length),
    MB_FILTER: filter
  };
}

const globals = {
  SITE_URL: config.siteUrl,
  MAIL: config.mail,
  LOCALES: JSON.stringify(config.locales),
  DEFAULT_LOCALE: config.defaultLocale,
  AUTO_DETECT: JSON.stringify(config.autoDetectLanguage !== false),
  FONTS: fontLinks(),
  FEED_BLOG: config.feeds.blog,
  FEED_GALLERY: config.feeds.gallery,
  G_ANLAGE: config.galleries.anlage,
  G_FAHRZEUGE: config.galleries.fahrzeuge,
  G_DAMPF: config.galleries.dampflokbahnen,
  IMG_LOGO: image(config.images.logo),
  IMG_PLAKETTE: image(config.images.plakette),
  IMG_OG: image(config.images.og),
  GLEIS,
  ...(await museumsbahnen())
};

const layout = await read(join(SRC, "layout.html"));
const headerRaw = await read(join(SRC, "partials/header.html"));
const footerRaw = await read(join(SRC, "partials/footer.html"));

const pages = (await readdir(join(SRC, "pages"))).filter((f) => f.endsWith(".html"));
if (!pages.length) throw new Error("src/pages/ enthält keine Seiten");

await mkdir(OUT, { recursive: true });

let built = 0;
for (const file of pages.sort()) {
  const { meta, body } = splitMeta(await read(join(SRC, "pages", file)), file);
  if (!meta.title || !meta.out) throw new Error(`${file}: "title" und "out" sind Pflicht`);

  // Aktiven Navigationspunkt markieren
  const header = meta.nav
    ? headerRaw.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`)
    : headerRaw;

  const html = fill(layout, {
    ...globals,
    TITLE: meta.title,
    DESCRIPTION: meta.description ?? "",
    CANONICAL: meta.canonical ?? "/" + meta.out.replace(/index\.html$/, "").replace(/\.html$/, ""),
    HEAD: meta.head ?? "",
    SCRIPTS: meta.scripts ?? "",
    HEADER: fill(header, globals),
    FOOTER: fill(footerRaw, globals),
    BODY: fill(body, globals)
  });

  const target = join(OUT, meta.out);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
  console.log("  ✓", meta.out);
  built++;
}

const anzahlWeiterleitungen = await buildRedirects();

console.log(`\n${built} Seiten gebaut → public/`);
console.log(`${anzahlWeiterleitungen} Weiterleitungen → worker/redirects.generated.js`);
