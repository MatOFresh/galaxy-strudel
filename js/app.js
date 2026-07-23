// app.js — contrôleur principal : accueil, transport, montage des modes.
import { startVisuals } from './visuals.js';
import { ensureStrudel, play, stop, isPlaying, readLevels } from './strudel-engine.js';
import { createSequencer } from './modes/sequencer.js';
import { createPads } from './modes/pads.js';
import { openVisualizer } from './visualizer.js';
import { icon } from './icons.js';
import { el, toast, slider } from './ui.js';

const MODES = {
  sequencer: { title: 'Séquenceur', emoji: 'grid', desc: 'Une grille par instrument + Ultra DJ pour triturer le son.', factory: createSequencer },
  pads: { title: 'Pads', emoji: 'pads', desc: 'Des pads à lancer comme un Launchpad.', factory: createPads },
};

const app = {
  level: 'simple',
  bpm: 110,
  modeKey: null,
  mode: null,
  quantize: true,   // lancement quantifié : les changements "launch" tombent sur la mesure
  metronome: false, // clic de métronome par-dessus le mix (aide au calage)
  // Tranche master (bus global) : volume + filtre + limiteur anti-saturation.
  master: { vol: 0.85, filter: 0.5, limiter: true, limiterOk: true }, // filter .5 = off
  transport: { playing: false, startTime: 0, cps: 110 / 240 },
};

const $ = (id) => document.getElementById(id);

function getAudioTime() {
  try { return window.getAudioContext ? window.getAudioContext().currentTime : 0; } catch { return 0; }
}

// ---- Bus master : suffixe d'effets appliqué à TOUT le mix (tous modes) ----
function masterFxStr(withLimiter) {
  const m = app.master;
  let fx = '';
  // Filtre master bipolaire : 0.5 = off ; à gauche ça ferme (passe-bas),
  // à droite ça éclaircit (passe-haut). Zone morte au centre.
  if (m.filter < 0.46) { const t = m.filter / 0.46; fx += `.lpf(${Math.round(130 + t * t * 6800)})`; }
  else if (m.filter > 0.54) { const t = (m.filter - 0.54) / 0.46; fx += `.hpf(${Math.round(50 + t * t * 3800)})`; }
  if (withLimiter) fx += '.compressor("-3:10:4:0.003:0.1")'; // limiteur de bus (anti-saturation)
  const v = Math.round(m.vol * 1000) / 1000;
  if (v !== 1) fx += `.gain(${v})`;
  return fx;
}
function useLimiter() { return app.master.limiter && app.master.limiterOk !== false; }

// FX one-shots performables (transitions de DJ). `layer` = motif empilé sur le
// mix ; `mixfx` = effet appliqué au mix entier (ex : tape-stop). `bars` = durée
// avant retour automatique à la normale.
const FX_SHOTS = {
  riser: { label: 'Riser', icon: 'burst', bars: 2, layer: 's("wind").slow(2).gain(0.5).lpf(saw.range(500,11000).slow(2))' },
  impact: { label: 'Impact', icon: 'drop', bars: 1, layer: 's("bd").gain(1.1).lpf(500).room(0.8)' },
  reverse: { label: 'Reverse', icon: 'reverse', bars: 1, layer: 's("cr").speed(-1).gain(0.6).room(0.35)' },
  tapestop: { label: 'Tape-stop', icon: 'slow', bars: 1, mixfx: '.speed(saw.range(1,0.04))' },
};
const FX_SHOT_LIST = Object.entries(FX_SHOTS).map(([id, f]) => ({ id, label: f.label, icon: f.icon }));

function triggerFxShot(kind) {
  if (!app.transport.playing) { toast('Lance la musique d\'abord ▶︎'); return; }
  if (!FX_SHOTS[kind]) return;
  app.fxShot = kind;
  doPlay();                                   // ré-évalue avec le one-shot (clock continu -> pas de saut)
  if (app.fxTimer) clearTimeout(app.fxTimer);
  const durMs = FX_SHOTS[kind].bars * (1000 / app.transport.cps); // 1 cycle = 1 mesure
  app.fxTimer = setTimeout(() => { app.fxShot = null; app.fxTimer = null; if (app.transport.playing) doPlay(); }, durMs);
}
// Code complet joué = (motif du mode + tranche master) [+ métronome par-dessus].
// On sépare la ligne setcpm(...) du motif pour pouvoir empiler le clic SANS le
// faire passer par le filtre master (sinon on perdrait le clic en filtrant).
function composeCode(withLimiter) {
  const base = (app.mode && app.mode.buildCode) ? app.mode.buildCode() : 'silence';
  const nl = base.indexOf('\n');
  const prefix = nl >= 0 ? base.slice(0, nl + 1) : '';
  let mix = (nl >= 0 ? base.slice(nl + 1) : base);
  const shot = app.fxShot ? FX_SHOTS[app.fxShot] : null;
  if (shot && shot.mixfx) mix += shot.mixfx;                    // ex : tape-stop (ralenti global)
  let pat = mix + masterFxStr(withLimiter);
  if (app.metronome) pat = `stack(${pat}, s("click*4").gain(0.35))`;
  if (shot && shot.layer) pat = `stack(${pat}, ${shot.layer})`; // ex : riser / impact / reverse
  return prefix + pat;
}
function fullCode() { return composeCode(useLimiter()); }

