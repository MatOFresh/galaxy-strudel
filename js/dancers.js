// dancers.js — petits danseurs pixel-art (façon manga branché) qui dansent en
// rythme sur chaque ligne d'instrument. Personnages procéduraux (mec/fille),
// poses variées qui changent au beat, rebond + wiggle, déplacement droite->gauche.
// Dessinés en pixels (fillRect) -> look pixelisé. Faible hauteur : overlay sur
// les cases (pointer-events:none), n'ajoute pas de hauteur au séquenceur.

const HAIR = ['#57D1FF', '#FF5DA2', '#B47CFF', '#FF7A2C', '#35E3C2', '#FFD54A'];
const SHIRT = ['#FF5DA2', '#57D1FF', '#B47CFF', '#35E3C2', '#FF7A2C', '#F4D03F'];

export function makeChar(seed) {
  const gender = seed % 2 === 0 ? 'mec' : 'fille';
  return {
    seed, gender,
    hair: HAIR[seed % HAIR.length],
    shirt: SHIRT[(seed * 5 + 2) % SHIRT.length],
    skin: '#F2C6A0', shoe: '#ffffff',
    pants: gender === 'fille' ? '#242a3a' : '#39414f',
    speed: 0.18 + (seed % 5) * 0.05,   // vitesse de traversée (varie par piste)
    off: (seed * 0.37) % 1,            // décalage de phase
  };
}

// Offsets (en unités) : mains depuis l'épaule, pieds depuis la hanche.
// x+ = droite, y+ = bas. Poses volontairement très "dansantes" et variées.
const POSES = [
  { la: [-3, -3.5], ra: [3, -3.5], ll: [-2, 0], rl: [2, 0] },     // bras en V
  { la: [-3, 2], ra: [3, -4], ll: [-1, -1.5], rl: [2, 0] },       // un bras haut / un bas
  { la: [-4.5, -0.5], ra: [4.5, -0.5], ll: [-3, 0], rl: [3, 0] }, // grand écart bras
  { la: [-2, -4], ra: [2.5, 2], ll: [-2.5, -2], rl: [1.5, 0] },   // coup de pied
  { la: [-1.5, 2], ra: [1.5, 2], ll: [-3, -0.5], rl: [3, -0.5] }, // mains aux hanches, jambes larges
  { la: [-3, -4], ra: [3.5, -1], ll: [0, -2], rl: [2, 0] },       // vague
  { la: [3, -3], ra: [3.5, -4], ll: [-2, -1], rl: [2, -2.5] },    // torsion (bras d'un côté)
  { la: [-3.5, -4], ra: [-2, -4], ll: [-2, 0], rl: [2, -1.5] },   // deux bras en l'air
];

export function drawDancer(g, W, H, t, playing, steps, char) {
  g.clearRect(0, 0, W, H);
  if (W < 8 || H < 8) return;
  const u = Math.max(2, Math.round(H / 15));
  const beat = t * 4;                                    // 4 temps par mesure
  const margin = 6 * u;
  const trav = (t * char.speed + char.off) % 1;          // 0..1
  const cx = margin + (1 - trav) * Math.max(1, W - 2 * margin); // droite -> gauche
  const bounce = playing ? Math.abs(Math.sin(beat * Math.PI)) : 0.12 * (1 + Math.sin(beat * Math.PI));
  const wig = Math.sin(beat * Math.PI * 2) * (playing ? 1 : 0.5);
  const pi = Math.floor(beat);
  const pose = POSES[((pi * 3 + char.seed) % POSES.length + POSES.length) % POSES.length];
  const footY = H - u - bounce * u * 1.4;
  drawChar(g, cx, footY, u, char, pose, wig);
}

function limb(g, x0, y0, x1, y1, wq, c) {
  g.fillStyle = c;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5) + 1;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    g.fillRect(Math.round(x0 + (x1 - x0) * k - wq / 2), Math.round(y0 + (y1 - y0) * k - wq / 2), Math.ceil(wq), Math.ceil(wq));
  }
}

function drawChar(g, cx, footY, u, ch, pose, wig) {
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
  const hipY = footY - 4 * u;
  const shY = hipY - 5 * u;
  const headTop = shY - 5 * u;

  // Jambes (les pieds bougent en opposition avec le wiggle)
  const lfx = cx + (pose.ll[0] - wig) * u, lfy = footY + pose.ll[1] * u;
  const rfx = cx + (pose.rl[0] + wig) * u, rfy = footY + pose.rl[1] * u;
  limb(g, cx - 1.2 * u, hipY, lfx, lfy, u * 1.3, ch.pants);
  limb(g, cx + 1.2 * u, hipY, rfx, rfy, u * 1.3, ch.pants);
  px(lfx - u, lfy - 0.6 * u, 2 * u, 1.2 * u, ch.shoe);        // baskets
  px(rfx - u, rfy - 0.6 * u, 2 * u, 1.2 * u, ch.shoe);

  // Torse (+ jupe pour la fille)
  px(cx - 2 * u, shY, 4 * u, hipY - shY, ch.shirt);
  if (ch.gender === 'fille') px(cx - 3 * u, hipY - 1.2 * u, 6 * u, 2.4 * u, ch.shirt);

  // Bras (les mains bougent avec le wiggle)
  const lhx = cx + (pose.la[0] + wig) * u, lhy = shY + pose.la[1] * u;
  const rhx = cx + (pose.ra[0] - wig) * u, rhy = shY + pose.ra[1] * u;
  limb(g, cx - 2 * u, shY + 0.5 * u, lhx, lhy, u * 1.15, ch.shirt);
  limb(g, cx + 2 * u, shY + 0.5 * u, rhx, rhy, u * 1.15, ch.shirt);
  px(lhx - 0.7 * u, lhy - 0.7 * u, 1.4 * u, 1.4 * u, ch.skin); // mains
  px(rhx - 0.7 * u, rhy - 0.7 * u, 1.4 * u, 1.4 * u, ch.skin);

  // Tête
  px(cx - 2 * u, headTop, 4 * u, 4 * u, ch.skin);
  // Cheveux (fille = longs, mec = épis)
  if (ch.gender === 'fille') {
    px(cx - 2.6 * u, headTop - 1 * u, 5.2 * u, 2.6 * u, ch.hair);
    px(cx - 2.6 * u, headTop, 1.1 * u, 5 * u, ch.hair);
    px(cx + 1.5 * u, headTop, 1.1 * u, 5 * u, ch.hair);
  } else {
    px(cx - 2.3 * u, headTop - 0.6 * u, 4.6 * u, 1.7 * u, ch.hair);
    px(cx - 1.8 * u, headTop - 1.7 * u, 1.1 * u, 1.3 * u, ch.hair);
    px(cx + 0.7 * u, headTop - 1.7 * u, 1.1 * u, 1.3 * u, ch.hair);
  }
  // Yeux
  px(cx - 1.2 * u, headTop + 2 * u, 0.8 * u, 0.9 * u, '#12131a');
  px(cx + 0.5 * u, headTop + 2 * u, 0.8 * u, 0.9 * u, '#12131a');
}
