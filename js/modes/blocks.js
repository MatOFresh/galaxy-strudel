// modes/blocks.js — assemblage de blocs façon Scratch.
// Chaque voie = un bloc SON + un bloc RYTHME + des blocs EFFET enchaînés.
import { el, openSoundLibrary, toast } from '../ui.js';
import { findSound } from '../sounds.js';
import { assemble } from '../music.js';
import { icon } from '../icons.js';

const RHYTHMS = {
  'Régulier ×4': (n) => `${n}*4`,
  'Rapide ×8': (n) => `${n}*8`,
  'Groove 3/8': (n) => `${n}(3,8)`,
  'Groove 5/8': (n) => `${n}(5,8)`,
  'Contretemps': (n) => `~ ${n} ~ ${n}`,
  'Une fois': (n) => `${n} ~ ~ ~`,
};

const MODS = [
  { id: 'room', emoji: 'reverb', label: 'Réverb', code: '.room(0.5)' },
  { id: 'delay', emoji: 'echo', label: 'Écho', code: '.delay(0.4)' },
  { id: 'lpf', emoji: 'filter', label: 'Filtre', code: '.lpf(700)' },
  { id: 'fast', emoji: 'fast', label: 'Plus vite', code: '.fast(2)' },
  { id: 'slow', emoji: 'slow', label: 'Plus lent', code: '.slow(2)' },
  { id: 'rev', emoji: 'reverse', label: 'À l\'envers', code: '.rev()' },
  { id: 'crush', emoji: 'crush', label: 'Robot', code: '.crush(6)' },
  { id: 'distort', emoji: 'disto', label: 'Disto', code: '.distort(2)' },
  { id: 'jux', emoji: 'headphones', label: 'Stéréo', code: '.jux(rev)' },
  { id: 'gain', emoji: 'gain', label: 'Moins fort', code: '.gain(0.5)' },
];

const MELO_PATTERN = 'c4 eb4 g4 bb4';

export function createBlocks(ctx) {
  let uid = 0;
  const lanes = [];
  const root = ctx.root;

  function addLane(soundId = 'bd') {
    const snd = findSound(soundId);
    lanes.push({ id: 'lane' + uid++, soundId, type: snd ? snd.type : 'drum', rhythm: 'Régulier ×4', mods: [] });
  }

  function buildCode() {
    const pats = lanes.map((l) => {
      const snd = findSound(l.soundId);
      const name = snd ? snd.name : l.soundId;
      let base;
      if (l.type === 'melo') {
        const isSynth = ['sine', 'sawtooth', 'square', 'triangle'].includes(name);
        base = `note("${MELO_PATTERN}").${isSynth ? 's' : 'sound'}("${name}")`;
      } else {
        const mini = (RHYTHMS[l.rhythm] || RHYTHMS['Régulier ×4'])(name);
        base = `s("${mini}")`;
      }
      const mods = l.mods.map((m) => MODS.find((x) => x.id === m)?.code || '').join('');
      return base + mods;
    });
    return assemble(pats, ctx.getBpm());
  }
  ctx.registerBuildCode(buildCode);

  function changed() { ctx.requestPlay(); }

  function render() {
    root.innerHTML = '';
    const level = ctx.getLevel();
    root.append(el('div', 'kz-pads-hint', '🧩 Empile des blocs : un SON, un RYTHME, puis des EFFETS.'));

    const list = el('div', 'kz-lanes');
    lanes.forEach((l) => list.append(renderLane(l, level)));
    root.append(list);

    const add = el('button', 'kz-add-lane'); add.innerHTML = `${icon('plus')} Ajouter une voie`;
    add.addEventListener('click', () => { openSoundLibrary((s) => { addLane(s.id); render(); changed(); }); });
    root.append(add);
  }

  function renderLane(l, level) {
    const lane = el('div', 'kz-lane');
    const snd = findSound(l.soundId);

    // Bloc SON
    const sound = el('button', 'kz-block kz-block-sound');
    sound.innerHTML = `<span class="kz-emoji">${snd ? icon(snd.emoji) : icon('gain')}</span><span>${snd ? snd.label : l.soundId}</span>`;
    sound.addEventListener('click', () => openSoundLibrary((s) => {
      l.soundId = s.id; l.type = s.type; render(); changed();
    }));
    lane.append(sound);

    // Bloc RYTHME (drums seulement)
    if (l.type !== 'melo') {
      const rhythm = el('button', 'kz-block kz-block-rhythm');
      rhythm.innerHTML = `<span class="kz-emoji">${icon('steps')}</span><span>${l.rhythm}</span>`;
      rhythm.addEventListener('click', () => {
        const keys = Object.keys(RHYTHMS);
        const i = keys.indexOf(l.rhythm);
        l.rhythm = keys[(i + 1) % keys.length];
        render(); changed();
      });
      lane.append(rhythm);
    }

    // Blocs EFFET enchaînés
    l.mods.forEach((mid, idx) => {
      const m = MODS.find((x) => x.id === mid);
      if (!m) return;
      const chip = el('button', 'kz-block kz-block-mod');
      chip.innerHTML = `<span class="kz-emoji">${icon(m.emoji)}</span><span>${m.label}</span><span class="kz-block-x">${icon('close')}</span>`;
      chip.addEventListener('click', () => { l.mods.splice(idx, 1); render(); changed(); });
      lane.append(chip);
    });

    // Bouton + effet
    const addMod = el('button', 'kz-block kz-block-add'); addMod.innerHTML = icon('plus');
    addMod.addEventListener('click', () => openModPalette(l));
    lane.append(addMod);

    // Supprimer la voie
    const del = el('button', 'kz-lane-del'); del.innerHTML = icon('trash');
    del.addEventListener('click', () => { const i = lanes.indexOf(l); lanes.splice(i, 1); render(); changed(); });
    lane.append(del);

    return lane;
  }

  function openModPalette(lane) {
    const overlay = el('div', 'kz-modal-overlay');
    const modal = el('div', 'kz-modal small');
    const head = el('div', 'kz-modal-head');
    head.append(el('h2', null, 'Ajouter un effet'));
    const close = el('button', 'kz-close'); close.innerHTML = icon('close');
    close.addEventListener('click', () => overlay.remove());
    head.append(close);
    modal.append(head);
    const grid = el('div', 'kz-sound-grid');
    MODS.forEach((m) => {
      const b = el('button', 'kz-icon-btn');
      b.innerHTML = `<span class="kz-emoji">${icon(m.emoji)}</span><span class="kz-ibl">${m.label}</span>`;
      b.addEventListener('click', () => { lane.mods.push(m.id); overlay.remove(); render(); changed(); });
      grid.append(b);
    });
    modal.append(grid);
    overlay.append(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.append(overlay);
  }

  return {
    buildCode,
    highlight() {},
    onLevelChange() { render(); },
    init() {
      // départ : une petite base qui sonne
      addLane('bd'); addLane('hh'); lanes[1].rhythm = 'Rapide ×8';
      addLane('sawtooth'); lanes[2].type = 'melo';
      render();
    },
    destroy() { root.innerHTML = ''; },
  };
}
