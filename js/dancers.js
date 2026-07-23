// dancers.js — danseurs pixel-art (manga branché) qui dansent en rythme sur
// chaque ligne d'instrument. Personnages procéduraux détaillés (mec torse
// athlétique + cargo, fille cheveux longs + crop top), poses variées calées au
// beat, va-et-vient lent de sens variable. Dessin pixelisé (fillRect).

const HAIR_HL = ['#57D1FF', '#FF5DA2', '#B47CFF', '#FF7A2C', '#35E3C2', '#FFD54A'];
const TOPS = ['#FF5DA2', '#57D1FF', '#B47CFF', '#35E3C2', '#FF7A2C', '#F4D03F'];

export function makeChar(seed) {
  const gender = seed % 2 === 0 ? 'mec' : 'fille';
  return {
    seed, gender,
    hl: HAIR_HL[seed % HAIR_HL.length],     // mèche / reflet cheveux
    top: TOPS[(seed * 5 + 2) % TOPS.length], // crop top (fille) / lacets & semelle
    skin: '#F0C088', skinD: '#CF9557',
    hair: gender === 'fille' ? '#221826' : '#15151e',
    pants: gender === 'fille' ? '#191922' : '#23252f',
    trav: 0.10 + (seed % 4) * 0.028,        // vitesse de déplacement (lente, variable)
    off: (seed * 0.41) % 2,                 // phase de départ (sens variable)
  };
}

// Poses (offsets en unités) : mains depuis l'épaule, pieds depuis la hanche,
// hd = inclinaison de la tête, by = descente du corps (squat), sw = pas latéral.
const POSES = [
  { la: [-2.5, 1], ra: [2.5, 1], ll: [-2, 0], rl: [2, 0] },                         // groove
  { la: [-2, 2], ra: [5, -3], ll: [-1.5, 0], rl: [2.5, 0] },                        // pointer
  { la: [-2, 2], ra: [1.5, -6], ll: [-2, 0], rl: [2, 0] },                          // bras levé
  { la: [-4, -1], ra: [4, -1], ll: [-2, 0], rl: [2, 0], hd: [0, -0.6] },            // chest pop
  { la: [-3, 1.5], ra: [3, 1.5], ll: [-3, 0], rl: [1, 0], sw: 1 },                  // step touch
  { la: [-3.5, -3], ra: [3.5, -3], ll: [-2.5, 0], rl: [2.5, 0], hd: [1, 0] },       // hip roll
  { la: [-4, -3.5], ra: [3.5, 1], ll: [-1.5, 0], rl: [2, 0] },                      // wave
  { la: [-2, -3], ra: [3, 2], ll: [-3, -3], rl: [1.5, 0] },                         // kick
  { la: [-3, -1], ra: [2.5, 1.5], ll: [-2, 0], rl: [2, 0], hd: [1.2, 0.4] },        // body roll
  { la: [-2.5, 1], ra: [2.5, 1], ll: [2, 0], rl: [-2, 0] },                         // cross step
  { la: [-4, 0], ra: [4, 0], ll: [-2, 0], rl: [2, 0], hd: [0, 1.4] },               // headbang
  { la: [-4.5, 0.5], ra: [4.5, 0.5], ll: [-3, 0], rl: [3, 0], by: 2 },              // hip drop (squat)
  { la: [3, -1], ra: [4.5, -2], ll: [-3, 0], rl: [3, 0] },                          // side step
  { la: [-4, -2], ra: [-1, -2], ll: [-2, 0], rl: [2, 0], hd: [-1, 0] },             // turn
  { la: [-2, -6], ra: [2, -6], ll: [-2, 0], rl: [2, 0] },                           // hands up
  { la: [-0.5, -3.5], ra: [0.5, -3.5], ll: [-2, 0], rl: [2, 0] },                   // clap
];

