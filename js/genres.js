// genres.js — recettes de génération de morceau par style (B1).
// Chaque genre décrit : tempo, gamme, swing, motifs de batterie 16 pas (avec
// vélocité 0/1/2/3 = off/normal/accent/ghost), une basse (1 = joue la fondamentale)
// et un profil mélodique (densité, registre bias 0..1, contour). Les SONS sont
// choisis à la volée d'après le genre (vibe), cf. pickSound().
export const GENRES = {
  techno: {
    label: 'Techno', bpm: [128, 132], scale: 'Mineure cool', swing: 0,
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
    hat: [1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 3, 0],
    clap: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    bass: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
    mel: { density: 0.3, bias: 0.62, contour: 'wave' },
  },
  house: {
    label: 'House', bpm: [122, 126], scale: 'Majeure joyeuse', swing: 0.22,
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
    clap: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    hat: [1, 0, 3, 0, 1, 0, 3, 0, 1, 0, 3, 0, 1, 0, 3, 0],
    bass: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
    mel: { density: 0.4, bias: 0.55, contour: 'up' },
  },
  hiphop: {
    label: 'Hip-hop', bpm: [86, 92], scale: 'Mineure cool', swing: 0.32,
    kick: [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    hat: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 1],
    bass: [2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0],
    mel: { density: 0.3, bias: 0.4, contour: 'down' },
  },
  trance: {
    label: 'Trance', bpm: [136, 140], scale: 'Mineure cool', swing: 0,
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
    clap: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    hat: [1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1],
    bass: [0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0],
    mel: { density: 0.5, bias: 0.75, contour: 'up' },
  },
  ambient: {
    label: 'Ambient', bpm: [80, 90], scale: 'Majeure joyeuse', swing: 0,
    kick: [2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    bass: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    mel: { density: 0.28, bias: 0.8, contour: 'wave' },
  },
  acoustique: {
    label: 'Acoustique', bpm: [98, 108], scale: 'Do majeur', swing: 0.28,
    kick: [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    snare: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    hat: [2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0],
    bass: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
    mel: { density: 0.4, bias: 0.5, contour: 'wave' },
  },
  retro: {
    label: 'Rétro', bpm: [116, 124], scale: 'Majeure joyeuse', swing: 0,
    kick: [2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0],
    hat: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
    bass: [2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
    mel: { density: 0.55, bias: 0.65, contour: 'up' },
  },
};

// Adapte un motif 16 pas au nombre de pas courant : 8 = un pas sur deux,
// 16 = tel quel, 32/64 (DJ Légendaire) = on répète le motif pour remplir le loop.
export function fitTemplate(tmpl, steps) {
  if (!tmpl) return null;
  if (steps <= 8) return tmpl.filter((_, i) => i % 2 === 0).slice(0, steps);
  if (steps === 16) return tmpl.slice(0, 16);
  return Array.from({ length: steps }, (_, i) => tmpl[i % 16]);
}
