// app.js — contrôleur principal : accueil, transport, montage des modes.
import { startVisuals } from './visuals.js';
import { ensureStrudel, play, stop, isPlaying } from './strudel-engine.js';
import { createSequencer } from './modes/sequencer.js';
import { createPads } from './modes/pads.js';
import { createBlocks } from './modes/blocks.js';
import { createUltraDJ } from './modes/ultradj.js';
import { toast } from './ui.js';

const MODES = {
  sequencer: { title: 'Séquenceur', emoji: '🎛️', desc: 'Une grille par instrument. Allume les cases !', factory: createSequencer },
  pads: { title: 'Pads', emoji: '🟪', desc: 'Des pads à lancer comme un Launchpad.', factory: createPads },
  blocks: { title: 'Blocs', emoji: '🧩', desc: 'Empile des blocs façon Scratch.', factory: createBlocks },
  ultradj: { title: 'Ultra DJ', emoji: '🎚️', desc: 'Triture le son de ton morceau en live.', factory: createUltraDJ },
};

const app = {
  level: 'simple',
  bpm: 110,
  modeKey: null,
  mode: null,
  sessionCode: null, // dernier morceau joué (hors DJ) — base pour l'Ultra DJ
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
  // Mémorise le morceau (hors DJ) pour que l'Ultra DJ puisse le triturer.
  if (app.modeKey !== 'ultradj') app.sessionCode = code;
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
    getSession: () => app.sessionCode,
    isPlaying: () => app.transport.playing,
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
  // Retour à l'accueil : le morceau continue de jouer (on ne coupe pas).
  $('kz-home-btn').addEventListener('click', () => { showScreen('home'); });

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
