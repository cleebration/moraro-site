/*
 * site-i18n.js
 * Wiederverwendbare Mehrsprachigkeits-Schicht fuer statische Sites (eine URL,
 * Client-Umschalter). Steuert NAVIGATION/Oberflaechen-Texte. Die Inhalts-Module
 * (event-list usw.) lesen die aktive Sprache von hier und ziehen den passenden Feed.
 *
 * Zwei Dinge in einer Datei:
 *   1) window.SiteI18n  – kleine Laufzeit (Sprache erkennen/merken, Texte tauschen)
 *   2) <lang-switcher>  – einbettbarer Sprachumschalter (Shadow DOM, themebar)
 *
 * Grundprinzip:
 *   - Sprachen werden EINMAL beim Init deklariert (locales + defaultLocale).
 *   - Eine neue Sprache spaeter = einen Code zu `locales` ergaenzen + ein
 *     Woerterbuch /i18n/<code>.json anlegen. Fehlende Texte fallen automatisch
 *     auf die Standardsprache zurueck.
 *   - Beim Sprachwechsel wird ein Event `i18n:change` ausgeloest, auf das alle
 *     Inhalts-Module hoeren und neu rendern.
 *
 * Einbinden (im <head> oder vor </body>):
 *   <script type="module">
 *     import "/site-i18n.js";
 *     await SiteI18n.init({
 *       locales: ["de", "en"],      // erste = Standard, wenn defaultLocale fehlt
 *       defaultLocale: "de",
 *       dictPath: "/i18n"           // erwartet /i18n/de.json, /i18n/en.json
 *       // alternativ: messages: { de: {...}, en: {...} }  (ohne Datei-Fetch)
 *     });
 *   </script>
 *
 * Navigation uebersetzen (in DEINER bestehenden Navigation):
 *   <a href="/events" data-i18n="nav.events">Veranstaltungen</a>
 *   <input data-i18n-attr="placeholder:search.placeholder">
 *   <lang-switcher></lang-switcher>
 *
 * Laengere Fliesstexte (statt Woerterbuch-Schluessel):
 *   <div data-lang="de"><p>…</p></div>
 *   <div data-lang="en"><p>…</p></div>
 *   Sichtbar ist genau einer; fehlt die aktive Sprache, greift die Standardsprache.
 */

const STORAGE_KEY = "site-lang";

/* Aufloesen von SiteI18n.ready — siehe dort. */
let bereitAufloesen;

