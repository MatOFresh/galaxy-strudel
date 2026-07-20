// djfx.js — contrôles "Ultra DJ" réutilisables : pad XY de filtre + effets
// live, et génération de la chaîne d'effets Strudel appliquée à un motif.
import { el, slider } from './ui.js';
import { icon } from './icons.js';

const num = (v) => Math.round(v * 1000) / 1000;

export function defaultDjState() {
  return {
    filterOn: false, cutoff: 0.7, res: 0.2,   // pad XY (X=coupure, Y=résonance)
    room: 0, delay: 0, crush: 0, coarse: 0,
    time: 'normal',   // 'slow' | 'normal' | 'fast'
    chop: 0,          // 0 = off
    reverse: false, autowah: false, phaser: false,
    vowel: 0,         // 0 = off, sinon A/E/I/O/U
  };
}

// Suffixe d'effets Strudel à coller après un motif (stack(...) / arrange(...)).
export function djFxChain(dj) {
  if (!dj) return '';
  let fx = '';
  if (dj.autowah) fx += '.lpf(sine.range(300,6500).slow(2))';
  else if (dj.filterOn) {
    fx += `.lpf(${Math.round(200 + dj.cutoff * 7800)})`;
    if (dj.res > 0.03) fx += `.lpq(${num(0.5 + dj.res * 24)})`;
  }
  if (dj.room > 0.03) fx += `.room(${num(dj.room)})`;
  if (dj.delay > 0.03) fx += `.delay(${num(dj.delay * 0.75)})`;
  if (dj.crush > 0.03) fx += `.crush(${num(16 - dj.crush * 12)})`;
  if (dj.coarse > 0.03) fx += `.coarse(${Math.round(1 + dj.coarse * 20)})`;
  if (dj.vowel > 0) fx += `.vowel("${'aeiou'[Math.min(4, Math.floor(dj.vowel * 5))]}")`;
  if (dj.phaser) fx += '.phaser(2).phaserdepth(0.8)';
  if (dj.time === 'slow') fx += '.slow(2)';
  else if (dj.time === 'fast') fx += '.fast(2)';
  if (dj.chop > 0) fx += `.chop(${dj.chop})`;
  if (dj.reverse) fx += '.rev()';
  return fx;
}

export function djIsActive(dj) {
  return !!(dj && (dj.filterOn || dj.autowah || dj.reverse || dj.chop || dj.phaser || dj.vowel > 0
    || dj.time !== 'normal' || dj.room > 0.03 || dj.delay > 0.03 || dj.crush > 0.03 || dj.coarse > 0.03));
}

// Construit les contrôles DJ dans `container`. onChange() = ré-évaluation (live).
// Les changements continus (pad) ne re-render pas ; les changements discrets si.
export function renderDjControls(container, dj, onChange) {
  function build() {
    container.innerHTML = '';

    // Pad XY filtre
    const padWrap = el('div', 'dj-padwrap');
    const padLabel = el('div', 'dj-pad-label');
    padLabel.innerHTML = '<span>FILTRE</span><span class="dj-pad-axes">← grave · aigu →&nbsp;&nbsp;↑ résonance</span>';
    padWrap.append(padLabel);
    const pad = el('div', 'dj-pad' + (dj.filterOn ? ' on' : ''));
    const dot = el('div', 'dj-dot');
    dot.style.left = (dj.cutoff * 100) + '%';
    dot.style.top = ((1 - dj.res) * 100) + '%';
    pad.append(dot);
    padWrap.append(pad);
    container.append(padWrap);

    let dragging = false;
    const fromPointer = (e) => {
      const r = pad.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      dj.cutoff = x; dj.res = 1 - y;
      dot.style.left = (x * 100) + '%'; dot.style.top = (y * 100) + '%';
      onChange();
    };
    pad.addEventListener('pointerdown', (e) => { dragging = true; dj.filterOn = true; pad.classList.add('on'); try { pad.setPointerCapture(e.pointerId); } catch (_) {} fromPointer(e); });
    pad.addEventListener('pointermove', (e) => { if (dragging) fromPointer(e); });
    const end = () => { dragging = false; };
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);

    // Segmenté temps
    const timeRow = el('div', 'dj-seg');
    [['slow', 'slow', '×½'], ['normal', 'play', 'Normal'], ['fast', 'fast', '×2']].forEach(([v, ic, lbl]) => {
      const b = el('button', 'dj-seg-btn' + (dj.time === v ? ' on' : '')); b.innerHTML = `${icon(ic)} ${lbl}`;
      b.addEventListener('click', () => { dj.time = v; build(); onChange(); });
      timeRow.append(b);
    });
    container.append(timeRow);

    // Effets à bascule
    const fxRow = el('div', 'dj-fx-row');
    const toggle = (key, ic, label, onVal) => {
      const active = key === 'chop' ? dj.chop > 0 : dj[key];
      const b = el('button', 'dj-fx-btn' + (active ? ' on' : ''));
      b.innerHTML = `<span class="kz-emoji">${icon(ic)}</span><span>${label}</span>`;
      b.addEventListener('click', () => {
        if (key === 'chop') dj.chop = dj.chop > 0 ? 0 : onVal;
        else dj[key] = !dj[key];
        build(); onChange();
      });
      return b;
    };
    fxRow.append(toggle('reverse', 'reverse', 'Envers'));
    fxRow.append(toggle('chop', 'chop', 'Hachoir', 8));
    fxRow.append(toggle('autowah', 'wah', 'Auto-wah'));
    fxRow.append(toggle('phaser', 'wah', 'Phaser'));
    // Voyelle : bouton qui cycle off -> A E I O U
    const vw = el('button', 'dj-fx-btn' + (dj.vowel > 0 ? ' on' : ''));
    const vl = dj.vowel > 0 ? 'aeiou'[Math.min(4, Math.floor(dj.vowel * 5))].toUpperCase() : 'off';
    vw.innerHTML = `<span class="kz-emoji">${icon('voice')}</span><span>Voyelle ${vl}</span>`;
    vw.addEventListener('click', () => {
      const steps = [0, 0.1, 0.3, 0.5, 0.7, 0.9];
      const i = steps.findIndex((s) => Math.abs(s - dj.vowel) < 0.05);
      dj.vowel = steps[(i + 1) % steps.length];
      build(); onChange();
    });
    fxRow.append(vw);
    container.append(fxRow);

    // Curseurs
    const knobs = el('div', 'dj-knobs');
    knobs.append(slider(`${icon('reverb')} Réverb`, dj.room, (v) => { dj.room = v; onChange(); }));
    knobs.append(slider(`${icon('echo')} Écho`, dj.delay, (v) => { dj.delay = v; onChange(); }));
    knobs.append(slider(`${icon('crush')} Crush`, dj.crush, (v) => { dj.crush = v; onChange(); }));
    knobs.append(slider(`${icon('chip')} Grésil`, dj.coarse, (v) => { dj.coarse = v; onChange(); }));
    container.append(knobs);

    // Reset
    const reset = el('button', 'kz-chip dj-reset'); reset.innerHTML = `${icon('reset')} Effets à zéro`;
    reset.addEventListener('click', () => {
      Object.assign(dj, defaultDjState());
      build(); onChange();
    });
    container.append(reset);
  }
  build();
}
