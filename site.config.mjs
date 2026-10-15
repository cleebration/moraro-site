/**
 * Zentrale Konfiguration der Website moraro.world („MoRaRo – ModelRailRoad in H0“).
 * Abgeleitet von klangerie-site / babowalls-site (gleiche Kits, gleicher Aufbau).
 * Angelegt 15.10.2026 (Claude, Projekt „MyProj MoRaRo“).
 * Branding: 1! claude/04 Templates/Branding/MoRaRo (Kit v1, 15.10.2026).
 */
export default {
  // Kanonischer Name ohne www. Der Worker führt www.moraro.world dorthin.
  // Domain liegt bei GoDaddy (Domain-Übersicht, Tool Baukasten) – noch ohne Website.
  siteUrl: "https://moraro.world",
  canonicalHost: "moraro.world",

  // Oswald (Überschriften), Barlow (Text), IBM Plex Mono (technische Daten) –
  // vom eigenen Server, keine Verbindung zu Google Fonts.
  fonts: { selfHost: true },

  // Vorerst nur Deutsch (Englisch lässt sich später wie bei klangerie.at ergänzen:
  // locales erweitern, public/assets/i18n/en.json, data-lang-Blöcke).
  locales: ["de"],
  defaultLocale: "de",
  autoDetectLanguage: false,

  /* Kein eigener Hub: Beiträge und Fotos/Videos liegen in den cleebration-Hubs
     und tragen dort `sites: [moraro]`. Gepflegt im Cockpit (Redaktion).
     Solange es noch keinen Eintrag gibt, liefert der Hub 404 – die Module
     zeigen dann „Noch keine …“ (PATCH klangerie im Blog-, PATCH moraro im Galerie-Modul). */
  feeds: {
    blog:    "https://cleebration-blog-hub.vercel.app/feed/sites/moraro.{lang}.json",
    gallery: "https://cleebration-gallery-hub.vercel.app/feed/sites/moraro.{lang}.json"
  },

  // Galerien im Gallery-Hub (galleries.config.js), je Bereich der Website eine.
  galleries: {
    anlage:         "moraro-anlage",
    fahrzeuge:      "moraro-fahrzeuge",
    dampflokbahnen: "moraro-dampflokbahnen"
  },

  images: {
    logo:     "/assets/img/moraro-logo-quer-dunkel.svg",
    plakette: "/assets/img/moraro-plakette.svg",
    og:       "/assets/img/og-moraro.png"
  },

  // Postfach: moraro.world als sekundäre Domain im Workspace cleebration.com
  // (Regel Tool Baukasten, „Mail für Projekt-Domains“). NOCH EINZURICHTEN –
  // bis dahin kommt hier keine Post an. Von Chris zu bestätigen.
  mail: "hallo@moraro.world"
};