const SiteI18n = {
  locales: ["de"],
  defaultLocale: "de",
  messages: {},          // { de: {flachgemachtes dict}, en: {...} }
  _ready: null,
  lang: "de",

  /**
   * Versprechen, das aufloest, sobald init() durch ist.
   *
   * Die Anzeige-Module warten darauf, bevor sie das erste Mal zeichnen —
   * sonst holen sie den Feed der Standardsprache und gleich darauf den der
   * wirklichen. Auf einer Seite ohne SiteI18n gibt es das Versprechen nicht,
   * und die Module zeichnen sofort; genau so soll es dort sein.
   */
  ready: null,
  autoDetect: true,      // Browsersprache auswerten? Siehe init({ autoDetect })

  /**
   * Initialisiert die Schicht. Ruft (optional) Woerterbuecher ab, erkennt die
   * Sprache, setzt <html lang> und uebersetzt die Seite einmalig.
   */
  async init(opts = {}) {
    this.locales = (opts.locales && opts.locales.length) ? opts.locales : ["de"];
    this.defaultLocale = opts.defaultLocale && this.locales.includes(opts.defaultLocale)
      ? opts.defaultLocale
      : this.locales[0];

    /* autoDetect: false heisst "Standardsprache zeigen, bis jemand umschaltet".
       Sinnvoll, solange die Inhalte nur in einer Sprache vorliegen — sonst
       bekaeme ein englischer Browser englische Bedienung zu deutschen Texten.
       Eine einmal getroffene Wahl des Besuchers gilt in beiden Faellen weiter. */
    this.autoDetect = opts.autoDetect !== false;

    if (opts.messages) {
      // Woerterbuecher inline uebergeben (kein Fetch noetig, gut fuer file://-Demos)
      for (const [code, dict] of Object.entries(opts.messages)) {
        this.messages[code] = flatten(dict);
      }
    } else if (opts.dictPath) {
      await Promise.all(this.locales.map(async (code) => {
        try {
          const res = await fetch(`${opts.dictPath.replace(/\/$/, "")}/${code}.json`);
          if (res.ok) this.messages[code] = flatten(await res.json());
          else this.messages[code] = {};
        } catch {
          this.messages[code] = {};
        }
      }));
    }

    this.lang = this._detect();
    this._apply();           // <html lang>, DOM-Texte, Event

    // Ab hier steht die Sprache fest — die Module duerfen zeichnen.
    if (bereitAufloesen) { bereitAufloesen(this); bereitAufloesen = null; }
    return this;
  },

  /** Reihenfolge: gespeicherte Wahl -> Browsersprache -> Standardsprache.
      Mit autoDetect: false entfaellt der mittlere Schritt. */
  _detect() {
    const stored = safeGet(STORAGE_KEY);
    if (stored && this.locales.includes(stored)) return stored;

    if (!this.autoDetect) return this.defaultLocale;

    const navLangs = (navigator.languages || [navigator.language || ""])
      .map((l) => l.toLowerCase().split("-")[0]);
    const match = navLangs.find((l) => this.locales.includes(l));
    if (match) return match;

    return this.defaultLocale;
  },

  /** Sprache wechseln: merken, anwenden, alle Module benachrichtigen. */
  setLang(code) {
    if (!this.locales.includes(code) || code === this.lang) {
      if (code === this.lang) return;            // nichts zu tun
      console.warn(`[SiteI18n] Unbekannte Sprache "${code}" – ignoriert.`);
      return;
    }
    this.lang = code;
    safeSet(STORAGE_KEY, code);
    this._apply();
  },

  /** Text nachschlagen, mit Rueckfall auf Standardsprache, dann auf den Key selbst. */
  t(key, vars) {
    const here = this.messages[this.lang] || {};
    const base = this.messages[this.defaultLocale] || {};
    let str = (key in here) ? here[key] : (key in base ? base[key] : key);
    if (vars) for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return str;
  },

  /** Komfort: Callback bei Sprachwechsel registrieren. Gibt Abmeldefunktion zurueck. */
  onChange(fn) {
    const handler = (e) => fn(e.detail.lang);
    document.addEventListener("i18n:change", handler);
    return () => document.removeEventListener("i18n:change", handler);
  },

  _apply() {
    document.documentElement.setAttribute("lang", this.lang);

    // Textinhalte: <x data-i18n="key">...</x>
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = this.t(key);
    });

    // Attribute: <x data-i18n-attr="placeholder:key, title:key2">
    document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, this.t(key));
      });
    });

    this._applyBlocks();

    // Module/Komponenten benachrichtigen
    document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: this.lang } }));
  }
};

/**
 * Sprachbloecke im Markup: <div data-lang="de">…</div><div data-lang="en">…</div>
 *
 * Fuer laengere Fliesstexte, die als Absatz gepflegt werden wollen und nicht
 * als Schluessel in einer JSON-Datei. Sichtbar ist genau ein Block je Gruppe;
 * Gruppe heisst: alle data-lang-Kinder desselben Elternelements.
 *
 * Fehlt der Block fuer die aktive Sprache, wird der der Standardsprache
 * gezeigt -- lieber der deutsche Absatz als gar keiner. Passt auch die nicht,
 * bleibt der erste Block stehen.
 *
 * `hidden` statt display:none, damit Vorleseprogramme und die Suche im
 * Browser den unsichtbaren Text nicht mitlesen.
 */
SiteI18n._applyBlocks = function () {
  const bloecke = document.querySelectorAll("[data-lang]");
  if (!bloecke.length) return;

  const gruppen = new Map();
  bloecke.forEach((el) => {
    const eltern = el.parentElement || document.body;
    if (!gruppen.has(eltern)) gruppen.set(eltern, []);
    gruppen.get(eltern).push(el);
  });

  const passt = (el, code) => {
    const wert = String(el.getAttribute("data-lang") || "").toLowerCase();
    return wert === code || wert.split("-")[0] === String(code).split("-")[0];
  };

  for (const geschwister of gruppen.values()) {
    let sichtbar = geschwister.filter((el) => passt(el, this.lang));
    if (!sichtbar.length) sichtbar = geschwister.filter((el) => passt(el, this.defaultLocale));
    if (!sichtbar.length) sichtbar = [geschwister[0]];

    geschwister.forEach((el) => {
      const zeigen = sichtbar.includes(el);
      el.hidden = !zeigen;
      if (zeigen) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
    });
  }
};

/* Verschachteltes Dict -> flache Keys: {nav:{events:"…"}} -> {"nav.events":"…"} */
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignorieren */ } }

