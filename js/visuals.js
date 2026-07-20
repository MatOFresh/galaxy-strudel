// visuals.js — fond galaxie animé + réactif au son.
import { readLevels } from './strudel-engine.js';

let canvas, ctx, stars = [], planets = [], w = 0, h = 0, raf = null, t = 0;

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth; h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function seedRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function initField() {
  const rnd = seedRand(1234);
  stars = [];
  const count = Math.min(220, Math.floor((w * h) / 6000));
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rnd() * w, y: rnd() * h,
      z: 0.2 + rnd() * 0.8,
      r: 0.4 + rnd() * 1.6,
      tw: rnd() * Math.PI * 2,
    });
  }
  // Duotone glace/ambre + acier, désaturé pour un halo ambiant discret.
  const colors = ['#57D1FF', '#FF7A2C', '#2B7FE0', '#6B7688', '#FFB65A'];
  planets = [];
  for (let i = 0; i < 5; i++) {
    planets.push({
      x: rnd() * w, y: rnd() * h,
      baseR: 40 + rnd() * 120,
      color: colors[i % colors.length],
      drift: 0.1 + rnd() * 0.3,
      phase: rnd() * Math.PI * 2,
    });
  }
}

function frame() {
  t += 0.016;
  const { bass, mid, high, level } = readLevels();

  // Fond dégradé graphite (premium, neutre froid).
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#08090C');
  g.addColorStop(0.5, '#0B0D12');
  g.addColorStop(1, '#0F1319');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Nébuleuses / planètes qui gonflent avec les basses/mediums.
  ctx.globalCompositeOperation = 'lighter';
  planets.forEach((p, i) => {
    const energy = i % 2 === 0 ? bass : mid;
    const r = p.baseR * (1 + energy * 0.9);
    const cx = p.x + Math.cos(t * p.drift + p.phase) * 30;
    const cy = p.y + Math.sin(t * p.drift * 0.8 + p.phase) * 24;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0, hexA(p.color, 0.35 + energy * 0.4));
    grd.addColorStop(1, hexA(p.color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  // Étoiles scintillantes, poussées par les aigus.
  stars.forEach((s) => {
    s.tw += 0.05 + high * 0.3;
    const a = 0.4 + Math.sin(s.tw) * 0.3 + high * 0.4;
    const r = s.r * (1 + level * 0.8 * s.z);
    ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a)})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();
    // léger déplacement pour un effet hyperspace subtil sur les gros beats.
    s.y += s.z * (0.1 + bass * 1.6);
    if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
  });
  ctx.globalCompositeOperation = 'source-over';

  raf = requestAnimationFrame(frame);
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function startVisuals(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();
  initField();
  window.addEventListener('resize', () => { resize(); initField(); });
  if (!raf) frame();
}
