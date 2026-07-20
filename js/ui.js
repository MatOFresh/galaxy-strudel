// ui.js — petits composants réutilisés par les modes.
import { getCategories, importFiles } from './sounds.js';
import { icon } from './icons.js';

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
export function openSoundLibrary(onPick, filterType = null) {
  const overlay = el('div', 'kz-modal-overlay');
  const modal = el('div', 'kz-modal');
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

  const body = el('div', 'kz-modal-body');
  modal.append(body);

  function renderCats() {
    body.innerHTML = '';
    const cats = getCategories();
    for (const [cat, sounds] of Object.entries(cats)) {
      const list = filterType ? sounds.filter((s) => s.type === filterType) : sounds;
      if (!list.length) continue;
      body.append(el('h3', 'kz-cat-title', cat));
      const grid = el('div', 'kz-sound-grid');
      list.forEach((s) => {
        const b = iconButton(icon(s.emoji), s.label, () => {
          onPick(s);
          overlay.remove();
        });
        grid.append(b);
      });
      body.append(grid);
    }
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