SiteI18n.ready = new Promise((aufloesen) => { bereitAufloesen = aufloesen; });

window.SiteI18n = SiteI18n;

/* ---------------------------------------------------------------------------
 * <lang-switcher>  – Sprachumschalter zum Einbetten
 *
 *   <lang-switcher></lang-switcher>                 (Buttons, Standard)
 *   <lang-switcher variant="select"></lang-switcher> (Liste — skaliert mit
 *                                                     der Zahl der Sprachen)
 *   <lang-switcher labels="de:Deutsch,en:English"></lang-switcher> (eigene Beschriftung)
 *
 * Themen ueber CSS-Variablen (auf :host oder einem Vorfahren setzen):
 *   --li18n-text, --li18n-muted, --li18n-accent, --li18n-accent-contrast,
 *   --li18n-border, --li18n-radius, --li18n-font, --li18n-gap
 * ------------------------------------------------------------------------- */
/* Kurzform für die Knopf-Variante. Nur ein Rückfall: normalerweise reicht der
   Sprachcode in Großbuchstaben. */
const KURZ = { de: "DE", en: "EN", fr: "FR", it: "IT", es: "ES" };

/* Notnagel für die Listen-Variante, falls der Browser kein Intl.DisplayNames
   hat oder die Sprache nicht kennt. Bewusst kurz gehalten — die Namen kommen
   im Normalfall vom Browser, nicht von hier. */
const NAMEN = {
  de: "Deutsch", en: "English", fr: "Français", it: "Italiano",
  es: "Español", nl: "Nederlands", pl: "Polski", cs: "Čeština"
};

/**
 * Der Name einer Sprache IN DIESER Sprache — "Deutsch", nicht "German".
 *
 * So erkennt ein französischer Gast "Français", auch wenn die Seite gerade
 * auf Deutsch steht. Das ist der Grund, warum Sprachmenüs das überall so
 * machen.
 *
 * Intl.DisplayNames kennt jeden gängigen Sprachcode, deshalb braucht eine
 * neue Sprache hier keinen Eintrag. Die Tabelle oben ist nur der Rückfall.
 */
function spracheName(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    // Manche Sprachen schreiben ihren Namen klein ("français"); in einem Menü
    // sieht das nach Fehler aus.
    if (name && name.toLowerCase() !== String(code).toLowerCase()) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  } catch { /* alter Browser oder unbekannter Code — unten weiter */ }
  return NAMEN[code] || NAMEN[String(code).split("-")[0]] || String(code).toUpperCase();
}

const SWITCHER_STYLE = `
  :host {
    --li18n-text: #1a1a1a;
    --li18n-muted: #6b6b6b;
    --li18n-accent: #1a1a1a;
    --li18n-accent-contrast: #ffffff;
    --li18n-border: #d8d4cc;
    --li18n-radius: 4px;
    --li18n-gap: .25rem;
    --li18n-font: inherit;
    display: inline-block;
    font-family: var(--li18n-font);
  }
  .group { display: inline-flex; gap: var(--li18n-gap); align-items: center; }
  button {
    font: inherit;
    cursor: pointer;
    color: var(--li18n-muted);
    background: transparent;
    border: 1px solid var(--li18n-border);
    border-radius: var(--li18n-radius);
    padding: .25rem .55rem;
    line-height: 1.2;
    transition: color .15s ease, background .15s ease, border-color .15s ease;
  }
  button:hover { color: var(--li18n-text); border-color: var(--li18n-text); }
  button[aria-current="true"] {
    color: var(--li18n-accent-contrast);
    background: var(--li18n-accent);
    border-color: var(--li18n-accent);
  }
  button:focus-visible { outline: 3px solid var(--li18n-accent); outline-offset: 2px; }
  select {
    font: inherit;
    color: var(--li18n-text);
    background: transparent;
    border: 1px solid var(--li18n-border);
    border-radius: var(--li18n-radius);
    padding: .3rem .6rem;
    cursor: pointer;
    max-width: 12rem;
    transition: color .15s ease, border-color .15s ease;
  }
  select:hover { color: var(--li18n-text); border-color: var(--li18n-text); }
  select:focus-visible { outline: 3px solid var(--li18n-accent); outline-offset: 2px; }
  /* Die Klappliste selbst zeichnet das Betriebssystem; nur die Einträge
     bekommen lesbare Farben, falls die Seite dunkel ist. */
  option { color: #1a1a1a; background: #ffffff; }
`;

