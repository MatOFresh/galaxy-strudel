// modes/pads.js — lanceur de boucles façon Launchpad.
// Chaque pad = une boucle. On tape pour l'activer/désactiver ; les pads
// actifs se superposent pour former le morceau.
import { el, openSoundLibrary, toast } from '../ui.js';
import { assemble } from '../music.js';
import { icon } from '../icons.js';

// Duotone par groupe : glace (batterie), glace profonde (basse), ambre
// (mélodie), acier (fx) — cohérent, pas de rainbow.
const COLORS = ['#57D1FF', '#2B7FE0', '#FF7A2C', '#6B7688'];

// Boucles de départ, groupées. `emoji` = nom d'icône. `code` = pattern Strudel.
const BASE_PADS = [
  { emoji: 'kick', label: 'Kick 4', code: 's("bd*4")', group: 0 },
  { emoji: 'snare', label: 'Snare', code: 's("~ sd ~ sd")', group: 0 },
  { emoji: 'hat', label: 'Hats', code: 's("hh*8").gain(0.5)', group: 0 },
  { emoji: 'clap', label: 'Clap', code: 's("~ ~ cp ~")', group: 0 },
  { emoji: 'kick', label: 'Kick 3/8', code: 's("bd(3,8)")', group: 0 },
  { emoji: 'cymbal', label: 'Ride', code: 's("crate_rd*4").gain(0.4)', group: 0 },

  { emoji: 'bass', label: 'Basse', code: 'note("c2 ~ c2 g2").sound("jvbass")', group: 1 },
  { emoji: 'bass', label: 'Basse 2', code: 'note("<c2 eb2 f2 g2>").sound("sawtooth").lpf(500)', group: 1 },
  { emoji: 'synth', label: 'Mélodie', code: 'note("c4 eb4 g4 bb4").sound("sawtooth").room(0.4)', group: 2 },
  { emoji: 'star', label: 'Arpège', code: 'note("c4 eb4 g4 c5 g4 eb4").fast(2).sound("triangle").room(0.5)', group: 2 },
  { emoji: 'cymbal', label: 'Cloches', code: 'note("<c5 g4 eb5 bb4>").sound("sine").room(0.6).delay(0.3)', group: 2 },
  { emoji: 'star', label: 'Espace', code: 's("space").slow(2).room(0.7)', group: 3 },
  { emoji: 'perc', label: 'Perc Est', code: 's("east*4").gain(0.6)', group: 3 },
  { emoji: 'star', label: 'Oiseaux', code: 's("birds").slow(4).gain(0.5)', group: 3 },
  { emoji: 'crush', label: 'Robot', code: 's("numbers*4").crush(6)', group: 3 },
  { emoji: 'cymbal', label: 'Crash', code: 's("~ ~ ~ cr").gain(0.5)', group: 3 },
];

export function createPads(ctx) {
  const pads = BASE_PADS.map((p, i) => ({ ...p, id: 'pad' + i, active: false, color: COLORS[p.group % COLORS.length] }));
  const root = ctx.root;

  function buildCode() {
    const active = pads.filter((p) => p.active).map((p) => p.code);
    return assemble(active, ctx.getBpm());
  }
  ctx.registerBuildCode(buildCode);

  function changed() { ctx.requestPlay(); }

  function render() {
    root.innerHTML = '';
    const level = ctx.getLevel();

    const hint = el('div', 'kz-pads-hint', '👆 Touche les pads pour lancer des boucles. Ils se superposent !');
    root.append(hint);

    const grid = el('div', 'kz-pad-grid');
    pads.forEach((p) => {
      const b = el('button', 'kz-pad' + (p.active ? ' on' : ''));
      b.style.setProperty('--pad-color', p.color);
      b.innerHTML = `<span class="kz-pad-emoji">${icon(p.emoji)}</span><span class="kz-pad-label">${p.label}</span>`;
      let longPressed = false;
      b.addEventListener('click', () => {
        // Un appui long vient d'ouvrir la bibliothèque : ne pas (dés)activer le pad en plus.
        if (longPressed) { longPressed = false; return; }
        p.active = !p.active;
        b.classList.toggle('on', p.active);
        changed();
      });
      if (level === 'expert') {
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); editPad(p); });
        // appui long -> éditer le son
        let timer;
        b.addEventListener('touchstart', () => { longPressed = false; timer = setTimeout(() => { longPressed = true; editPad(p); }, 550); }, { passive: true });
        b.addEventListener('touchend', () => clearTimeout(timer));
        b.addEventListener('touchmove', () => clearTimeout(timer), { passive: true });
      }
      grid.append(b);
    });
    root.append(grid);

    const bar = el('div', 'kz-pads-bar');
    const allOff = el('button', 'kz-chip'); allOff.innerHTML = `${icon('close')} Tout couper`;
    allOff.addEventListener('click', () => { pads.forEach((p) => (p.active = false)); render(); changed(); });
    bar.append(allOff);
    if (level === 'expert') {
      bar.append(el('span', 'kz-import-hint', 'Astuce : appui long sur un pad pour changer son son.'));
    }
    root.append(bar);
  }

  function editPad(p) {
    openSoundLibrary((s) => {
      const isSynth = ['sine', 'sawtooth', 'square', 'triangle'].includes(s.name);
      if (s.type === 'melo') {
        p.code = `note("c4 eb4 g4 bb4").${isSynth ? 's' : 'sound'}("${s.name}").room(0.4)`;
      } else {
        p.code = `s("${s.name}*4")`;
      }
      p.emoji = s.emoji; p.label = s.label;
      toast('Pad mis à jour : ' + s.label);
      render(); changed();
    });
  }

  return {
    buildCode,
    highlight() {},
    onLevelChange() { render(); },
    init() { render(); },
    destroy() { root.innerHTML = ''; },
  };
}