export function drawDancer(g, W, H, t, playing, steps, char) {
  g.clearRect(0, 0, W, H);
  if (W < 8 || H < 8) return;
  const u = Math.max(3, Math.floor(H / 15));   // le perso ENTIER tient dans la hauteur
  const beat = t * 4;
  const margin = 7 * u;
  // Déplacement : triangle (va-et-vient) lent, phase/sens variables par danseur.
  const phase = t * char.trav + char.off;
  const tri = Math.abs(((phase % 2) + 2) % 2 - 1);              // 0..1..0
  const sway = Math.sin(beat * Math.PI) * u * 0.7;             // petit pas latéral au beat
  const cx = margin + tri * Math.max(1, W - 2 * margin) + sway;
  const bounce = playing ? Math.abs(Math.sin(beat * Math.PI)) : 0.15 * (1 + Math.sin(beat * Math.PI));
  const wig = Math.sin(beat * Math.PI * 2) * (playing ? 1 : 0.4);
  const bi = Math.floor(beat);
  const pose = POSES[((bi * 7 + char.seed * 3) % POSES.length + POSES.length) % POSES.length];
  const footY = H - u * 0.6 - bounce * u * 1.2 + (pose.by || 0) * u;
  drawChar(g, cx, footY, u, char, pose, wig);
}

function limb(g, x0, y0, x1, y1, wq, c) {
  g.fillStyle = c;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.4) + 1;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    g.fillRect(Math.round(x0 + (x1 - x0) * k - wq / 2), Math.round(y0 + (y1 - y0) * k - wq / 2), Math.ceil(wq), Math.ceil(wq));
  }
}

