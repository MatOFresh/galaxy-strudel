// music.js — gammes + génération de code Strudel à partir de l'état UI.

// Gammes (du grave à l'aigu, une octave) en notation Strudel.
export const SCALES = {
  'Mineure cool': ['c', 'eb', 'f', 'g', 'bb'],       // pentatonique mineure
  'Majeure joyeuse': ['c', 'd', 'e', 'g', 'a'],      // pentatonique majeure
  'Mystère': ['c', 'db', 'e', 'f', 'ab'],            // exotique
  'Do majeur': ['c', 'd', 'e', 'f', 'g', 'a', 'b'],
};

// Construit la liste de notes (rangées) sur `octaves` octaves, aiguës en haut.
export function buildNoteRows(scaleName, octaves = 2, base = 3) {
  const scale = SCALES[scaleName] || SCALES['Mineure cool'];
  const rows = [];
  for (let o = 0; o < octaves; o++) {
    for (const n of scale) rows.push(`${n}${base + o}`);
  }
  return rows.reverse(); // aiguës en haut de la grille
}

// Échappe une valeur numérique pour le code.
const num = (v) => (Math.round(v * 1000) / 1000).toString();

// Applique une chaîne d'effets à un pattern selon un objet fx.
export function fxChain(fx = {}) {
  let out = '';
  if (fx.gain != null && fx.gain !== 1) out += `.gain(${num(fx.gain)})`;
  if (fx.pan != null && fx.pan !== 0.5) out += `.pan(${num(fx.pan)})`;
  if (fx.lpf != null && fx.lpf < 1) out += `.lpf(${Math.round(200 + fx.lpf * 7800)})`;
  if (fx.hpf != null && fx.hpf > 0) out += `.hpf(${Math.round(20 + fx.hpf * 3000)})`;
  if (fx.resonance != null && fx.resonance > 0) out += `.lpq(${num(fx.resonance * 20)})`;
  if (fx.room != null && fx.room > 0) out += `.room(${num(fx.room)})`;
  if (fx.delay != null && fx.delay > 0) out += `.delay(${num(fx.delay)})`;
  if (fx.crush != null && fx.crush > 0) out += `.crush(${num(16 - fx.crush * 12)})`;
  if (fx.distort != null && fx.distort > 0) out += `.distort(${num(fx.distort * 4)})`;
  if (fx.speed != null && fx.speed !== 1) out += `.speed(${num(fx.speed)})`;
  if (fx.attack != null && fx.attack > 0) out += `.attack(${num(fx.attack)})`;
  if (fx.release != null && fx.release > 0) out += `.release(${num(fx.release)})`;
  return out;
}

// Convertit une rangée de pas booléens (drum) en mini-notation.
export function drumRowToMini(soundName, steps, probability = 1) {
  const parts = steps.map((on) => {
    if (!on) return '~';
    return probability < 1 ? `${soundName}?${num(probability)}` : soundName;
  });
  return `s("${parts.join(' ')}")`;
}

// Convertit une grille mélodique (rows x steps) en mini-notation empilée.
// grid[stepIndex] = index de note actif (ou null). soundName = instrument.
export function meloGridToMini(soundName, noteRows, cells) {
  // cells: tableau de longueur nbSteps ; chaque case = index de rangée (note) ou null
  const seq = cells.map((noteIdx) => (noteIdx == null ? '~' : noteRows[noteIdx]));
  const isSynth = ['sine', 'sawtooth', 'square', 'triangle'].includes(soundName);
  const src = isSynth ? `.s("${soundName}")` : `.sound("${soundName}")`;
  return `note("${seq.join(' ')}")${src}`;
}

// Assemble plusieurs patterns dans un stack, avec tempo.
export function assemble(patterns, bpm) {
  const clean = patterns.filter(Boolean);
  const cpm = num((bpm || 110) / 4); // 1 cycle = 1 mesure 4/4
  if (!clean.length) return `setcpm(${cpm})\nsilence`;
  return `setcpm(${cpm})\nstack(\n  ${clean.join(',\n  ')}\n)`;
}
