// cleebration Markenspiel (weichensteller) – eine Datei, keine Abhängigkeiten. Claude, Chat MyProj Eggstra, 08.11.2026.
const lies = (k, f) => { try { const v = localStorage.getItem(k); return v == null ? f : JSON.parse(v) } catch { return f } };
const schreib = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
const mischen = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a };
let actx = null;
function audio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch { actx = null } return actx }
function ton(f, dauer = .15, typ = 'triangle', laut = .2, wann = 0) {
  const a = audio(); if (!a) return;
  const t = a.currentTime + wann, o = a.createOscillator(), g = a.createGain();
  o.type = typ; o.frequency.value = f; g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(.0001, t + dauer);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dauer + .02);
}
const $ = (s, el = document) => el.querySelector(s);
const CSS = `
.sp{background:var(--sp-bg,#16131F);color:var(--sp-ink,#F5F2FF);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;font-family:var(--sp-font-body,system-ui,sans-serif);max-width:760px;margin:0 auto;min-height:380px}
.sp-hud{display:flex;flex-wrap:wrap;gap:8px;font-size:.88rem}
.sp-hud span{background:rgba(255,255,255,.1);padding:4px 10px;border-radius:8px;font-variant-numeric:tabular-nums}
.sp-mitte{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center}
.sp-hinweis{font-size:.88rem;opacity:.75;margin:0}
.sp-btn{font:700 1rem var(--sp-font-body,system-ui,sans-serif);border:0;border-radius:12px;padding:11px 20px;cursor:pointer;background:var(--sp-akzent,#E8443A);color:var(--sp-akzent-ink,#fff)}
.sp-btn:focus-visible,.sp button:focus-visible{outline:3px solid var(--sp-akzent2,#F2A30E);outline-offset:2px}
.sp canvas{display:block;width:100%;height:auto;border-radius:12px;touch-action:manipulation;user-select:none;-webkit-user-select:none;max-width:100%}
.sp-gross{font-family:var(--sp-font-display,inherit);font-size:clamp(1.3rem,5vw,2rem);line-height:1.15}
@media(prefers-reduced-motion:reduce){.sp *{transition:none!important;animation:none!important}}
`;
function stil(extra = '') {
  if (!document.getElementById('sp-stil')) { const s = document.createElement('style'); s.id = 'sp-stil'; s.textContent = CSS; document.head.appendChild(s) }
  if (extra) { const s = document.createElement('style'); s.textContent = extra; document.head.appendChild(s) }
}
function leinwand(cv, w, h) { const c = cv.getContext('2d'); if (!c) return null; const d = Math.min(devicePixelRatio || 1, 2); cv.width = w * d; cv.height = h * d; c.scale(d, d); if (!c.roundRect) c.roundRect = function (x, y, ww, hh) { this.rect(x, y, ww, hh) }; return c }
// MoRaRo – Weichensteller: Gleisstücke drehen, bis der Zug vom grünen zum roten Bahnhof durchkommt.
const N = 1, E = 2, S = 4, W = 8;
const rot = m => ((m << 1) | (m >> 3)) & 15;
const gegen = { 1: 4, 2: 8, 4: 1, 8: 2 };
const schritt = { 1: [-1, 0], 2: [0, 1], 4: [1, 0], 8: [0, -1] };
export function mount(root) {
  stil(`.gl-feld{display:grid;gap:4px;width:100%;max-width:540px;margin:0 auto}
.gl-feld button{aspect-ratio:1;max-width:100%;padding:0;border:0;border-radius:6px;background:rgba(255,255,255,.07);cursor:pointer;transition:transform .15s}
.gl-feld button:active{transform:scale(.94)}.gl-feld svg{display:block;width:100%;height:100%}`);
  root.classList.add('sp');
  const B = 6, H = 5;
  let feld, startR, zielR, zuege, level = 1, rek = lies('moraro-weichen-geschafft', 0), fertig = false;
  function neu() {
    startR = Math.floor(Math.random() * H);
    let r = startR, c = 0; const pfad = [[r, c]]; const besucht = new Set([r + ',' + c]);
    while (c < B - 1) {
      const m = [[r, c + 1], [r, c + 1]];
      if (r > 0 && !besucht.has((r - 1) + ',' + c)) m.push([r - 1, c]);
      if (r < H - 1 && !besucht.has((r + 1) + ',' + c)) m.push([r + 1, c]);
      [r, c] = m[Math.floor(Math.random() * m.length)]; besucht.add(r + ',' + c); pfad.push([r, c]);
    }
    zielR = r;
    feld = Array.from({ length: H }, () => Array.from({ length: B }, () => (Math.random() < .5 ? N | S : N | E)));
    pfad.forEach(([pr, pc], k) => {
      const vor = k === 0 ? [pr, pc - 1] : pfad[k - 1], nach = k === pfad.length - 1 ? [pr, pc + 1] : pfad[k + 1];
      const ri = ([ar, ac]) => ar < pr ? N : ar > pr ? S : ac > pc ? E : W;
      feld[pr][pc] = ri(vor) | ri(nach);
    });
    for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) { let m = feld[y][x]; for (let k = 1 + Math.floor(Math.random() * 3); k > 0; k--) m = rot(m); feld[y][x] = m }
    zuege = 0; fertig = false;
  }
  function verbunden() {
    const ok = new Set(), q = [];
    if (feld[startR][0] & W) { q.push([startR, 0]); ok.add(startR + ',0') }
    while (q.length) {
      const [r, c] = q.shift();
      for (const d of [N, E, S, W]) {
        if (!(feld[r][c] & d)) continue;
        const [dr, dc] = schritt[d], nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= H || nc < 0 || nc >= B || !(feld[nr][nc] & gegen[d]) || ok.has(nr + ',' + nc)) continue;
        ok.add(nr + ',' + nc); q.push([nr, nc]);
      }
    }
    return ok;
  }
  const geloest = (ok) => ok.has(zielR + ',' + (B - 1)) && (feld[zielR][B - 1] & E);
  function kachel(m, an, r, c) {
    const f = an ? 'var(--sp-akzent2,#C9A24A)' : 'rgba(255,255,255,.45)';
    let s;
    if (m === (N | S) || m === (E | W)) {
      const p = { 1: [50, 0], 2: [100, 50], 4: [50, 100], 8: [0, 50] };
      s = [N, E, S, W].filter(d => m & d).map(d => `<line x1="50" y1="50" x2="${p[d][0]}" y2="${p[d][1]}" stroke="${f}" stroke-width="14" stroke-linecap="round"/>`).join('');
    } else {
      const e = { 3: ['50,0', '100,50'], 6: ['100,50', '50,100'], 12: ['50,100', '0,50'], 9: ['0,50', '50,0'] }[m];
      s = `<path d="M${e[0]} Q50,50 ${e[1]}" fill="none" stroke="${f}" stroke-width="14" stroke-linecap="round"/>`;
    }
    const st = (c === 0 && r === startR) ? '<rect x="0" y="36" width="10" height="28" fill="#2E9E5B"/>' : (c === B - 1 && r === zielR) ? '<rect x="90" y="36" width="10" height="28" fill="var(--sp-akzent,#B3261E)"/>' : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}${st}</svg>`;
  }
  function zeichne() {
    const ok = verbunden(); fertig = geloest(ok);
    root.innerHTML = `<div class="sp-hud"><span>Strecke ${level}</span><span>Züge ${zuege}</span><span>Geschafft ${rek}</span></div>
      <div class="sp-mitte"><div class="gl-feld" style="grid-template-columns:repeat(${B},1fr)">
      ${feld.map((z, r) => z.map((m, c) => `<button type="button" data-r="${r}" data-c="${c}" aria-label="Gleis Reihe ${r + 1}, Spalte ${c + 1} drehen">${kachel(m, ok.has(r + ',' + c), r, c)}</button>`).join('')).join('')}</div>
      ${fertig ? `<p class="sp-gross">Freie Fahrt!</p><p class="sp-hinweis">In ${zuege} Zügen gestellt.</p><button class="sp-btn" data-weiter>Nächste Strecke</button>`
               : '<p class="sp-hinweis">Tippe Gleise an, um sie zu drehen. Verbinde den grünen Bahnhof links mit dem roten rechts.</p>'}</div>`;
    root.querySelectorAll('.gl-feld button').forEach(b => b.onclick = () => {
      if (fertig) return;
      feld[+b.dataset.r][+b.dataset.c] = rot(feld[+b.dataset.r][+b.dataset.c]); zuege++; ton(520, .06, 'square', .05);
      zeichne();
      if (fertig) { rek++; schreib('moraro-weichen-geschafft', rek); [523, 659, 784].forEach((f, k) => ton(f, .2, 'triangle', .15, k * .1)); zeichne() }
    });
    const w = $('[data-weiter]', root); if (w) w.onclick = () => { level++; neu(); zeichne() };
  }
  neu(); while (geloest(verbunden())) neu(); zeichne();
  return () => {};
}
