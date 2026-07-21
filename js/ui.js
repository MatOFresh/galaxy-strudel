// ui.js — petits composants réutilisés par les modes.
import { getCategories, importFiles, VIBES, getVibe } from './sounds.js';
import { previewSound } from './strudel-engine.js';
import { icon } from './icons.js';

const SYNTHS = ['sine', 'sawtooth', 'square', 'triangle'];

export function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}

// Slider tactile avec label + valeur. onInput(0..1).
export function slider(label, value, onInput, opts = {}) {
  const wrap = el('div', 'kz-slider');
  const top = el('div', 'kz-slider-top');
  const lbl = el('span', 'kz-slider-label'); lbl.innerHTML = label; // label peut contenir une icône SVG
  top.append(lbl);
  const val = el('span', 'kz-slider-val');
  top.append(val);
  const input = el('input');
  input.type = 'range';
  input.min = 0; input.max = 1000; input.step = 1;
  input.value = Math.round(value * 1000);
  const fmt = opts.format || ((v) => Math.round(v * 100) + '%');
  val.textContent = fmt(value);
  input.addEventListener('input', () => {
    const v = input.value / 1000;
    val.textContent = fmt(v);
    onInput(v);
  });
  wrap.append(top, input);
  return wrap;
}

// Bouton icône générique.
export function iconButton(emoji, label, onClick, cls = '') {
  const b = el('button', 'kz-icon-btn ' + cls);
  b.innerHTML = `<span class="kz-emoji">${emoji}</span><span class="kz-ibl">${label}</span>`;
  b.addEventListener('click', onClick);
  return b;
}

