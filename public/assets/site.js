/**
 * Kleinkram, den jede Seite braucht. Bewusst winzig gehalten —
 * alles Inhaltliche machen die Kit-Module (Blog, Galerie).
 */

/* Jahreszahl im Fußbereich aktuell halten */
for (const el of document.querySelectorAll("[data-year]")) {
  el.textContent = String(new Date().getFullYear());
}
