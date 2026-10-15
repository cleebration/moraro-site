/* ============================================================
   <cleebration-credit>  ·  Web Component (Shadow DOM)
   ------------------------------------------------------------
   Einbau:
     <script type="module" src="cleebration-credit.js"></script>
     <cleebration-credit></cleebration-credit>

   Optionale Attribute:
     logo="pfad/zu/cleebration-logo.png"   (Default: cleebration-logo.png)
     label="Ein Kunstprojekt von"          (Text anpassbar)
   ============================================================ */

class CleebrationCredit extends HTMLElement {
  connectedCallback() {
    const logo  = this.getAttribute('logo')  || 'cleebration-logo.png';
    const label = this.getAttribute('label') || 'Ein Kunstprojekt von';
    const root  = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { display: inline-block; }
        a {
          display: inline-flex; align-items: center; gap: .6em;
          text-decoration: none; color: inherit;
          font: 500 .9rem/1 system-ui, -apple-system, "Segoe UI", sans-serif;
          opacity: .9; transition: opacity .2s ease;
        }
        a:hover { opacity: 1; }
        span { white-space: nowrap; }
        img  { height: 1.9em; width: auto; display: block; }
      </style>
      <a href="https://www.cleebration.com" target="_blank" rel="noopener"
         aria-label="${label} cleebration">
        <span>${label}</span>
        <img src="${logo}" alt="cleebration" />
      </a>`;
  }
}
customElements.define('cleebration-credit', CleebrationCredit);
