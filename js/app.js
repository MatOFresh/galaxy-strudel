// app.js — contrôleur principal : accueil, transport, montage des modes.
import { startVisuals } from './visuals.js';
import { ensureStrudel, play, stop, isPlaying, readLevels } from './strudel-engine.js';
import { createSequencer } from './modes/sequencer.js';
import { createPads } from './modes/pads.js';
import { openVisualizer } from './visualizer.js';
import { icon } from './icons.js';
import { el, toast } from './ui.js';

const MODES = {
  sequencer: { title: 'Séquenceur', emoji: 'grid', desc: 'Une grille par instrument + Ultra DJ pour triturer le son.', factory: createSequencer },
  pads: { title: 'Pads', emoji: 'pads', desc: 'Des pads à lancer comme un Launchpad.', factory: createPads },
};

const app = {
  level: 'simple',
  bpm: 110,
  modeKey: null,
  mode: null,
  transport: { playing: false, startTime: 0, cps: 110 / 240 },
};

const $ = (id) => document.getElementById(id);

function getAudioTime() {
  try { return window.getAudioContext ? window.getAudioContext().currentTime : 0; } catch { return 0; }
}

// ---- Lecture ----
async function doPlay() {
  if (!app.mode) return;
  const code = app.mode.buildCode();
  const wasPlaying = app.transport.playing;
  app.transport.playing = true;     // état synchrone -> le bouton pause ne rate jamais
  updatePlayBtn();
  const res = await play(code);
  if (!res.ok) { app.transport.playing = wasPlaying; updatePlayBtn(); toast('Oups, réessaie 🎧'); return; }
  if (!wasPlaying) app.transport.startTime = getAudioTime();
  app.transport.cps = app.bpm / 240;
}

function doStop() {
  stop();
  app.transport.playing = false;
  updatePlayBtn();
}

function updatePlayBtn() {
  const b = $('kz-play');
  if (!b) return;
  b.classList.toggle('playing', app.transport.playing);
  b.innerHTML = app.transport.playing ? icon('pause') : icon('play');
}

function requestPlay() { if (app.transport.playing) doPlay(); }

// ---- Code Window : montre le code Strudel généré en direct ----
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function highlightStrudel(code) {
  let h = escHtml(code);
  h = h.replace(/"([^"]*)"/g, '<span class="s">"$1"</span>');       // mini-notation / strings
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="n">$1</span>');   // nombres
  h = h.replace(/\b([a-zA-Z_]\w*)(\()/g, '<span class="f">$1</span>$2'); // fonctions
  return h;
}
function openCodeWindow() {
  if (document.querySelector('.kz-code-overlay')) return;
  const overlay = el('div', 'kz-code-overlay');
  const panel = el('div', 'kz-code-panel');
  const head = el('div', 'kz-code-head');
  const title = el('span', 'kz-code-title'); title.innerHTML = `${icon('code')} Code Window`;
  const actions = el('div', 'kz-code-actions');
  const copy = el('button', 'kz-code-btn2', 'Copier');
  const close = el('button', 'kz-code-btn2'); close.innerHTML = icon('close');
  actions.append(copy, close);
  head.append(title, actions);
  const pre = el('pre', 'kz-code-pre');
  const codeEl = el('code');
  pre.append(codeEl);
  panel.append(head, pre);
  overlay.append(panel);
  document.body.append(overlay);

  let last = null;
  const refresh = () => {
    const c = (app.mode && app.mode.buildCode) ? app.mode.buildCode() : '// choisis un mode';
    if (c !== last) { last = c; codeEl.innerHTML = highlightStrudel(c); }
  };
  refresh();
  const timer = setInterval(refresh, 150); // mise à jour live

  const shut = () => { clearInterval(timer); overlay.remove(); };
  close.addEventListener('click', shut);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) shut(); });
  copy.addEventListener('click', () => {
    try { navigator.clipboard.writeText(last || ''); toast('Code copié'); } catch (_) { toast('Copie indispo'); }
  });
}

// Curseur de lecture synchronisé sur l'horloge audio.
function tickLoop() {
  const fab = $('kz-play');
  if (app.transport.playing) {
    const { level } = readLevels();
    if (fab) fab.style.setProperty('--beat', level.toFixed(3)); // pulsation du FAB sur le son
    if (app.mode && app.mode.highlight) {
      const steps = app.mode.stepsCount ? app.mode.stepsCount() : 16;
      const cycles = (getAudioTime() - app.transport.startTime) * app.transport.cps;
      const step = ((Math.floor(cycles * steps) % steps) + steps) % steps;
      app.mode.highlight(step);
    }
  } else if (fab) {
    fab.style.setProperty('--beat', '0');
  }
  requestAnimationFrame(tickLoop);
}

