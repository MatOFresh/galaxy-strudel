// app.js — contrôleur principal : accueil, transport, montage des modes.
import { startVisuals } from './visuals.js';
import { ensureStrudel, play, stop, isPlaying } from './strudel-engine.js';
import { createSequencer } from './modes/sequencer.js';
import { createPads } from './modes/pads.js';
import { createBlocks } from './modes/blocks.js';
import { toast } from './ui.js';

const MODES = {
  sequencer: { title: 'Séquenceur', emoji: '🎛️', desc: 'Une grille par instrument. Allume les cases !', factory: createSequencer },
  pads: { title: 'Pads', emoji: '🟪', desc: 'Des pads à lancer comme un Launchpad.', factory: createPads },
  blocks: { title: 'Blocs', emoji: '🧩', desc: 'Empile des blocs façon Scratch.', factory: createBlocks },
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
  const res = await play(code);
  if (!res.ok) { toast('Oups, réessaie 🎧'); return; }
  if (!app.transport.playing) {
    app.transport.startTime = getAudioTime();
  }
  app.transport.playing = true;
  app.transport.cps = app.bpm / 240;
  updatePlayBtn();
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
  b.innerHTML = app.transport.playing ? '⏸️' : '▶️';
}

function requestPlay() { if (app.transport.playing) doPlay(); }

// Curseur de lecture synchronisé sur l'horloge audio.
function tickLoop() {
  if (app.transport.playing && app.mode && app.mode.highlight) {
    const steps = app.mode.stepsCount ? app.mode.stepsCount() : 16;
    const elapsed = getAudioTime() - app.transport.startTime;
    const cycles = elapsed * app.transport.cps;
    const step = ((Math.floor(cycles * steps) % steps) + steps) % steps;
    app.mode.highlight(step);
  }
  requestAnimationFrame(tickLoop);
}

// ---- Montage d'un mode ----
function mountMode(key) {
  if (app.mode && app.mode.destroy) app.mode.destroy();
  doStop();
  app.modeKey = key;
  const container = $('kz-mode-root');
  container.innerHTML = '';
  const modeCtx = {
    root: container,
    getLevel: () => app.level,
    getBpm: () => app.bpm,
    requestPlay,
    registerBuildCode: () => {},
  };
  app.mode = MODES[key].factory(modeCtx);
  app.mode.init();
  $('kz-mode-name').textContent = `${MODES[key].emoji} ${MODES[key].title}`;
  showScreen('studio');
}

// ---- Écrans ----
function showScreen(name) {
  $('kz-home').classList.toggle('hidden', name !== 'home');
  $('kz-studio').classList.toggle('hidden', name !== 'studio');
}

function buildHome() {
  const grid = $('kz-mode-cards');
  grid.innerHTML = '';
  Object.entries(MODES).forEach(([key, m]) => {
    const card = document.createElement('button');
    card.className = 'kz-mode-card';
    card.innerHTML = `<div class="kz-mode-emoji">${m.emoji}</div><div class="kz-mode-title">${m.title}</div><div class="kz-mode-desc">${m.desc}</div>`;
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

  // Boutons niveau (présents sur accueil + studio)
  document.querySelectorAll('[data-level]').forEach((b) => {
    b.addEventListener('click', () => setLevel(b.dataset.level));
  });

  $('kz-play').addEventListener('click', () => (app.transport.playing ? doStop() : doPlay()));
  $('kz-home-btn').addEventListener('click', () => { doStop(); showScreen('home'); });

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
