# moraro-site — moraro.world

Website **MoRaRo – ModelRailRoad in H0**: Chris’ fiktive H0-Anlage (Märklin K-Gleis, 400 × 200 cm,
3 Ebenen), sein rollendes Material und Fahrten mit historischen Dampflokbahnen.
Gebaut wie klangerie-site / babowalls.com: ein kleines Node-Skript setzt die Seiten aus Bausteinen
zusammen, Beiträge und Fotos/Videos kommen zur Laufzeit aus **zwei Feeds der cleebration-Hubs**
(`sites: [moraro]`). Angelegt 15.10.2026 (Claude, Projekt „MyProj MoRaRo“).
Marke: Branding-Kit v1, `1! claude/04 Templates/Branding/MoRaRo` (README + BRAND_GUIDE.html).

| Adresse | Inhalt | Quelle |
|---|---|---|
| `/` | Plakette, „Drei Gleise“ (Anlage, Fahrzeuge, Dampflokbahnen), Steckbrief, neueste Beiträge, Galerie-Auszug | Blog- + Gallery-Hub |
| `/anlage` | Plan, Steckbrief, Bereiche, Baubericht (Blog-Tag `anlage`), Fotos (Galerie `moraro-anlage`) | hier + Hubs |
| `/fahrzeuge` · `/fahrzeug?fahrzeug=<slug>` | Loks und Wagen mit Steckbrief | Galerie `moraro-fahrzeuge` |
| `/dampflokbahnen` · `/fahrt?fahrt=<slug>` | je Fahrt Bildstrecke/Video, Berichte (Blog-Tag `dampflokbahn`) | Galerie `moraro-dampflokbahnen` + Blog |
| `/blog` · `/post?post=<slug>` | Baubericht und Neuigkeiten | Blog-Hub |
| `/galerie` · `/bild?bild=<slug>` | alle Fotos und Videos | Gallery-Hub |
| `/impressum` · `/datenschutz` | Medieninhaber Chris H. Leeb | hier |

Solange der Hub für `moraro` noch nichts hat (404), zeigen die Module „Keine Beiträge gefunden.“ /
„Noch keine Medien.“ (PATCH klangerie im Blog-, PATCH moraro im Galerie-Modul).

## Inhalte pflegen

Im **Cockpit (Redaktion)**: Zeile „MoRaRo“ (Key `moraro`, Blog + Galerie).
* Blog: Beitrag mit Website „MoRaRo“; Tag `anlage` → erscheint auch auf /anlage, Tag `dampflokbahn` → auf /dampflokbahnen.
* Galerie: Eintrag in `moraro-fahrzeuge`, `moraro-dampflokbahnen` oder `moraro-anlage`.
  Bildstrecke = mehrere Bilder (`images`), Video = YouTube-/Vimeo-Link. Tags als Filter
  (z. B. `dampflok`, `diesellok`, `elok`, `wagen`, Länder wie `usa`, `oesterreich`).

## Befehle

```bash
npm install
npm test             # baut und prüft Weiterleitungen, Module, Seiten (Platzhalter, Menü, Assets, Feeds, „H0“)
npm run preflight    # vor dem Livegang: Feeds erreichbar? Bilder da?
npm run deploy       # baut und lädt zu Cloudflare (moraro-site.<konto>.workers.dev)
```

## Domain (Schritt 2)

moraro.world liegt bei GoDaddy (DNS dort, bisher keine Website). Zone in Cloudflare anlegen,
Nameserver bei GoDaddy umstellen, dann `routes` in `wrangler.jsonc` einkommentieren und
`npm run deploy`. Postfach `hallo@moraro.world`: moraro.world als sekundäre Domain im Workspace
cleebration.com (Tool Baukasten, „Mail für Projekt-Domains“) – bis dahin kommt dort keine Post an.

## Schriften & Logo

* `public/assets/fonts/` – Oswald, Barlow, IBM Plex Mono (OFL, @fontsource 5.3.0), vom eigenen Server.
* `public/assets/img/` – Logo quer (dunkel/hell), Plakette, Bildmarke, Favicons, OG-Bild – aus dem Branding-Kit.
* Gleisband als Trenner: `{{GLEIS}}` in build.mjs (reines CSS, `.gleis`).
* Schreibweise immer **H0** mit normaler Null (prüft `test/pages.test.mjs`).