// ---- Lecture ----
async function doPlay() {
  if (!app.mode) return;
  const base = app.mode.buildCode();
  const wasPlaying = app.transport.playing;
  app.transport.playing = true;     // état synchrone -> le bouton pause ne rate jamais
  updatePlayBtn();
  // Essaie avec le master complet ; repli sans limiteur (si compressor indispo),
  // puis motif brut : la lecture ne casse jamais à cause de la tranche master.
  const lim = useLimiter();
  let res = await play(composeCode(lim));
  if (!res.ok && lim) { app.master.limiterOk = false; res = await play(composeCode(false)); }
  if (!res.ok) res = await play(base);
  if (!res.ok) { app.transport.playing = wasPlaying; updatePlayBtn(); toast('Oups, réessaie 🎧'); return; }
  if (!wasPlaying) app.transport.startTime = getAudioTime();
  app.transport.cps = app.bpm / 240;
}

function doStop() {
  if (quantTimer) { clearTimeout(quantTimer); quantTimer = null; }
  if (app.fxTimer) { clearTimeout(app.fxTimer); app.fxTimer = null; }
  app.fxShot = null;
  stop();
  app.transport.playing = false;
  updatePlayBtn();
  if (app.mode && app.mode.onQuantizedFire) app.mode.onQuantizedFire();
}

function updatePlayBtn() {
  const b = $('kz-play');
  if (!b) return;
  b.classList.toggle('playing', app.transport.playing);
  b.innerHTML = app.transport.playing ? icon('pause') : icon('play');
}

// Secondes jusqu'au prochain début de mesure (1 cycle = 1 mesure).
function timeToNextBar() {
  const cyc = (getAudioTime() - app.transport.startTime) * app.transport.cps;
  const frac = cyc - Math.floor(cyc);
  return (1 - frac) / app.transport.cps;
}

let quantTimer = null;
// requestPlay(opts) : par défaut ré-évalue tout de suite (édition en direct).
// opts.quantize = true + Sync activé + en lecture -> diffère l'évaluation à la
// prochaine mesure pour que le loop/pad entre pile sur le "1" (feel pro).
function requestPlay(opts) {
  if (!app.transport.playing) return;
  if (opts && opts.quantize && app.quantize) {
    if (quantTimer) return;                 // déjà programmé : l'état live sera lu au déclenchement
    const ms = Math.max(0, timeToNextBar() * 1000 - 15); // ~15ms avant la barre pour caler le downbeat
    quantTimer = setTimeout(() => {
      quantTimer = null;
      doPlay();
      if (app.mode && app.mode.onQuantizedFire) app.mode.onQuantizedFire();
    }, ms);
    return;
  }
  doPlay();
}

// ---- Code Window : montre le code Strudel généré en direct ----
function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function highlightStrudel(code) {
  let h = escHtml(code);
  h = h.replace(/"([^"]*)"/g, '<span class="s">"$1"</span>');       // mini-notation / strings
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="n">$1</span>');   // nombres
  h = h.replace(/\b([a-zA-Z_]\w*)(\()/g, '<span class="f">$1</span>$2'); // fonctions
  return h;
}
// ---- Panneau Tempo : tap tempo + nudge + métronome ----
function openTempoPanel() {
  if (document.querySelector('.kz-tempo-overlay')) return;
  const overlay = el('div', 'kz-tempo-overlay kz-master-overlay');
  const panel = el('div', 'kz-master-panel');
  const head = el('div', 'kz-master-head');
  const title = el('span', 'kz-master-title'); title.innerHTML = `${icon('metro')} Tempo`;
  const close = el('button', 'kz-code-btn2'); close.innerHTML = icon('close');
  head.append(title, close);
  panel.append(head);

  const big = el('div', 'kz-tempo-big');
  const readout = () => { big.textContent = app.bpm + ' BPM'; };
  readout();
  panel.append(big);

  // TAP TEMPO : tape en rythme, on moyenne les intervalles.
  const tap = el('button', 'kz-tap-btn'); tap.innerHTML = `${icon('tap')} TAP`;
  let taps = [];
  tap.addEventListener('click', () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = []; // nouvelle série
    taps.push(now);
    tap.classList.remove('hit'); void tap.offsetWidth; tap.classList.add('hit');
    if (taps.length >= 2) {
      const r = taps.slice(-5);
      let s = 0; for (let i = 1; i < r.length; i++) s += r[i] - r[i - 1];
      const bpm = Math.round(60000 / (s / (r.length - 1)));
      setBpm(bpm); readout();
    }
  });
  panel.append(tap);

  // Nudge fin (± 1 BPM)
  const nudge = el('div', 'kz-nudge');
  const minus = el('button', 'kz-chip'); minus.textContent = '−1';
  minus.addEventListener('click', () => { setBpm(app.bpm - 1); readout(); });
  const plus = el('button', 'kz-chip'); plus.textContent = '+1';
  plus.addEventListener('click', () => { setBpm(app.bpm + 1); readout(); });
  nudge.append(minus, el('span', 'kz-nudge-lbl', 'ajuste finement'), plus);
  panel.append(nudge);

  // Métronome
  const row = el('div', 'kz-master-row');
  const metro = el('button', 'kz-chip' + (app.metronome ? ' on' : '')); metro.innerHTML = `${icon('metro')} Métronome`;
  metro.title = 'Un clic sur chaque temps pour se caler';
  metro.addEventListener('click', () => { app.metronome = !app.metronome; metro.classList.toggle('on', app.metronome); requestPlay(); });
  row.append(metro);
  panel.append(row);

  overlay.append(panel);
  document.body.append(overlay);
  close.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ---- Panneau Master : volume + filtre + limiteur, accessible partout ----
