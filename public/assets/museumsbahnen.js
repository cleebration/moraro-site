/* Filter für /museumsbahnen – blendet Karten nach Land, Art und Dampf ein und aus. */
const sel = (id) => document.getElementById(id);
const felder = { land: sel("mb-land"), kat: sel("mb-kat"), dampf: sel("mb-dampf") };
const karten = [...document.querySelectorAll(".mb-karte")];
const grid = sel("mb-grid");
const zahl = sel("mb-zahl");

// Hinweis bei 0 Treffern und Knopf zum Zurücksetzen (nur mit JS sinnvoll, daher hier erzeugt)
const leer = document.createElement("p");
leer.className = "mb-leer";
leer.hidden = true;
leer.textContent = "Für diese Auswahl gibt es noch keinen Eintrag. Filter lockern oder fehlende Bahn per E-Mail melden.";
grid?.after(leer);

const reset = document.createElement("button");
reset.type = "button";
reset.className = "mb-reset";
reset.textContent = "Filter zurücksetzen";
reset.hidden = true;
zahl?.after(reset);

function filtern() {
  let n = 0;
  for (const k of karten) {
    const zeigen = Object.entries(felder).every(([key, f]) => !f || !f.value || k.dataset[key] === f.value);
    k.hidden = !zeigen;
    if (zeigen) n++;
  }
  if (zahl) zahl.textContent = n === 1 ? "1 Eintrag" : `${n} Einträge`;
  leer.hidden = n !== 0;
  reset.hidden = !Object.values(felder).some((f) => f?.value);
}
for (const f of Object.values(felder)) f?.addEventListener("change", filtern);
reset.addEventListener("click", () => {
  for (const f of Object.values(felder)) if (f) f.value = "";
  filtern();
});
filtern(); // auch nach "Zurück" im Browser (vorbelegte Auswahl) korrekt zählen
