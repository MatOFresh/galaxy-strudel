// feelings.js — mode « Feelings » : des boutons d'émotions qui transforment la
// musique (tempo, gamme, densité, effets Ultra DJ). Les données décrivent
// l'ambiance ; l'application concrète (mélodie, batterie) se fait dans le
// séquenceur qui connaît les gammes et les pistes.
import { el } from './ui.js';
import { icon } from './icons.js';

// energy 0..1 = densité rythmique/mélodique. dj = état Ultra DJ partiel.
export const EMOTIONS = [
  { id: 'joie', icon: 'happy', label: 'Joie', bpm: 128, scale: 'Majeure joyeuse', energy: 0.7, dj: { room: 0.15 } },
  { id: 'triste', icon: 'sad', label: 'Triste', bpm: 92, scale: 'Mineure cool', energy: 0.3, dj: { filterOn: true, cutoff: 0.34, res: 0.12, room: 0.55, delay: 0.35 } },
  { id: 'colere', icon: 'angry', label: 'Colère', bpm: 140, scale: 'Mystère', energy: 0.9, dj: { filterOn: true, cutoff: 0.9, res: 0.4, crush: 0.55 } },
  { id: 'reveur', icon: 'dream', label: 'Rêveur', bpm: 104, scale: 'Majeure joyeuse', energy: 0.35, dj: { room: 0.6, delay: 0.45, phaser: true, vowel: 0.5 } },
  { id: 'energie', icon: 'energy', label: 'Énergie', bpm: 134, scale: 'Mineure cool', energy: 0.95, dj: { autowah: true, room: 0.1 } },
  { id: 'sombre', icon: 'dark', label: 'Sombre', bpm: 122, scale: 'Mystère', energy: 0.55, dj: { filterOn: true, cutoff: 0.28, res: 0.22, crush: 0.3, room: 0.3 } },
  { id: 'chill', icon: 'chill', label: 'Chill', bpm: 108, scale: 'Majeure joyeuse', energy: 0.4, dj: { filterOn: true, cutoff: 0.62, room: 0.35, delay: 0.2 } },
  { id: 'amour', icon: 'love', label: 'Amour', bpm: 116, scale: 'Do majeur', energy: 0.5, dj: { room: 0.4, vowel: 0.3 } },
];

export function findEmotion(id) { return EMOTIONS.find((e) => e.id === id) || null; }

// Rend la grille de boutons d'émotions. onPick(emotion) est appelé au clic.
export function renderFeelingsPanel(container, activeId, onPick) {
  container.innerHTML = '';
  const grid = el('div', 'kz-feel-grid');
  EMOTIONS.forEach((emo) => {
    const b = el('button', 'kz-feel-btn' + (activeId === emo.id ? ' on' : ''));
    b.innerHTML = `<span class="kz-feel-ic">${icon(emo.icon)}</span><span class="kz-feel-lbl">${emo.label}</span>`;
    b.addEventListener('click', () => onPick(emo));
    grid.append(b);
  });
  container.append(grid);
  container.append(el('div', 'kz-voice-hint', 'Touche une émotion : le tempo, la gamme, la mélodie et les effets s\'adaptent.'));
}