function openMasterPanel() {
  if (document.querySelector('.kz-master-overlay')) return;
  const overlay = el('div', 'kz-master-overlay');
  const panel = el('div', 'kz-master-panel');
  const head = el('div', 'kz-master-head');
  const title = el('span', 'kz-master-title'); title.innerHTML = `${icon('master')} Master`;
  const close = el('button', 'kz-code-btn2'); close.innerHTML = icon('close');
  head.append(title, close);
  panel.append(head);

  panel.append(slider(`${icon('gain')} Volume master`, app.master.vol, (v) => { app.master.vol = v; requestPlay(); }, { format: (v) => Math.round(v * 100) + '%' }));
  panel.append(slider(`${icon('filter')} Filtre master`, app.master.filter, (v) => { app.master.filter = v; requestPlay(); }, { format: (v) => (v < 0.46 ? 'grave' : v > 0.54 ? 'aigu' : 'off') }));
  panel.append(el('div', 'kz-master-hint', '← ferme les graves · off au centre · éclaircit →'));

  const row = el('div', 'kz-master-row');
  const lim = el('button', 'kz-chip' + (app.master.limiter ? ' on' : '')); lim.innerHTML = `${icon('crush')} Limiteur`;
  lim.title = 'Anti-saturation quand tu empiles les sons';
  lim.addEventListener('click', () => { app.master.limiter = !app.master.limiter; lim.classList.toggle('on', app.master.limiter); requestPlay(); });
  row.append(lim);
  const reset = el('button', 'kz-chip'); reset.innerHTML = `${icon('reset')} Réinit.`;
  reset.addEventListener('click', () => { Object.assign(app.master, { vol: 0.85, filter: 0.5, limiter: true }); requestPlay(); overlay.remove(); openMasterPanel(); });
  row.append(reset);
  panel.append(row);

  overlay.append(panel);
  document.body.append(overlay);
  close.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
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
    const c = app.mode ? fullCode() : '// choisis un mode';
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
    setBpm,
    isPlaying: () => app.transport.playing,
    getElapsedCycles: () => (app.transport.playing ? (getAudioTime() - app.transport.startTime) * app.transport.cps : -1),
    requestPlay,
    quantizeOn: () => app.quantize,
    timeToNextBar,
    fxShot: triggerFxShot,
    fxShots: FX_SHOT_LIST,
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

// Change le tempo depuis n'importe quel mode (ex : Feelings) + resync UI/curseur.
function setBpm(v) {
  app.bpm = Math.max(60, Math.min(180, Math.round(v)));
  const tempo = $('kz-tempo');
  if (tempo) tempo.value = app.bpm;
  const lbl = $('kz-tempo-val');
  if (lbl) lbl.textContent = app.bpm + ' BPM';
  app.transport.cps = app.bpm / 240;
  app.transport.startTime = getAudioTime();
  requestPlay();
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
  // Master : tranche master (volume, filtre, limiteur), accessible partout.
  $('kz-master-btn').innerHTML = icon('master');
  $('kz-master-btn').addEventListener('click', openMasterPanel);
  // Sync : lancement quantifié à la mesure (activé par défaut).
  const syncBtn = $('kz-sync-btn');
  const updateSync = () => { syncBtn.classList.toggle('on', app.quantize); syncBtn.innerHTML = icon('sync') + ' Sync'; };
  syncBtn.addEventListener('click', () => { app.quantize = !app.quantize; updateSync(); toast(app.quantize ? 'Lancement calé sur la mesure' : 'Lancement immédiat'); });
  updateSync();
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
  tempo.addEventListener('input', () => setBpm(+tempo.value));
  // La pastille BPM ouvre le panneau Tempo (tap / nudge / métronome).
  $('kz-tempo-val').addEventListener('click', openTempoPanel);

  requestAnimationFrame(tickLoop);

  // PWA : service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