// Ouvre la bibliothèque de sons (modale). onPick(soundItem).
// opts.used = ids de sons déjà pris (grisés, non re-sélectionnables) — évite
// de mettre deux fois le même instrument sur des pistes différentes.
export function openSoundLibrary(onPick, filterType = null, opts = {}) {
  const usedIds = opts.used instanceof Set ? opts.used : new Set(opts.used || []);
  const overlay = el('div', 'kz-modal-overlay');
  const modal = el('div', 'kz-modal');

  // Poignée iOS + glisser-pour-fermer (pointer events, rubber-band, vélocité).
  const grab = el('div', 'kz-grab');
  modal.append(grab);
  let dragging = false, startY = 0, curY = 0, lastY = 0, lastT = 0, vel = 0;
  grab.style.touchAction = 'none';
  grab.addEventListener('pointerdown', (e) => {
    dragging = true; startY = e.clientY; curY = 0; lastY = e.clientY; lastT = performance.now(); vel = 0;
    modal.style.transition = 'none';
    try { grab.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  });
  grab.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    let dy = e.clientY - startY;
    if (dy < 0) dy = dy * 0.28;            // rubber-band vers le haut
    curY = dy;
    modal.style.transform = `translateY(${dy}px)`;
    const now = performance.now(), dt = now - lastT;
    if (dt > 0) vel = ((e.clientY - lastY) / dt) * 1000;
    lastY = e.clientY; lastT = now;
  });
  const dragEnd = () => {
    if (!dragging) return; dragging = false;
    modal.style.transition = 'transform .38s cubic-bezier(.2,.85,.25,1)';
    const projected = curY + vel * 0.12;   // projection de momentum
    if (projected > modal.offsetHeight * 0.3 || vel > 750) {
      modal.style.transform = `translateY(${modal.offsetHeight + 80}px)`;
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 320);
    } else {
      modal.style.transform = 'translateY(0)';
    }
  };
  grab.addEventListener('pointerup', dragEnd);
  grab.addEventListener('pointercancel', dragEnd);

  const header = el('div', 'kz-modal-head');
  const h2 = el('h2'); h2.innerHTML = `<span class="kz-h2-ic">${icon('sliders')}</span>Bibliothèque de sons`;
  header.append(h2);
  const close = el('button', 'kz-close'); close.innerHTML = icon('close');
  close.addEventListener('click', () => overlay.remove());
  header.append(close);
  modal.append(header);

  // Import
  const importBar = el('div', 'kz-import-bar');
  const importBtn = el('label', 'kz-import-btn');
  importBtn.innerHTML = icon('plus') + ' Importer mes sons';
  const fileInput = el('input');
  fileInput.type = 'file';
  fileInput.accept = 'audio/*';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', async () => {
    importBtn.textContent = 'Import…';
    await importFiles(fileInput.files);
    renderCats();
    importBtn.innerHTML = icon('plus') + ' Importer mes sons';
    importBtn.append(fileInput); // ré-attache l'input (innerHTML l'a retiré)
  });
  importBtn.append(fileInput);
  importBar.append(importBtn);
  importBar.append(el('span', 'kz-import-hint', 'Ta voix, un bruit, une note... (mp3, wav)'));
  modal.append(importBar);

  // Filtre par sonorité (genre) : chips colorées. On garde l'orga par famille.
  let genreFilter = null;
  const filterBar = el('div', 'kz-vibe-filter');
  const chips = {};
  const mkChip = (id, label, color) => {
    const c = el('button', 'kz-vibe-chip' + (genreFilter === id ? ' on' : ''));
    if (color) { c.style.setProperty('--vc', color); c.classList.add('has-dot'); }
    c.innerHTML = (color ? '<span class="kz-vibe-swatch"></span>' : '') + label;
    c.addEventListener('click', () => {
      genreFilter = (genreFilter === id) ? null : id;
      Object.values(chips).forEach((x) => x.classList.remove('on'));
      if (genreFilter) chips[genreFilter].classList.add('on'); else chips.__all.classList.add('on');
      renderCats();
    });
    chips[id || '__all'] = c;
    filterBar.append(c);
  };
  mkChip(null, 'Tous', null);
  chips.__all.classList.toggle('on', !genreFilter);
  Object.entries(VIBES).forEach(([id, v]) => mkChip(id, v.label, v.color));
  modal.append(filterBar);

  const body = el('div', 'kz-modal-body');
  modal.append(body);

  function renderCats() {
    body.innerHTML = '';
    const cats = getCategories();
    let total = 0;
    for (const [cat, sounds] of Object.entries(cats)) {
      let list = filterType ? sounds.filter((s) => s.type === filterType) : sounds;
      if (genreFilter) list = list.filter((s) => s.vibe === genreFilter);
      if (!list.length) continue;
      total += list.length;
      body.append(el('h3', 'kz-cat-title', cat));
      const grid = el('div', 'kz-sound-grid');
      list.forEach((s) => {
        const item = el('div', 'kz-sound-item');
        const v = getVibe(s.vibe);
        if (v) item.style.setProperty('--vc', v.color);
        const used = usedIds.has(s.id);
        const b = el('button', 'kz-icon-btn kz-sound-btn' + (used ? ' used' : ''));
        b.innerHTML = `<span class="kz-emoji">${icon(s.emoji)}</span><span class="kz-ibl">${s.label}</span>`
          + (v ? '<span class="kz-vibe-tag"><span class="kz-vibe-swatch"></span>' + v.label + '</span>' : '');
        if (used) { const bd = el('span', 'kz-used-badge'); bd.innerHTML = icon('check'); b.append(bd); }
        b.addEventListener('click', () => {
          if (used) { toast('« ' + s.label + ' » est déjà sur une piste'); return; }
          onPick(s); overlay.remove();
        });
        item.append(b);
        // Bouton « écouter » : essaie le son sans le choisir ni fermer la modale.
        const tryBtn = el('button', 'kz-sound-try'); tryBtn.innerHTML = icon('play'); tryBtn.title = 'Écouter';
        tryBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          tryBtn.classList.add('playing');
          previewSound(s.name, SYNTHS.includes(s.name));
          setTimeout(() => tryBtn.classList.remove('playing'), 420);
        });
        item.append(tryBtn);
        grid.append(item);
      });
      body.append(grid);
    }
    if (!total) body.append(el('div', 'kz-voice-hint', 'Aucun son de ce genre dans ce filtre.'));
  }
  renderCats();

  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.append(overlay);
}

// Petit toast.
export function toast(msg) {
  const t = el('div', 'kz-toast', msg);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 1800);
}
