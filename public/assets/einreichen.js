/* Formular „Melden“ auf /museumsbahnen und /modellbahnanlagen (20.10.2026).
   Öffnet den Dialog (neu oder Änderung, bei „Änderung melden“ an der Karte mit vorgewähltem Eintrag),
   blendet Felder je nach Art ein und sendet an die Redaktion. Dort prüft Chris jede Meldung. */
const dlg = document.getElementById("melden");
const form = dlg?.querySelector("form");
if (dlg && form && typeof dlg.showModal === "function") {
  const meldung = form.querySelector(".melden__meldung");
  const senden = form.querySelector('[type="submit"]');
  let t0 = 0;

  const typ = () => form.elements.typ.value;
  function umschalten() {
    const t = typ();
    for (const el of form.querySelectorAll("[data-nur]")) el.hidden = el.dataset.nur !== t;
    form.elements.eintrag.required = t === "aenderung";
    form.elements.land.required = t === "neu";
    form.elements.link.required = t === "neu";
  }
  function oeffnen(art, id = "") {
    form.reset();
    meldung.textContent = ""; meldung.className = "melden__meldung";
    for (const el of form.querySelectorAll("label, fieldset, .melden__2")) el.hidden = false;
    senden.disabled = false; senden.hidden = false;
    form.querySelector(".melden__fuss [data-melden-zu]").textContent = "Abbrechen";
    form.elements.typ.value = art;
    if (id) {
      form.elements.eintrag.value = id;
      form.elements.titel.value = form.elements.eintrag.selectedOptions[0]?.textContent || "";
    }
    umschalten();
    t0 = Date.now();
    dlg.showModal();
    (id ? form.elements.text : form.elements.titel).focus();
  }

  for (const b of document.querySelectorAll("[data-melden-neu], [data-melden-aendern], [data-melden]")) b.hidden = false;
  document.querySelector(".melden-ohnejs")?.classList.add("melden-ohnejs--klein");
  for (const b of document.querySelectorAll("[data-melden-neu]")) b.addEventListener("click", () => oeffnen("neu"));
  for (const b of document.querySelectorAll("[data-melden-aendern]")) b.addEventListener("click", () => oeffnen("aenderung"));
  for (const b of document.querySelectorAll("[data-melden]")) b.addEventListener("click", () => oeffnen("aenderung", b.dataset.melden));
  for (const b of dlg.querySelectorAll("[data-melden-zu]")) b.addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (ev) => { if (ev.target === dlg) dlg.close(); });
  for (const r of form.elements.typ) r.addEventListener("change", umschalten);
  form.elements.eintrag.addEventListener("change", () => {
    if (!form.elements.titel.value) form.elements.titel.value = form.elements.eintrag.selectedOptions[0]?.textContent || "";
  });

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    meldung.className = "melden__meldung";
    if (!form.checkValidity()) {
      const falsch = form.querySelector(":invalid");
      meldung.textContent = "Bitte die markierten Felder ausfüllen.";
      meldung.classList.add("melden__meldung--fehler");
      falsch?.focus();
      return;
    }
    const f = form.elements;
    const daten = {
      verzeichnis: form.dataset.verzeichnis, typ: typ(), eintrag: f.eintrag.value,
      titel: f.titel.value, land: f.land.value, ort: f.ort.value, kategorie: f.kategorie.value,
      dampf: f.dampf?.value || "", h0: !!f.h0?.checked, adresse: f.adresse.value,
      link: f.link.value, termine: f.termine.value, text: f.text.value, rolle: f.rolle.value,
      name: f.name.value, email: f.email.value, einwilligung: f.einwilligung.checked,
      website: f.website.value, t0
    };
    senden.disabled = true;
    meldung.textContent = "Wird gesendet …";
    try {
      const r = await fetch(form.dataset.api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(daten) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.fehler || "Das Senden hat nicht geklappt.");
      meldung.innerHTML = "";
      const h = document.createElement("strong"); h.textContent = `Danke! Deine Meldung hat die Nummer ${j.nummer}.`;
      meldung.append(h, document.createElement("br"), "Ich prüfe sie auf der offiziellen Seite und melde mich bei Rückfragen per E-Mail von hallo@moraro.world.");
      meldung.classList.add("melden__meldung--ok");
      for (const el of form.querySelectorAll("label, fieldset, .melden__2")) el.hidden = true;
      senden.hidden = true;
      form.querySelector(".melden__fuss [data-melden-zu]").textContent = "Schließen";
    } catch (err) {
      meldung.textContent = `${err.message} Alternativ per E-Mail an hallo@moraro.world.`;
      meldung.classList.add("melden__meldung--fehler");
      senden.disabled = false;
    }
  });
  dlg.addEventListener("close", () => { senden.hidden = false; });
}
