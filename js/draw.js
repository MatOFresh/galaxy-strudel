// draw.js — Studio Dessin : on dessine sur l'écran, le tracé devient un motif.
// L'axe X = le temps (colonnes/pas), l'axe Y = la hauteur (aigu en haut).
// « Rythme » mappe le tracé sur les percussions, « Mélodie » sur les notes.
// Le résultat est volontairement un peu aléatoire (curseur « Aléa »).
import { el, slider, toast } from './ui.js';
import { icon } from './icons.js';

// openDrawStudio(cfg, onApply)
//   cfg    = { steps }
//   onApply({ kind:'rythme'|'melo', steps, cols, rnd })
//     cols = tableau longueur steps ; chaque case = y moyen (0 haut .. 1 bas) ou null.
export function openDrawStudio(cfg, onApply) {
  const steps = cfg.steps || 16;
  let kind = 'rythme';
  let rnd = 0.35;
  const pts = [];          // points normalisés { x:0..1, y:0..1 }

  const overlay = el('div', 'kz-modal-overlay');
  const modal = el('div', 'kz-modal small kz-draw');
  const head = el('div', 'kz-modal-head');
  const h2 = el('h2'); h2.innerHTML = `<span class="kz-h2-ic">${icon('pencil')}</span>Studio Dessin`;
  const close = el('button', 'kz-close'); close.innerHTML = icon('close');
  close.addEventListener('click', () => overlay.remove());
  head.append(h2, close);
  modal.append(head);

  const body = el('div', 'kz-draw-body');
  modal.append(body);

  // Choix Rythme / Mélodie
  const seg = el('div', 'kz-draw-seg');
  const segBtns = {};
  [['rythme', 'kick', 'Rythme'], ['melo', 'synth', 'Mélodie']].forEach(([v, ic, lbl]) => {
    const b = el('button', 'kz-draw-segbtn' + (kind === v ? ' on' : ''));
    b.innerHTML = `${icon(ic)} ${lbl}`;
    b.addEventListener('click', () => { kind = v; Object.values(segBtns).forEach((x) => x.classList.remove('on')); b.classList.add('on'); drawGuides(); });
    segBtns[v] = b; seg.append(b);
  });
  body.append(seg);
  body.append(el('div', 'kz-voice-hint', 'Dessine sur la zone : gauche→droite = le temps, haut = aigu.'));

  // Canvas
  const canvasWrap = el('div', 'kz-draw-canvaswrap');
  const canvas = el('canvas', 'kz-draw-canvas');
  canvasWrap.append(canvas);
  body.append(canvasWrap);

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function drawGuides() {
    ctx.clearRect(0, 0, W, H);
    // colonnes (pas)
    ctx.strokeStyle = 'rgba(120,140,170,0.14)'; ctx.lineWidth = 1;
    for (let i = 1; i < steps; i++) { const x = (i / steps) * W; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); if (i % 4 === 0) { ctx.strokeStyle = 'rgba(120,140,170,0.28)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); ctx.strokeStyle = 'rgba(120,140,170,0.14)'; } }
    // repères horizontaux
    for (let j = 1; j < 4; j++) { const y = (j / 4) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function redraw() {
    drawGuides();
    if (pts.length < 2) return;
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#57D1FF'); grad.addColorStop(1, '#FF7A2C');
    ctx.strokeStyle = grad; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    let started = false;
    for (const p of pts) {
      if (p.x == null) { started = false; continue; }   // séparateur de trait
      const x = p.x * W, y = p.y * H;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  let drawing = false;
  const norm = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => { drawing = true; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} if (pts.length) pts.push({ x: null, y: null }); pts.push(norm(e)); redraw(); });
  canvas.addEventListener('pointermove', (e) => { if (!drawing) return; pts.push(norm(e)); redraw(); });
  const endDraw = () => { drawing = false; };
  canvas.addEventListener('pointerup', endDraw);
  canvas.addEventListener('pointercancel', endDraw);

  // Aléa
  body.append(slider(`${icon('dice')} Aléa`, rnd, (v) => { rnd = v; }, { format: (v) => Math.round(v * 100) + '%' }));

  // Actions
  const row = el('div', 'kz-voice-row');
  const clear = el('button', 'kz-chip'); clear.innerHTML = `${icon('eraser')} Effacer`;
  clear.addEventListener('click', () => { pts.length = 0; redraw(); });
  row.append(clear);
  const apply = el('button', 'kz-chip kz-voice-add'); apply.innerHTML = `${icon('check')} Jouer mon dessin`;
  apply.addEventListener('click', () => {
    if (pts.filter((p) => p.x != null).length < 2) { toast('Dessine d\'abord un trait ✏️'); return; }
    const cols = sampleColumns(pts, steps);
    onApply({ kind, steps, cols, rnd });
    overlay.remove();
  });
  row.append(apply);
  body.append(row);

  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
  // Taille du canvas une fois dans le DOM.
  requestAnimationFrame(resize);
}

// Échantillonne le tracé en `steps` colonnes -> y moyen par colonne (ou null).
function sampleColumns(pts, steps) {
  const sum = new Array(steps).fill(0), cnt = new Array(steps).fill(0);
  for (const p of pts) {
    if (p.x == null) continue;
    let i = Math.floor(p.x * steps); if (i >= steps) i = steps - 1;
    sum[i] += p.y; cnt[i]++;
  }
  return sum.map((s, i) => (cnt[i] ? s / cnt[i] : null));
}
