// modes/ultradj.js — table de mixage "live" : triture le son du morceau courant.
// Prend le dernier morceau joué (Séquenceur/Pads/Blocs) et lui applique des
// effets en direct, sans jamais montrer de code.
import { el, slider } from '../ui.js';

const FALLBACK = 'setcpm(28)\nstack(\n  s("bd*4"),\n  s("hh*8").gain(0.5),\n  s("~ sd ~ sd"),\n  note("<c2 eb2 f2 g2>").sound("jvbass").lpf(800)\n)';
const num = (v) => Math.round(v * 1000) / 1000;

export function createUltraDJ(ctx) {
  const dj = {
    filterOn: false, cutoff: 0.7, res: 0.2,   // pad XY (X=coupure, Y=résonance)
    room: 0, delay: 0, crush: 0,
    time: 'normal',   // 'slow' | 'normal' | 'fast'
    chop: 0,          // 0 = off, sinon nb de tranches
    reverse: false, autowah: false,
  };
  const root = ctx.root;
  let evalTimer = null;
  function live() { if (evalTimer) return; evalTimer = setTimeout(() => { evalTimer = null; ctx.requestPlay(); }, 60); }

  function buildCode() {
    const base = (ctx.getSession && ctx.getSession()) || FALLBACK;
    let fx = '';
    if (dj.autowah) fx += '.lpf(sine.range(300,6500).slow(2))';
    else if (dj.filterOn) {
      fx += `.lpf(${Math.round(200 + dj.cutoff * 7800)})`;
      if (dj.res > 0.03) fx += `.lpq(${num(0.5 + dj.res * 24)})`;
    }
    if (dj.room > 0.03) fx += `.room(${num(dj.room)})`;
    if (dj.delay > 0.03) fx += `.delay(${num(dj.delay * 0.75)})`;
    if (dj.crush > 0.03) fx += `.crush(${num(16 - dj.crush * 12)})`;
    if (dj.time === 'slow') fx += '.slow(2)';
    else if (dj.time === 'fast') fx += '.fast(2)';
    if (dj.chop > 0) fx += `.chop(${dj.chop})`;
    if (dj.reverse) fx += '.rev()';
    return base + fx;
  }
  ctx.registerBuildCode(buildCode);

  function render() {
    root.innerHTML = '';
    const hasSession = !!(ctx.getSession && ctx.getSession());
    root.append(el('div', 'kz-pads-hint',
      hasSession ? '🎚️ Triture ton morceau en direct. Glisse sur le pad, tourne les boutons.'
        : '🎚️ Fais d\'abord un morceau au Séquenceur — ici c\'est un beat de démo à triturer.'));

    // --- Pad XY filtre ---
    const padWrap = el('div', 'dj-padwrap');
    const padLabel = el('div', 'dj-pad-label');
    padLabel.innerHTML = '<span>FILTRE</span><span class="dj-pad-axes">← grave · aigu →&nbsp;&nbsp;↑ résonance</span>';
    padWrap.append(padLabel);
    const pad = el('div', 'dj-pad');
    const dot = el('div', 'dj-dot');
    dot.style.left = (dj.cutoff * 100) + '%';
    dot.style.top = ((1 - dj.res) * 100) + '%';
    pad.append(dot);
    padWrap.append(pad);
    root.append(padWrap);

    let dragging = false;
    const fromPointer = (e) => {
      const r = pad.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      dj.cutoff = x; dj.res = 1 - y;
      dot.style.left = (x * 100) + '%'; dot.style.top = (y * 100) + '%';
      live();
    };
    pad.addEventListener('pointerdown', (e) => { dragging = true; dj.filterOn = true; pad.classList.add('on'); try { pad.setPointerCapture(e.pointerId); } catch (_) {} fromPointer(e); });
    pad.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    const end = () => { dragging = false; };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);

    // --- Boutons temps (segmenté) ---
    const timeRow = el('div', 'dj-seg');
    [['slow', '🐢 ×½'], ['normal', '▶︎ Normal'], ['fast', '⚡ ×2']].forEach(([v, lbl]) => {
      const b = el('button', 'dj-seg-btn' + (dj.time === v ? ' on' : ''), lbl);
      b.addEventListener('click', () => { dj.time = v; render(); live(); });
      timeRow.append(b);
    });
    root.append(timeRow);

    // --- Effets à bascule ---
    const fxRow = el('div', 'dj-fx-row');
    const toggle = (key, emoji, label, onVal) => {
      const active = key === 'chop' ? dj.chop > 0 : dj[key];
      const b = el('button', 'dj-fx-btn' + (active ? ' on' : ''));
      b.innerHTML = `<span class="kz-emoji">${emoji}</span><span>${label}</span>`;
      b.addEventListener('click', () => {
        if (key === 'chop') dj.chop = dj.chop > 0 ? 0 : onVal;
        else dj[key] = !dj[key];
        render(); live();
      });
      return b;
    };
    fxRow.append(toggle('reverse', '🔀', 'Envers'));
    fxRow.append(toggle('chop', '🔪', 'Hachoir', 8));
    fxRow.append(toggle('autowah', '🌊', 'Auto-wah'));
    root.append(fxRow);

    // --- Boutons rotatifs (curseurs) ---
    const knobs = el('div', 'dj-knobs');
    knobs.append(slider('🏔️ Réverb', dj.room, (v) => { dj.room = v; live(); }));
    knobs.append(slider('🔁 Écho', dj.delay, (v) => { dj.delay = v; live(); }));
    knobs.append(slider('🤖 Crush', dj.crush, (v) => { dj.crush = v; live(); }));
    root.append(knobs);

    // --- Reset ---
    const reset = el('button', 'kz-chip dj-reset', '↩︎ Tout remettre à zéro');
    reset.addEventListener('click', () => {
      dj.filterOn = false; dj.cutoff = 0.7; dj.res = 0.2; dj.room = 0; dj.delay = 0; dj.crush = 0;
      dj.time = 'normal'; dj.chop = 0; dj.reverse = false; dj.autowah = false;
      render(); live();
    });
    root.append(reset);
  }

  return {
    buildCode,
    highlight() {},
    onLevelChange() { render(); },
    init() { render(); },
    destroy() { root.innerHTML = ''; },
  };
}