// ---- Montage d'un mode ----
// On NE coupe PAS le son : le morceau continue quand on change de mode.
function mountMode(key) {
  if (app.mode && app.mode.destroy) app.mode.destroy();
  app.modeKey = key;
  const container = $('kz-mode-root');
  container.innerHTML = '';
  const modeCtx = {
    root: container,
    getLevel: () => app.level,
    getBpm: () => app.bpm,
    isPlaying: () => app.transport.playing,
    getElapsedCycles: () => (app.transport.playing ? (getAudioTime() - app.transport.startTime) * app.transport.cps : -1),
    requestPlay,
    registerBuildCode: () => {},
  };
  app.mode = MODES[key].factory(modeCtx);
  app.mode.init();
  $('kz-mode-name').innerHTML = `<span class="kz-mode-name-ic">${icon(MODES[key].emoji)}</span>${MODES[key].title}`;
  showScreen('studio');
}

// ---- Écrans ----
function showScreen(name) {
  $('kz-home').classList.toggle('hidden', name !== 'home');
  $('kz-studio').classList.toggle('hidden', name !== 'studio');
  $('kz-play').classList.toggle('hidden', name !== 'studio'); // FAB visible en studio seulement
}

function buildHome() {
  const grid = $('kz-mode-cards');
  grid.innerHTML = '';
  Object.entries(MODES).forEach(([key, m]) => {
    const card = document.createElement('button');
    card.className = 'kz-mode-card';
    card.innerHTML = `<div class="kz-mode-emoji">${icon(m.emoji)}</div><div class="kz-mode-title">${m.title}</div><div class="kz-mode-desc">${m.desc}</div>`;
    card.addEventListener('click', async () => {
      card.classList.add('loading');
      await ensureStrudel();      // charge les sons (peut prendre qq secondes)
      mountMode(key);
    });
    grid.append(card);
  });
  // toggle niveau sur l'accueil
  syncLevelButtons();
}

function setLevel(level) {
  app.level = level;
  syncLevelButtons();
  if (app.mode && app.mode.onLevelChange) { app.mode.onLevelChange(level); requestPlay(); }
}

function syncLevelButtons() {
  document.querySelectorAll('[data-level]').forEach((b) => {
    b.classList.toggle('active', b.dataset.level === app.level);
  });
}

// ---- Init ----
function init() {
  startVisuals($('kz-galaxy'));
  buildHome();

  // Icônes SVG des boutons statiques
  $('kz-home-btn').innerHTML = icon('home');
  $('kz-viz-btn').innerHTML = icon('kaleido');
  $('kz-code-btn').innerHTML = icon('code') + ' Code';
  $('kz-code-btn').addEventListener('click', openCodeWindow);
  updatePlayBtn();

  // Boutons niveau (présents sur accueil + studio) : robot = simple, cpu = expert
  document.querySelectorAll('[data-level]').forEach((b) => {
    const big = b.closest('.kz-level-switch.big');
    const lbl = b.dataset.level === 'simple' ? 'Simple' : 'Expert';
    b.innerHTML = icon(b.dataset.level === 'simple' ? 'robot' : 'cpu') + (big ? ' <span class="kz-lvl-txt">' + lbl + '</span>' : '');
    b.addEventListener('click', () => setLevel(b.dataset.level));
  });

  $('kz-play').addEventListener('click', () => (app.transport.playing ? doStop() : doPlay()));
  // Retour à l'accueil : le morceau continue de jouer (on ne coupe pas).
  $('kz-home-btn').addEventListener('click', () => { showScreen('home'); });
  $('kz-viz-btn').addEventListener('click', openVisualizer);

  const tempo = $('kz-tempo');
  tempo.addEventListener('input', () => {
    app.bpm = +tempo.value;
    $('kz-tempo-val').textContent = app.bpm + ' BPM';
    app.transport.cps = app.bpm / 240;
    // resync l'origine pour éviter un saut du curseur
    app.transport.startTime = getAudioTime();
    requestPlay();
  });

  requestAnimationFrame(tickLoop);

  // PWA : service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
