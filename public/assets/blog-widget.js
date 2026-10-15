/*
 * blog-widget.js
 * Einbettbares Blog-Modul als Web-Components – funktioniert auf jeder Seite
 * (statisches HTML, Astro, Next, als Notloesung auch in Wix-HTML-Embeds).
 * Stil-isoliert per Shadow DOM, komplett ueber CSS-Variablen (--blog-*) themebar.
 * Keine Abhaengigkeiten.
 *
 * Einbetten – Uebersicht:
 *   <script type="module" src="/blog-widget.js"></script>
 *   <blog-list  feed="https://hub.vercel.app/feed/sites/cleebration.json"
 *               post-url="/blog/post.html"></blog-list>
 *
 * Einbetten – Artikelseite (eigene HTML-Seite, liest ?post=slug):
 *   <blog-post  feed="https://hub.vercel.app/feed/sites/cleebration.json"
 *               back-url="/blog/"></blog-post>
 *
 * Credit-Baustein (auch einzeln nutzbar, z. B. im Footer jeder Seite):
 *   <blog-credit></blog-credit>
 */

/* =========================================================================
   Mehrsprachigkeit
   -------------------------------------------------------------------------
   Nicht auf zwei Sprachen festgelegt: SPRACHEN ist eine Tabelle, und eine
   weitere Sprache ist ein weiterer Eintrag darin. Die Feed-Adresse enthält
   den Platzhalter {lang}, den der Hub mit einem Feed je Sprache bedient.

   Eine Sprache ergänzen:
     1. hier einen Block anlegen (z. B. `fr: { … }`)
     2. im Hub `locales` in i18n.config.json erweitern
     3. auf der Seite `SiteI18n.init({ locales: [...] })` erweitern

   Fehlt ein Block, fällt das Modul auf die Standardsprache zurück, statt
   leere Beschriftungen zu zeigen.
   ========================================================================= */
const SPRACHEN = {
  de: {
    formatLocale: "de-AT",
    alle: "Alle",
    laedt: "Beiträge werden geladen …",
    laedtBeitrag: "Beitrag wird geladen …",
    keine: "Keine Beiträge gefunden.",
    keinFeed: "Kein feed-Attribut gesetzt.",
    ladefehler: "Beitrag konnte nicht geladen werden.",
    mehrLaden: "Mehr laden",
    min: "Min.",
    lesezeit: "Min. Lesezeit",
    nachThemaFiltern: "Nach Thema filtern",
    alleBeitraege: "Alle Beiträge",
    neuerer: "Neuerer Beitrag",
    aelterer: "Älterer Beitrag",
    uebersetzungFolgt: "Übersetzung folgt"
  },
  en: {
    formatLocale: "en-GB",
    alle: "All",
    laedt: "Loading posts …",
    laedtBeitrag: "Loading post …",
    keine: "No posts found.",
    keinFeed: "No feed attribute set.",
    ladefehler: "The post could not be loaded.",
    mehrLaden: "Show more",
    min: "min",
    lesezeit: "min read",
    nachThemaFiltern: "Filter by topic",
    alleBeitraege: "All posts",
    neuerer: "Newer post",
    aelterer: "Older post",
    uebersetzungFolgt: "Translation pending"
  }
};
const STANDARD_SPRACHE = "de";

/** Aktive Sprache: der Umschalter der Seite, sonst das lang-Attribut. */
function aktiveSprache(el) {
  if (window.SiteI18n && window.SiteI18n.lang) return window.SiteI18n.lang;
  const attr = el && el.getAttribute("lang");
  if (attr) return attr;
  return STANDARD_SPRACHE;
}

/** Beschriftungen einer Sprache, mit Rückfall über die Basissprache. */
function texte(sprache) {
  return (
    SPRACHEN[sprache] ||
    SPRACHEN[String(sprache).split("-")[0]] ||
    SPRACHEN[STANDARD_SPRACHE]
  );
}

/* Datumsformat folgt der Sprache. Die Funktionen unten bekommen sie
   durchgereicht; ohne Angabe gilt die Standardsprache. */
