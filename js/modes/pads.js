// modes/pads.js — lanceur de boucles façon Launchpad.
// Chaque pad = une boucle. On tape pour l'activer/désactiver ; les pads
// actifs se superposent pour former le morceau.
import { el, openSoundLibrary, toast } from '../ui.js';
import { assemble } from '../music.js';

const COLORS = ['#38f9d7', '#ff4ecd', '#a06bff', '#ffd166', '#5b8cff', '#ff8a5b'];

// Boucles de départ, groupées. `code` = pattern Strudel (sans tempo).
const BASE_PADS = [
  { emoji: '🥁', label: 'Kick 4', code: 's("bd*4")', group: 0 },
  { emoji: '🪘', label: 'Snare', code: 's("~ sd ~ sd")', group: 0 },
  { emoji: '🎩', label: 'Hats', code: 's("hh*8").gain(0.5)', group: 0 },
  { emoji: '👏', label: 'Clap', code: 's("~ ~ cp ~")', group: 0 },
  { emoji: '🌀', label: 'Kick 3/8', code: 's("bd(3,8)")', group: 0 },
  { emoji: '🛎️', label: 'Ride', code: 's("rd*4").gain(0.4)', group: 0 },

  { emoji: '🎸', label: 'Basse', code: 'note("c2 ~ c2 g2").sound("jvbass")', group: 1 },
  { emoji: '🔊', label: 'Basse 2', code: 'note("<c2 eb2 f2 g2>").sound("sawtooth").lpf(500)', group: 1 },
  { emoji: '🎹', label: 'Mélodie', code: 'note("c4 eb4 g4 bb4").sound("sawtooth").room(0.4)', group: 2 },
  { emoji: '✨', label: 'Arpège', code: 'note("c4 eb4 g4 c5 g4 eb4").fast(2).sound("triangle").room(0.5)', group: 2 },
  { emoji: '🔔', label: 'Cloches', code: 'note("<c5 g4 eb5 bb4>").sound("sine").room(0.6).delay(0.3)', group: 2 },
  { emoji: '🛸', label: 'Espace', code: 's("space").slow(2).room(0.7)', group: 3 },
  { emoji: '🌏', label: 'Perc Est', code: 's("east*4").gain(0.6)', group: 3 },
  { emoji: '🐦', label: 'Oiseaux', code: 's("birds").slow(4).gain(0.5)', group: 3 },
  { emoji: '🤖', label: 'Robot', code: 's("numbers*4").crush(6)', group: 3 },
  { emoji: '💥', label: 'Crash', code: 's("~ ~ ~ cr").gain(0.5)', group: 3 },
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
      b.innerHTML = `<span class="kz-pad-emoji">${p.emoji}</span><span class="kz-pad-label">${p.label}</span>`;
      b.addEventListener('click', () => {
        p.active = !p.active;
        b.classList.toggle('on', p.active);
        changed();
      });
      if (level === 'expert') {
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); editPad(p); });
        // appui long -> éditer le son
        let timer;
        b.addEventListener('touchstart', () => { timer = setTimeout(() => editPad(p), 550); }, { passive: true });
        b.addEventListener('touchend', () => clearTimeout(timer));
      }
      grid.append(b);
    });
    root.append(grid);

    const bar = el('div', 'kz-pads-bar');
    const allOff = el('button', 'kz-chip', '⏹️ Tout couper');
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
