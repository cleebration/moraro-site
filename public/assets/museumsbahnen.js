/* Filter für /museumsbahnen – blendet Karten nach Land, Art und Dampf ein und aus. */
const sel = (id) => document.getElementById(id);
const felder = { land: sel("mb-land"), kat: sel("mb-kat"), dampf: sel("mb-dampf") };
const karten = [...document.querySelectorAll(".mb-karte")];
function filtern() {
  let n = 0;
  for (const k of karten) {
    const zeigen = Object.entries(felder).every(([key, f]) => !f || !f.value || k.dataset[key] === f.value);
    k.hidden = !zeigen;
    if (zeigen) n++;
  }
  const z = sel("mb-zahl");
  if (z) z.textContent = n === 1 ? "1 Eintrag" : `${n} Einträge`;
}
for (const f of Object.values(felder)) f?.addEventListener("change", filtern);