class LangSwitcher extends HTMLElement {
  connectedCallback() {
    this._root = this.attachShadow({ mode: "open" });
    this._unsub = (window.SiteI18n ? SiteI18n.onChange(() => this._mark()) : () => {});
    // Falls SiteI18n erst nach diesem Element initialisiert wird, kurz abwarten.
    // PATCH cleebration (siehe site/README.md): vorher wurde hier auf
    // SiteI18n.locales.length geprüft. Das ist beim Import schon erfüllt
    // (Vorbelegung ["de"]), weshalb der Umschalter nur die Standardsprache
    // zeichnete. Maßgeblich ist, ob init() die Wörterbücher geladen hat.
    if (window.SiteI18n && SiteI18n.messages && Object.keys(SiteI18n.messages).length) this._render();
    else this._whenReady();
  }
  disconnectedCallback() { this._unsub && this._unsub(); }

  /* Warten, bis init() durch ist — aber hoechstens zwei Sekunden. Ruft eine
     Seite init() gar nicht auf, soll der Umschalter trotzdem erscheinen,
     wenn auch nur mit der Standardsprache.

     (Vorher wurde hier auf gefuellte Woerterbuecher gepollt. Das ging schief,
     sobald eine Seite init() ohne Woerterbuecher aufruft: `messages` blieb
     leer, und der Umschalter wartete die vollen zwei Sekunden ab.) */
  _whenReady() {
    const notausgang = new Promise((r) => setTimeout(r, 2000));
    Promise.race([window.SiteI18n?.ready ?? notausgang, notausgang])
      .then(() => this._render());
  }

  /**
   * Beschriftung je Sprachcode.
   *
   * Reihenfolge: eigenes labels-Attribut → je nach Variante der volle Name
   * oder das Kürzel. Die Liste bekommt den vollen Namen, weil "Deutsch"
   * verständlicher ist als "DE"; die Knöpfe das Kürzel, weil dort der Platz
   * fehlt.
   */
  _labels(variant) {
    const custom = {};
    const attr = this.getAttribute("labels");
    if (attr) attr.split(",").forEach((p) => {
      const [c, l] = p.split(":").map((s) => s.trim());
      if (c && l) custom[c] = l;
    });
    return (code) => {
      if (custom[code]) return custom[code];
      if (variant === "select") return spracheName(code);
      return KURZ[code] || String(code).toUpperCase();
    };
  }

  /** Beschriftung des Bedienelements, übersetzt wenn möglich. */
  _ariaLabel() {
    const i = window.SiteI18n;
    if (i && typeof i.t === "function") {
      const s = i.t("a11y.language");
      if (s && s !== "a11y.language") return s;
    }
    return "Sprache / Language";
  }

  _render() {
    const i = window.SiteI18n;
    const locales = (i && i.locales) || ["de"];
    const variant = this.getAttribute("variant") === "select" ? "select" : "buttons";
    const label = this._labels(variant);

    if (variant === "select") {
      this._root.innerHTML = `<style>${SWITCHER_STYLE}</style>
        <select aria-label="${this._ariaLabel()}">
          ${locales.map((c) => `<option value="${c}">${label(c)}</option>`).join("")}
        </select>`;
      const sel = this._root.querySelector("select");
      sel.value = i ? i.lang : locales[0];
      sel.addEventListener("change", () => i && i.setLang(sel.value));
    } else {
      this._root.innerHTML = `<style>${SWITCHER_STYLE}</style>
        <div class="group" role="group" aria-label="${this._ariaLabel()}">
          ${locales.map((c) => `<button type="button" data-code="${c}">${label(c)}</button>`).join("")}
        </div>`;
      this._root.querySelectorAll("button").forEach((b) =>
        b.addEventListener("click", () => i && i.setLang(b.dataset.code)));
    }
    this._mark();
  }

  _mark() {
    const cur = window.SiteI18n ? SiteI18n.lang : null;

    // Die Beschriftung des Bedienelements steht in der aktiven Sprache und
    // muss beim Wechsel mitziehen.
    const beschriftung = this._ariaLabel();
    const gruppe = this._root.querySelector(".group");
    if (gruppe) gruppe.setAttribute("aria-label", beschriftung);
    const liste = this._root.querySelector("select");
    if (liste) liste.setAttribute("aria-label", beschriftung);
    this._root.querySelectorAll("button").forEach((b) =>
      b.setAttribute("aria-current", String(b.dataset.code === cur)));
    const sel = this._root.querySelector("select");
    if (sel && cur) sel.value = cur;
  }
}
customElements.define("lang-switcher", LangSwitcher);

export default SiteI18n;
