// strudel-engine.js
// Pont entre l'UI à boutons et le moteur Strudel (@strudel/web).
// Aucune ligne de code Strudel n'est visible pour l'utilisateur : l'UI
// génère une chaîne de code Strudel et on l'envoie à evaluate().

const state = {
  ready: false,
  playing: false,
  lastCode: '',
  repl: null,   // instance repl renvoyée par initStrudel — SEUL stop fiable
  analyser: null,
  freqData: null,
  timeData: null,
  onBeat: null, // callback(beatIndex) déclenché à chaque cycle
};

let initPromise = null;

// --- Tap audio : on branche un AnalyserNode sur tout ce qui va vers la
// sortie, en interceptant AudioNode.connect(). Ça donne des visuels qui
// réagissent VRAIMENT au son, sans dépendre des internes de Strudel.
function installAudioTap() {
  try {
    const ctx = window.getAudioContext ? window.getAudioContext() : null;
    if (!ctx || ctx.__kzTapped) return;
    ctx.__kzTapped = true;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.8;
    state.analyser = analyser;
    state.freqData = new Uint8Array(analyser.frequencyBinCount);
    state.timeData = new Uint8Array(analyser.fftSize);

    const dest = ctx.destination;
    const origConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (target, ...rest) {
      // Ne jamais taper l'analyseur lui-même (évite les boucles).
      if (this !== analyser && target === dest) {
        try { origConnect.call(this, analyser); } catch (e) { /* noop */ }
      }
      return origConnect.call(this, target, ...rest);
    };
  } catch (e) {
    console.warn('[kz] audio tap indisponible', e);
  }
}

export async function ensureStrudel() {
  if (state.ready) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (typeof window.initStrudel !== 'function') {
      throw new Error('Strudel (@strudel/web) non chargé');
    }
    // initStrudel renvoie le repl (via son initDone) — on le garde pour
    // pouvoir l'arrêter de façon fiable (window.hush est écrasé par un autre
    // module et n'arrête PAS le scheduler).
    const repl = await window.initStrudel({
      // Précharge de grosses banques de samples => beaucoup de sons dispo.
      prebake: async () => {
        const s = window.samples;
        if (!s) return;
        const banks = [
          'github:tidalcycles/dirt-samples',
          'github:eddyflux/crate',
        ];
        await Promise.allSettled(banks.map((b) => s(b)));
      },
    });
    state.repl = repl;
    installAudioTap();
    state.ready = true;
  })();

  return initPromise;
}

// Enregistre des samples importés par l'utilisateur.
// entries: { id: [url1, url2, ...] }
export async function registerSamples(entries) {
  await ensureStrudel();
  if (!window.samples) throw new Error('samples() indisponible');
  await window.samples(entries);
}

// Joue le code Strudel donné (chaîne). Démarre l'audio si besoin.
export async function play(code) {
  await ensureStrudel();
  installAudioTap(); // au cas où le contexte n'existait pas encore
  state.lastCode = code;
  try {
    await window.evaluate(code);
    state.playing = true;
    return { ok: true };
  } catch (e) {
    console.error('[kz] erreur evaluate', e, '\n', code);
    return { ok: false, error: e };
  }
}

export function stop() {
  // repl.stop() est le SEUL arrêt fiable (cf. bug : window.hush n'arrête rien).
  try {
    if (state.repl && typeof state.repl.stop === 'function') state.repl.stop();
    else if (window.hush) window.hush();
  } catch (e) {
    try { if (window.hush) window.hush(); } catch (_) { /* noop */ }
  }
  state.playing = false;
}

export function isPlaying() {
  return state.playing;
}

export function getAnalyser() {
  return state.analyser;
}

// Récupère les niveaux audio (bass / mid / high / volume global) 0..1.
export function readLevels() {
  const a = state.analyser;
  if (!a || !state.freqData) return { bass: 0, mid: 0, high: 0, level: 0 };
  a.getByteFrequencyData(state.freqData);
  const d = state.freqData;
  const n = d.length;
  const band = (from, to) => {
    let sum = 0;
    const a0 = Math.floor(n * from);
    const a1 = Math.floor(n * to);
    for (let i = a0; i < a1; i++) sum += d[i];
    return (sum / Math.max(1, a1 - a0)) / 255;
  };
  const bass = band(0.0, 0.08);
  const mid = band(0.08, 0.4);
  const high = band(0.4, 1.0);
  const level = (bass + mid + high) / 3;
  return { bass, mid, high, level };
}
