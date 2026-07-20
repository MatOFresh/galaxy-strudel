// visualizer.js — animation 2D plein écran, réactive au son (comme Strudel
// online, en plus moderne/trippant). Kaléidoscope + spectre radial + anneaux
// sur les basses + onde hypnotique + particules, palette glace/ambre.
import { readSpectrum, readWaveform, readLevels } from './strudel-engine.js';

const ICE = [87, 209, 255];
const AMBER = [255, 122, 44];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

let overlay, canvas, cx, raf = null, W = 0, H = 0, dpr = 1;
let t = 0, rot = 0, bassAvg = 0, beatEnv = 0, zoom = 1, flash = 0;
let rings = [], particles = [], scene = 0;
const SCENES = ['Kaléido', 'Tunnel', 'Onde'];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 90; i++) {
    particles.push({
      a: Math.random() * Math.PI * 2,
      rad: 60 + Math.random() * Math.min(W, H) * 0.5,
      spd: (Math.random() - 0.5) * 0.01,
      size: 0.6 + Math.random() * 2.2,
      col: mix(ICE, AMBER, Math.random()),
    });
  }
}

function drawSpectrum(spec, scale, alpha, rotOff) {
  const N = 110;
  const baseR = Math.min(W, H) * 0.14 * scale;
  const maxLen = Math.min(W, H) * 0.30 * scale;
  cx.save(); cx.rotate(rotOff);
  for (let i = 0; i < N; i++) {
    const bin = Math.floor((i / N) * (spec.length * 0.62));
    const v = spec ? spec[bin] / 255 : 0.15 + 0.12 * Math.sin(t * 2 + i * 0.3);
    const ang = (i / N) * Math.PI * 2;
    const len = baseR * 0.25 + v * maxLen;
    const c = mix(ICE, AMBER, Math.min(1, (i / N) * 0.7 + v * 0.5));
    cx.strokeStyle = rgba(c, alpha * (0.25 + v));
    cx.lineWidth = 2.4 * scale;
    cx.beginPath();
    cx.moveTo(Math.cos(ang) * baseR, Math.sin(ang) * baseR);
    cx.lineTo(Math.cos(ang) * (baseR + len), Math.sin(ang) * (baseR + len));
    cx.stroke();
  }
  cx.restore();
}

function drawWave(wave, level) {
  const R = Math.min(W, H) * 0.21;
  const M = wave ? wave.length : 128;
  cx.beginPath();
  for (let i = 0; i <= M; i++) {
    const s = wave ? (wave[i % M] - 128) / 128 : 0.12 * Math.sin(i * 0.2 + t * 3);
    const ang = (i / M) * Math.PI * 2;
    const r = R * (1 + s * 0.28 + level * 0.1);
    const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
    i ? cx.lineTo(x, y) : cx.moveTo(x, y);
  }
  cx.closePath();
  cx.strokeStyle = rgba(mix(ICE, AMBER, 0.4 + level * 0.4), 0.75);
  cx.lineWidth = 2.6; cx.stroke();
}

function frame() {
  t += 0.016;
  const spec = readSpectrum();
  const wave = readWaveform();
  const { bass, mid, high, level } = readLevels();

  // détection de beat sur les basses
  bassAvg = bassAvg * 0.92 + bass * 0.08;
  if (bass > bassAvg * 1.32 && bass > 0.22) { beatEnv = 1; flash = 1; rings.push({ r: 0, life: 1 }); }
  beatEnv *= 0.90; flash *= 0.86;
  zoom = 1 + beatEnv * 0.07 + level * 0.05;

  // trails (rémanence => effet trippant)
  cx.globalCompositeOperation = 'source-over';
  cx.fillStyle = 'rgba(8,9,12,0.20)';
  cx.fillRect(0, 0, W, H);

  // flash radial sur le beat
  if (flash > 0.02) {
    const fg = cx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.6);
    fg.addColorStop(0, rgba(AMBER, flash * 0.10));
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = fg; cx.fillRect(0, 0, W, H);
  }

  cx.save();
  cx.translate(W / 2, H / 2);
  cx.scale(zoom, zoom);
  rot += 0.0016 + level * 0.012;
  cx.rotate(rot);
  cx.globalCompositeOperation = 'lighter';

  if (scene === 0) { // Kaléido : spectre en couches symétriques
    drawSpectrum(spec, 1, 0.9, 0);
    drawSpectrum(spec, 0.62, 0.55, Math.PI / 6 + t * 0.05);
    drawSpectrum(spec, 0.34, 0.4, -t * 0.08);
    drawWave(wave, level);
  } else if (scene === 1) { // Tunnel : anneaux concentriques + spectre
    for (let k = 5; k >= 1; k--) {
      cx.save(); cx.rotate(t * 0.1 * (k % 2 ? 1 : -1));
      drawSpectrum(spec, k / 3, 0.5, 0);
      cx.restore();
    }
  } else { // Onde : oscilloscope multiple
    for (let k = 0; k < 4; k++) { cx.save(); cx.rotate(k * Math.PI / 4 + t * 0.06); drawWave(wave, level * (1 - k * 0.15)); cx.restore(); }
    drawSpectrum(spec, 0.5, 0.4, 0);
  }

  // anneaux de choc (beats)
  rings = rings.filter((r) => r.life > 0);
  rings.forEach((r) => {
    r.r += 6 + level * 10; r.life -= 0.02;
    cx.beginPath(); cx.arc(0, 0, r.r, 0, Math.PI * 2);
    cx.strokeStyle = rgba(mix(ICE, AMBER, 0.6), r.life * 0.5);
    cx.lineWidth = 3 * r.life; cx.stroke();
  });

  // particules en orbite
  particles.forEach((p) => {
    p.a += p.spd * (1 + level * 2);
    const r = p.rad * (1 + beatEnv * 0.25);
    const x = Math.cos(p.a) * r, y = Math.sin(p.a) * r;
    cx.fillStyle = rgba(p.col, 0.35 + high * 0.55);
    cx.beginPath(); cx.arc(x, y, p.size * (1 + level), 0, Math.PI * 2); cx.fill();
  });

  cx.restore();
  raf = requestAnimationFrame(frame);
}

export function openVisualizer() {
  if (overlay) return;
  overlay = document.createElement('div');
  overlay.className = 'viz-overlay';
  canvas = document.createElement('canvas');
  canvas.className = 'viz-canvas';
  overlay.append(canvas);

  const bar = document.createElement('div');
  bar.className = 'viz-bar';
  const label = document.createElement('button');
  label.className = 'viz-scene';
  label.textContent = '◉ ' + SCENES[scene];
  label.addEventListener('click', () => { scene = (scene + 1) % SCENES.length; label.textContent = '◉ ' + SCENES[scene]; });
  const close = document.createElement('button');
  close.className = 'viz-close';
  close.textContent = '✕';
  close.addEventListener('click', closeVisualizer);
  bar.append(label, close);
  overlay.append(bar);
  document.body.append(overlay);

  cx = canvas.getContext('2d');
  resize();
  initParticles();
  window.addEventListener('resize', onResize);
  cx.fillStyle = '#08090C'; cx.fillRect(0, 0, W, H);
  if (!raf) frame();
}

function onResize() { resize(); initParticles(); }

export function closeVisualizer() {
  if (raf) { cancelAnimationFrame(raf); raf = null; }
  window.removeEventListener('resize', onResize);
  if (overlay) { overlay.remove(); overlay = null; }
}