function drawChar(g, cx, footY, u, ch, pose, wig) {
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
  const hipY = footY - 4 * u;
  const shY = hipY - 4 * u;
  const headBot = shY - 0.6 * u;
  const headTop = headBot - 3.4 * u;
  const fem = ch.gender === 'fille';

  // --- Jambes + baskets ---
  const lf = { x: cx + (pose.ll[0] - wig * 0.6) * u, y: footY + pose.ll[1] * u };
  const rf = { x: cx + (pose.rl[0] + wig * 0.6) * u, y: footY + pose.rl[1] * u };
  limb(g, cx - 1.1 * u, hipY, lf.x, lf.y - u, u * 1.25, ch.pants);
  limb(g, cx + 1.1 * u, hipY, rf.x, rf.y - u, u * 1.25, ch.pants);
  if (fem) { // bande de cuisse (thigh-high)
    px(lf.x - 0.9 * u, lf.y - 2.6 * u, 1.8 * u, 1 * u, '#2b2030');
    px(rf.x - 0.9 * u, rf.y - 2.6 * u, 1.8 * u, 1 * u, '#2b2030');
  }
  const shoe = (f) => { px(f.x - 1.3 * u, f.y - u, 2.6 * u, u, '#f2f2f2'); px(f.x - 1.3 * u, f.y - 0.2 * u, 2.6 * u, 0.4 * u, ch.top); };
  shoe(lf); shoe(rf);

  // --- Bassin / short / cargo ---
  px(cx - 2 * u, hipY - 0.4 * u, 4 * u, 1.8 * u, ch.pants);
  if (!fem) { px(cx + 1.6 * u, hipY, 0.6 * u, 2.4 * u, '#8a8f9c'); px(cx + 1.4 * u, hipY + 2 * u, 1 * u, 0.5 * u, '#8a8f9c'); } // chaîne

  // --- Torse ---
  if (fem) {
    px(cx - 2 * u, shY, 4 * u, 1.6 * u, ch.top);            // crop top
    px(cx - 1.7 * u, shY + 1.6 * u, 3.4 * u, hipY - shY - 1.6 * u, ch.skin); // ventre nu
  } else {
    px(cx - 2 * u, shY, 4 * u, hipY - shY, ch.skin);        // torse nu
    px(cx - 1.6 * u, shY + 1 * u, 3.2 * u, 0.5 * u, ch.skinD);  // pectoraux
    px(cx - 0.4 * u, shY + 2 * u, 0.8 * u, 2 * u, ch.skinD);    // ligne abdos
    px(cx - 1.7 * u, shY + 2.3 * u, 0.5 * u, 0.5 * u, ch.skinD);
    px(cx + 1.2 * u, shY + 2.3 * u, 0.5 * u, 0.5 * u, ch.skinD);
  }
  // gilet ouvert (mec) : deux bandes sombres sur les côtés
  if (!fem) { px(cx - 2.4 * u, shY - 0.2 * u, 0.7 * u, 4 * u, '#1b1d26'); px(cx + 1.7 * u, shY - 0.2 * u, 0.7 * u, 4 * u, '#1b1d26'); }

  // --- Bras (avec mains) ---
  const lh = { x: cx + (pose.la[0] + wig) * u, y: shY + pose.la[1] * u };
  const rh = { x: cx + (pose.ra[0] - wig) * u, y: shY + pose.ra[1] * u };
  const elbow = (sx, h) => ({ x: (sx + h.x) / 2 + (h.x - sx) * 0.05, y: (shY + 0.6 * u + h.y) / 2 });
  const drawArm = (sx, h) => { const e = elbow(sx, h); limb(g, sx, shY + 0.6 * u, e.x, e.y, u * 1.05, fem ? ch.skin : ch.skin); limb(g, e.x, e.y, h.x, h.y, u * 1.05, ch.skin); px(h.x - 0.8 * u, h.y - 0.8 * u, 1.6 * u, 1.6 * u, ch.skin); };
  drawArm(cx - 1.9 * u, lh);
  drawArm(cx + 1.9 * u, rh);

  // --- Tête ---
  const hx = cx + (pose.hd ? pose.hd[0] * u : 0), hy = pose.hd ? pose.hd[1] * u : 0;
  px(hx - 1.8 * u, headTop + hy, 3.6 * u, headBot - headTop, ch.skin);
  // Cheveux
  if (fem) {
    px(hx - 2.2 * u, headTop - 1.2 * u + hy, 4.4 * u, 2.4 * u, ch.hair);      // volume dessus
    px(hx - 2.2 * u, headTop + hy, 0.9 * u, 5.5 * u, ch.hair);                // longue mèche G
    px(hx + 1.3 * u, headTop + hy, 0.9 * u, 5.5 * u, ch.hair);                // longue mèche D
    px(hx - 2.2 * u, headTop + 3 * u + hy, 0.9 * u, 2.5 * u, ch.hl);          // reflet coloré
    px(hx + 1.3 * u, headTop + 4 * u + hy, 0.9 * u, 1.5 * u, ch.hl);
    px(hx - 1.4 * u, headTop + 0.2 * u + hy, 2.8 * u, 0.9 * u, ch.hair);      // frange
  } else {
    px(hx - 2 * u, headTop + 0.2 * u + hy, 4 * u, 1.4 * u, ch.hair);          // masse
    // épis
    px(hx - 2 * u, headTop - 1.1 * u + hy, 1 * u, 1.5 * u, ch.hair);
    px(hx - 0.6 * u, headTop - 1.6 * u + hy, 1 * u, 2 * u, ch.hair);
    px(hx + 0.8 * u, headTop - 1.2 * u + hy, 1 * u, 1.6 * u, ch.hair);
    px(hx + 1.6 * u, headTop - 0.4 * u + hy, 0.9 * u, 1.2 * u, ch.hair);
    px(hx - 0.4 * u, headTop - 1.5 * u + hy, 0.5 * u, 1 * u, ch.hl);          // mèche colorée
  }
  // Visage : yeux (style manga) + éclat
  px(hx - 1.1 * u, headTop + 1.7 * u + hy, 0.8 * u, 1.1 * u, '#15161d');
  px(hx + 0.4 * u, headTop + 1.7 * u + hy, 0.8 * u, 1.1 * u, '#15161d');
  px(hx - 1 * u, headTop + 1.8 * u + hy, 0.35 * u, 0.4 * u, '#ffffff');
  px(hx + 0.5 * u, headTop + 1.8 * u + hy, 0.35 * u, 0.4 * u, '#ffffff');
}