const formatLocale = (sprache) => texte(sprache).formatLocale;

/* ----------------------------------------------------------------------------
 * Gemeinsame Helfer
 * -------------------------------------------------------------------------- */

function fmtDate(iso, timeZone, sprache) {
  try {
    return new Intl.DateTimeFormat(formatLocale(sprache), {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timeZone || "Europe/Vienna"
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString(formatLocale(sprache));
  }
}

function esc(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Notbehelf für Tags ohne hinterlegte Beschriftung: aus "home-office" wird
 * "Home Office". Umlaute kann das nicht herstellen — dafür gehört eine
 * Beschriftung in den Hub, die dann über `tagLabels` im Feed ankommt.
 */
function schoenerTag(t) {
  return String(t).replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

async function loadFeed(url, sprache) {
  /* {lang} in der Feed-Adresse durch die aktive Sprache ersetzen.
     Der Hub liefert je Sprache eine Datei; ohne Platzhalter bleibt die
     Adresse unveraendert und alles funktioniert wie bisher. */
  url = String(url).replace(/\{lang\}/g, sprache || STANDARD_SPRACHE);
  const res = await fetch(url, { mode: "cors" });
  // PATCH klangerie: 404 = für diese Seite gibt es im Hub noch keinen Beitrag → leere Liste statt Fehler.
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Feed nicht erreichbar (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

/* Credit-Baustein als HTML-String (in mehreren Komponenten verwendet).
 * Standardlogo ist die Wortmarke "cleebration". Eine echte Logodatei laesst
 * sich per Attribut credit-logo="URL" oder CSS-Variable --blog-credit-logo
 * (background-image) einsetzen. */
function creditMarkup(logoUrl) {
  const logo = logoUrl
    ? `<img class="credit__logo-img" src="${esc(logoUrl)}" alt="cleebration" />`
    : `<span class="credit__wordmark">cleebration</span>`;
  return `
    <div class="credit" part="credit">
      <span class="credit__label">Ein Kunstprojekt von</span>
      <a class="credit__link" href="https://www.cleebration.com"
         target="_blank" rel="noopener">${logo}</a>
    </div>`;
}

/* ----------------------------------------------------------------------------
 * Gemeinsames Styling (Design-Tokens pro Seite ueberschreibbar)
 * -------------------------------------------------------------------------- */

const TOKENS = `
  :host {
    --blog-font-display: var(--blog-font, Georgia, "Times New Roman", serif);
    --blog-font-body: var(--blog-font, system-ui, -apple-system, "Segoe UI", sans-serif);
    --blog-bg: transparent;
    --blog-surface: #ffffff;
    --blog-text: #1a1a1a;
    --blog-muted: #6b6b6b;
    --blog-accent: #1a1a1a;
    --blog-accent-contrast: #ffffff;
    --blog-border: #e4e1da;
    --blog-radius: 4px;
    --blog-gap: 1.75rem;
    --blog-maxwidth: 1120px;
    --blog-readwidth: 680px;

    display: block;
    color: var(--blog-text);
    background: var(--blog-bg);
    font-family: var(--blog-font-body);
    line-height: 1.6;
    box-sizing: border-box;
  }
  *, *::before, *::after { box-sizing: inherit; }
  a { color: inherit; }

  .wrap { max-width: var(--blog-maxwidth); margin: 0 auto; }

  .state { padding: 2rem 0; color: var(--blog-muted); }

  /* Hinweis, dass dieser Beitrag in der gewaehlten Sprache noch nicht
     uebersetzt ist und deshalb in der Standardsprache erscheint. */
  .pending {
    display: inline-block;
    font-size: .68rem; letter-spacing: .04em; text-transform: uppercase;
    padding: .1rem .5rem; border-radius: 999px;
    border: 1px solid var(--blog-border); color: var(--blog-muted);
  }

  /* Credit-Baustein */
  .credit {
    display: flex;
    align-items: center;
    gap: .55rem;
    margin-top: 2.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--blog-border);
    font-size: .82rem;
    color: var(--blog-muted);
  }
  .credit__label { letter-spacing: .02em; }
  .credit__link { text-decoration: none; display: inline-flex; align-items: center; }
  .credit__logo-img { height: 1.4rem; width: auto; display: block; }
  .credit__wordmark {
    font-family: var(--blog-font-display);
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--blog-accent);
    letter-spacing: .01em;
  }
  .credit__link:hover .credit__wordmark { text-decoration: underline; }
`;

const LIST_STYLES = `
  ${TOKENS}

  .filters {
    display: flex; flex-wrap: wrap; gap: .5rem;
    margin: 0 0 var(--blog-gap);
  }
  .chip {
    font: inherit; font-size: .85rem;
    padding: .35rem .8rem;
    border: 1px solid var(--blog-border);
    border-radius: 999px;
    background: var(--blog-surface);
    color: var(--blog-muted);
    cursor: pointer;
    transition: background .15s ease, color .15s ease, border-color .15s ease;
  }
  .chip[aria-pressed="true"] {
    background: var(--blog-accent);
    color: var(--blog-accent-contrast);
    border-color: var(--blog-accent);
  }
  .chip:focus-visible { outline: 3px solid var(--blog-accent); outline-offset: 2px; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--blog-gap);
  }
  .card {
    display: flex; flex-direction: column;
    background: var(--blog-surface);
    border: 1px solid var(--blog-border);
    border-radius: var(--blog-radius);
    overflow: hidden;
    text-decoration: none; color: inherit;
    transition: transform .18s ease, box-shadow .18s ease;
  }
  .card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0,0,0,.10); }
  .card:focus-visible { outline: 3px solid var(--blog-accent); outline-offset: 2px; }
  .card__media { aspect-ratio: 16 / 9; background: var(--blog-border); overflow: hidden; }
  .card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card__body { padding: 1.15rem 1.25rem 1.4rem; display: flex; flex-direction: column; gap: .5rem; }
  .card__meta { font-size: .78rem; color: var(--blog-muted); display: flex; gap: .5rem; flex-wrap: wrap; }
  .card__cat { color: var(--blog-accent); font-weight: 600; }
  .card__title { font-family: var(--blog-font-display); font-size: 1.3rem; line-height: 1.25; margin: 0; }
  .card__summary { color: var(--blog-muted); font-size: .95rem; margin: 0; }

  .more { display: flex; justify-content: center; margin-top: var(--blog-gap); }
  .more button {
    font: inherit; cursor: pointer;
    padding: .7rem 1.5rem;
    border: 1px solid var(--blog-accent);
    border-radius: var(--blog-radius);
    background: transparent; color: var(--blog-accent);
    transition: background .15s ease, color .15s ease;
  }
  .more button:hover { background: var(--blog-accent); color: var(--blog-accent-contrast); }

  @media (prefers-reduced-motion: reduce) {
    .card { transition: none; }
    .card:hover { transform: none; }
  }
`;

const POST_STYLES = `
  ${TOKENS}

  .article { max-width: var(--blog-readwidth); margin: 0 auto; }
  .back {
    display: inline-block; margin-bottom: 1.5rem;
    font-size: .9rem; color: var(--blog-muted); text-decoration: none;
  }
  .back:hover { color: var(--blog-accent); }
  /* Blaettern zwischen Beitraegen. Zwei Spalten, damit der aeltere Beitrag
     rechts steht, auch wenn es links keinen neueren gibt. */
  .umblaettern { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
                 margin-top: 2.5rem; padding-top: 1.25rem;
                 border-top: 1px solid var(--blog-border); }
  .umblaettern a { text-decoration: none; color: var(--blog-text); }
  .umblaettern a:hover .blatt__titel { color: var(--blog-accent); }
  .blatt--rechts { text-align: right; }
  .blatt__richtung { display: block; font-size: .78rem; color: var(--blog-muted);
                     text-transform: uppercase; letter-spacing: .06em; margin-bottom: .2rem; }
  .blatt__titel { display: block; font-family: var(--blog-font-display);
                  font-size: 1.05rem; line-height: 1.25; }
  @media (max-width: 34rem) {
    .umblaettern { grid-template-columns: 1fr; }
    .blatt--rechts { text-align: left; }
  }
  .cover { width: 100%; aspect-ratio: 16 / 9; object-fit: cover;
           border-radius: var(--blog-radius); margin-bottom: 1.75rem; background: var(--blog-border); }
  .eyebrow { color: var(--blog-accent); font-weight: 600; font-size: .82rem;
             text-transform: uppercase; letter-spacing: .06em; }
  h1.title { font-family: var(--blog-font-display); font-size: clamp(1.9rem, 4vw, 2.7rem);
             line-height: 1.15; margin: .4rem 0 .8rem; }
  .meta { color: var(--blog-muted); font-size: .9rem; display: flex; gap: .6rem;
          flex-wrap: wrap; align-items: center; margin-bottom: 1.75rem; }
  .meta .dot { opacity: .5; }
  .tags { display: flex; flex-wrap: wrap; gap: .4rem; margin: 1.75rem 0 0; }
  .tag { font-size: .78rem; padding: .25rem .65rem; border: 1px solid var(--blog-border);
         border-radius: 999px; color: var(--blog-muted); }

  .body { font-size: 1.08rem; }
  .body > :first-child { margin-top: 0; }
  .body h2 { font-family: var(--blog-font-display); font-size: 1.6rem; margin: 2rem 0 .6rem; }
  .body h3 { font-family: var(--blog-font-display); font-size: 1.3rem; margin: 1.6rem 0 .5rem; }
  .body p { margin: 0 0 1.1rem; }
  .body img { max-width: 100%; height: auto; border-radius: var(--blog-radius); }
  .body a { color: var(--blog-accent); }
  .body blockquote {
    margin: 1.5rem 0; padding: .4rem 0 .4rem 1.25rem;
    border-left: 3px solid var(--blog-accent);
    color: var(--blog-muted); font-style: italic;
  }
  .body ul, .body ol { padding-left: 1.3rem; margin: 0 0 1.1rem; }
  .body code { background: var(--blog-border); padding: .1em .35em; border-radius: 3px; font-size: .9em; }
  .body pre { background: #1a1a1a; color: #f4f1ea; padding: 1rem; border-radius: var(--blog-radius); overflow-x: auto; }
  .body pre code { background: none; padding: 0; }
`;

/* ----------------------------------------------------------------------------
 * <blog-list> – Uebersicht mit Tag-Filter und "Mehr laden"
 * -------------------------------------------------------------------------- */


/* Warten, bis die Sprache der Seite feststeht.

   Ohne das zeichnet das Modul in der Standardsprache, holt deren Feed, und
   zeichnet unmittelbar danach noch einmal in der wirklichen Sprache — zwei
   Abrufe und ein sichtbares Flackern.

   Auf einer fremden Seite ohne SiteI18n gibt es nichts zu warten; dort
   zeichnet das Modul sofort. */
function spracheBereit() {
  const i = window.SiteI18n;
  if (!i || !i.ready) return Promise.resolve();
  /* Notausgang: bindet eine Seite site-i18n.js ein, ruft aber nie init()
     auf, loest das Versprechen nie auf -- und das Modul bliebe fuer immer
     leer. Nach zwei Sekunden wird deshalb in der Standardsprache
     gezeichnet. */
  const notausgang = new Promise((r) => setTimeout(r, 2000));
  return Promise.race([i.ready, notausgang]).catch(() => {});
}

class BlogList extends HTMLElement {
  static get observedAttributes() { return ["feed", "site", "tags", "post-url", "page-size", "credit", "credit-logo"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._all = [];
    this._activeTag = null;
    this._shown = 0;
  }

  connectedCallback() {
    /* Auf den Sprachumschalter der Seite hoeren: beim Wechsel wird der Feed
       der anderen Sprache geladen und neu gezeichnet, ohne Neuladen. */
    this._unsub = window.SiteI18n
      ? window.SiteI18n.onChange(() => {
          if (!this._gezeichnet) return;
          this._shown = 0;
          this._render();
        })
      : () => {};
    this._verbunden = true;
    spracheBereit().then(() => { this._gezeichnet = true; this._render(); });
  }
  disconnectedCallback() { if (this._unsub) this._unsub(); }
  /* Erst ab dem Einhaengen auf Attributaenderungen reagieren. Vorher feuert
     dieser Rueckruf einmal je vorhandenem Attribut -- das waren auf der
     Blogseite vier Durchlaeufe und vier Abrufe desselben Feeds. */
  attributeChangedCallback() { if (this._verbunden) this._render(); }

  get pageSize() { return parseInt(this.getAttribute("page-size") || "9", 10); }

  async _render() {
    const feed = this.getAttribute("feed");
    const root = this.shadowRoot;
    this._sprache = aktiveSprache(this);
    const t = texte(this._sprache);
    root.innerHTML = `<style>${LIST_STYLES}</style><div class="wrap"><div class="state">${t.laedt}</div></div>`;
    if (!feed) { root.querySelector(".state").textContent = t.keinFeed; return; }

    try {
      let posts = await loadFeed(feed, this._sprache);
      const site = this.getAttribute("site");
      if (site) posts = posts.filter((p) => (p.sites || []).includes(site));
      const pre = (this.getAttribute("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
      if (pre.length) posts = posts.filter((p) => (p.tags || []).some((t) => pre.includes(t)));
      this._all = posts;
      this._activeTag = null;
      this._shown = this.pageSize;
      this._paint();
    } catch (err) {
      root.querySelector(".state").textContent = "Beitraege konnten nicht geladen werden.";
      console.error(err);
    }
  }

  _filtered() {
    return this._activeTag
      ? this._all.filter((p) => (p.tags || []).includes(this._activeTag))
      : this._all;
  }

  _paint() {
    const t = texte(this._sprache);
    const root = this.shadowRoot;
    const postUrl = this.getAttribute("post-url") || "post.html";
    const showCredit = this.getAttribute("credit") !== "off";
    /* [schlüssel, beschriftung] je Tag. Die Beschriftung kommt aus
       `tagLabels` im Feed, sonst wird der Schlüssel lesbar gemacht —
       „digitalisierung" als Knopfbeschriftung sah unfertig aus. */
    const tagMap = new Map();
    for (const p of this._all)
      for (const t of p.tags || [])
        if (!tagMap.has(t)) tagMap.set(t, (p.tagLabels && p.tagLabels[t]) || schoenerTag(t));
    const tags = [...tagMap].sort((a, b) => a[1].localeCompare(b[1], "de"));
    const list = this._filtered();
    const visible = list.slice(0, this._shown);

    const filterBar = tags.length
      ? `<div class="filters" role="group" aria-label="${esc(t.nachThemaFiltern)}">
           <button class="chip" data-tag="" aria-pressed="${this._activeTag === null}">${esc(t.alle)}</button>
           ${tags.map(([t, label]) => `<button class="chip" data-tag="${esc(t)}" aria-pressed="${this._activeTag === t}">${esc(label)}</button>`).join("")}
         </div>`
      : "";

    const cards = visible.length
      ? visible.map((p) => {
          const href = `${postUrl}${postUrl.includes("?") ? "&" : "?"}post=${encodeURIComponent(p.slug)}`;
          const media = p.image ? `<div class="card__media"><img src="${esc(p.image)}" alt="" loading="lazy" /></div>` : "";
          const cat = p.category ? `<span class="card__cat">${esc(p.category)}</span>` : "";
          return `<a class="card" href="${href}">
              ${media}
              <div class="card__body">
                <div class="card__meta">${cat}<span>${fmtDate(p.date, p.timeZone, this._sprache)}</span><span>${p.readingMinutes} ${esc(t.min)}</span>${p.translated === false ? `<span class="pending">${esc(t.uebersetzungFolgt)}</span>` : ""}</div>
                <h2 class="card__title">${esc(p.title)}</h2>
                ${p.summary ? `<p class="card__summary">${esc(p.summary)}</p>` : ""}
              </div>
            </a>`;
        }).join("")
      : `<div class="state">${esc(t.keine)}</div>`;

    const more = list.length > this._shown
      ? `<div class="more"><button type="button" data-more>${esc(t.mehrLaden)}</button></div>` : "";

    const credit = showCredit ? creditMarkup(this.getAttribute("credit-logo")) : "";


    root.innerHTML = `<style>${LIST_STYLES}</style>
      <div class="wrap">
        ${filterBar}
        <div class="grid">${cards}</div>
        ${more}
        ${credit}
      </div>`;

    root.querySelectorAll(".chip").forEach((btn) =>
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-tag");
        this._activeTag = t === "" ? null : t;
        this._shown = this.pageSize;
        this._paint();
      })
    );
    const moreBtn = root.querySelector("[data-more]");
    if (moreBtn) moreBtn.addEventListener("click", () => { this._shown += this.pageSize; this._paint(); });
  }
}

/* ----------------------------------------------------------------------------
 * <blog-post> – einzelner Artikel (liest ?post=slug aus der URL)
 * -------------------------------------------------------------------------- */

class BlogPost extends HTMLElement {
  static get observedAttributes() { return ["feed", "back-url", "slug", "credit", "credit-logo"]; }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this._unsub = window.SiteI18n
      ? window.SiteI18n.onChange(() => { if (this._gezeichnet) this._render(); })
      : () => {};
    this._verbunden = true;
    spracheBereit().then(() => { this._gezeichnet = true; this._render(); });
  }
  disconnectedCallback() { if (this._unsub) this._unsub(); }
  /* Erst ab dem Einhaengen auf Attributaenderungen reagieren. Vorher feuert
     dieser Rueckruf einmal je vorhandenem Attribut -- das waren auf der
     Blogseite vier Durchlaeufe und vier Abrufe desselben Feeds. */
  attributeChangedCallback() { if (this._verbunden) this._render(); }

  _slug() {
    if (this.getAttribute("slug")) return this.getAttribute("slug");
    const u = new URL(window.location.href);
    return u.searchParams.get("post");
  }

  async _render() {
    const feed = this.getAttribute("feed");
    const root = this.shadowRoot;
    this._sprache = aktiveSprache(this);
    const t = texte(this._sprache);
    root.innerHTML = `<style>${POST_STYLES}</style><div class="wrap"><div class="state">${t.laedtBeitrag}</div></div>`;
    if (!feed) { root.querySelector(".state").textContent = "Kein feed-Attribut gesetzt."; return; }

    const slug = this._slug();
    if (!slug) { root.querySelector(".state").textContent = "Kein Beitrag angegeben."; return; }

    try {
      const posts = await loadFeed(feed, this._sprache);
      const i = posts.findIndex((x) => x.slug === slug);
      if (i < 0) { root.querySelector(".state").textContent = "Beitrag nicht gefunden."; return; }
      /* Der Feed kommt neueste zuerst. Der Nachbar davor ist also der
         neuere, der danach der aeltere. Bewusst ohne Ringschluss: vom
         neuesten Beitrag auf den aeltesten zu springen waere eine
         Ueberraschung, kein Blaettern. */
      this._paint(posts[i], posts[i - 1] || null, posts[i + 1] || null);
    } catch (err) {
      root.querySelector(".state").textContent = texte(this._sprache).ladefehler;
      console.error(err);
    }
  }

  _paint(p, neuer = null, aelter = null) {
    const root = this.shadowRoot;
    /* Die Beschriftungen muessen hier eigens geholt werden. `t` war bisher
       nur in _render() definiert, wurde unten aber trotzdem benutzt --
       jeder Aufruf warf damit einen ReferenceError, den _render() auffing
       und als "Beitrag konnte nicht geladen werden" anzeigte. Die
       Einzelansicht war dadurch KOMPLETT unbenutzbar, waehrend die Liste
       einwandfrei lief; der Titel im Browsertab stimmte sogar, weil
       document.title eine Zeile vor dem Fehler gesetzt wird. */
    const t = texte(this._sprache);
    const backUrl = this.getAttribute("back-url") || "./";
    const showCredit = this.getAttribute("credit") !== "off";
    document.title = p.title;

    const cover = p.image ? `<img class="cover" src="${esc(p.image)}" alt="" />` : "";
    const eyebrow = p.category ? `<div class="eyebrow">${esc(p.category)}</div>` : "";
    const author = p.author ? `<span>${esc(p.author)}</span><span class="dot">·</span>` : "";
    const tags = (p.tags || []).length
      ? `<div class="tags">${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : "";
    const credit = showCredit ? creditMarkup(this.getAttribute("credit-logo")) : "";
    /* Die Adresse des Nachbarn nach demselben Muster wie in der Liste --
       die Seite kennt nur ?post=<slug>, nicht den Dateinamen. */
    const postUrl = this.getAttribute("post-url") || location.pathname;
    const nachbarUrl = (s) => `${postUrl}${postUrl.includes("?") ? "&" : "?"}post=${encodeURIComponent(s)}`;
    const blatt = (eintrag, richtung, seite) => eintrag
      ? `<a class="blatt blatt--${seite}" href="${esc(nachbarUrl(eintrag.slug))}" rel="${seite === "links" ? "prev" : "next"}">
           <span class="blatt__richtung">${esc(richtung)}</span>
           <span class="blatt__titel">${seite === "links" ? "‹ " : ""}${esc(eintrag.title)}${seite === "rechts" ? " ›" : ""}</span>
         </a>`
      : `<span class="blatt blatt--${seite}"></span>`;
    const umblaettern = (neuer || aelter)
      ? `<nav class="umblaettern" aria-label="${esc(t.alleBeitraege)}">
           ${blatt(neuer, t.neuerer, "links")}
           ${blatt(aelter, t.aelterer, "rechts")}
         </nav>`
      : "";

    root.innerHTML = `<style>${POST_STYLES}</style>
      <div class="wrap">
        <article class="article">
          <a class="back" href="${esc(backUrl)}">← ${esc(t.alleBeitraege)}</a>
          ${cover}
          ${eyebrow}
          <h1 class="title">${esc(p.title)}</h1>
          <div class="meta">${author}<span>${fmtDate(p.date, p.timeZone, this._sprache)}</span><span class="dot">·</span><span>${p.readingMinutes} ${esc(t.lesezeit)}</span>${p.translated === false ? `<span class="dot">·</span><span class="pending">${esc(t.uebersetzungFolgt)}</span>` : ""}</div>
          <div class="body">${p.bodyHtml || ""}</div>
          ${tags}
          ${umblaettern}
          ${credit}
        </article>
      </div>`;
  }
}

/* ----------------------------------------------------------------------------
 * <blog-credit> – Credit-Baustein einzeln (z. B. im Footer)
 * -------------------------------------------------------------------------- */

class BlogCredit extends HTMLElement {
  static get observedAttributes() { return ["credit-logo"]; }
  constructor() { super(); this.attachShadow({ mode: "open" }); }
  connectedCallback() { this._verbunden = true; this._render(); }
  /* Erst ab dem Einhaengen auf Attributaenderungen reagieren. Vorher feuert
     dieser Rueckruf einmal je vorhandenem Attribut -- das waren auf der
     Blogseite vier Durchlaeufe und vier Abrufe desselben Feeds. */
  attributeChangedCallback() { if (this._verbunden) this._render(); }
  _render() {
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .credit { margin-top: 0; padding-top: 0; border-top: none; }
    </style>${creditMarkup(this.getAttribute("credit-logo"))}`;
  }
}

customElements.define("blog-list", BlogList);
customElements.define("blog-post", BlogPost);
customElements.define("blog-credit", BlogCredit);
