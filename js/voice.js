// voice.js — Studio Voix : enregistre le micro, autotune (calage sur la gamme),
// et transforme la voix en sample Strudel jouable/accordé.
import { el, slider, toast } from './ui.js';
import { icon } from './icons.js';
import { SCALES } from './music.js';
import { registerSamples } from './strudel-engine.js';

const SEMI = { c: 0, 'c#': 1, db: 1, d: 2, 'd#': 3, eb: 3, e: 4, f: 5, 'f#': 6, gb: 6, g: 7, 'g#': 8, ab: 8, a: 9, 'a#': 10, bb: 10, b: 11 };
const noteFreq = (name, oct) => 440 * Math.pow(2, ((12 * (oct + 1) + (SEMI[name] ?? 0)) - 69) / 12);

// Toutes les fréquences de la gamme sur plusieurs octaves (grave -> aigu).
function scaleFreqs(scaleName) {
  const scale = SCALES[scaleName] || SCALES['Mineure cool'];
  const out = [];
  for (let oct = 2; oct <= 5; oct++) for (const n of scale) out.push(noteFreq(n, oct));
  return out.sort((a, b) => a - b);
}
function nearestFreq(freqs, f) {
  let best = freqs[0], bd = Infinity;
  for (const t of freqs) { const d = Math.abs(Math.log2(f / t)); if (d < bd) { bd = d; best = t; } }
  return best;
}

// Détection de période par autocorrélation (retourne un nb d'échantillons, 0 si non voisé).
function detectPeriod(buf, sr) {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.012) return 0;
  const minP = Math.floor(sr / 500), maxP = Math.min(Math.floor(sr / 70), buf.length - 1);
  let bestP = 0, bestC = 0;
  for (let p = minP; p <= maxP; p++) {
    let c = 0;
    for (let i = 0; i + p < buf.length; i += 2) c += buf[i] * buf[i + p];
    if (c > bestC) { bestC = c; bestP = p; }
  }
  return bestP;
}

// Hauteur dominante : autocorrélation sur la fenêtre la plus énergique.
function dominantPitch(input, sr) {
  if (input.length < 2) return 0;
  const w = Math.min(4096, input.length);
  const step = Math.max(1, w >> 1);   // évite une boucle infinie sur un clip minuscule
  let bestStart = 0, bestE = -1;
  for (let s = 0; s + w <= input.length; s += step) {
    let e = 0; for (let i = 0; i < w; i++) e += input[s + i] * input[s + i];
    if (e > bestE) { bestE = e; bestStart = s; }
  }
  const p = detectPeriod(input.subarray(bestStart, bestStart + w), sr);
  return p > 0 ? sr / p : 0;
}

// Autotune : cale la hauteur dominante du clip sur la note de gamme la plus
// proche (ré-échantillonnage global — fiable, sans artefact). strength 0..1.
// La justesse « par note » vient ensuite du jeu sur la grille (notes de gamme).
export function autotune(input, sr, scaleName, strength = 0.9) {
  const f = dominantPitch(input, sr);
  if (!f) return input.slice(0);
  const tf = nearestFreq(scaleFreqs(scaleName), f);
  const k = 1 + (tf / f - 1) * strength;               // facteur de hauteur
  if (Math.abs(k - 1) < 1e-3) return input.slice(0);
  const outLen = Math.max(1, Math.round(input.length / k));
  const out = new Float32Array(outLen);
  const N = input.length;
  for (let i = 0; i < outLen; i++) {
    const pos = i * k, j = Math.floor(pos), fr = pos - j;
    out[i] = (j + 1 < N) ? input[j] * (1 - fr) + input[j + 1] * fr : (input[j] || 0);
  }
  return out;
}

// Encode un Float32 mono en WAV 16-bit -> Blob URL.
export function encodeWavUrl(samples, sr) {
  const b = new ArrayBuffer(44 + samples.length * 2), v = new DataView(b);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  let o = 44; for (let i = 0; i < samples.length; i++) { const s = Math.max(-1, Math.min(1, samples[i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

// --- Enregistrement micro ---
let stream = null, recorder = null, chunks = [];
// Libère le micro à coup sûr (même si on ferme en plein enregistrement).
function stopMic() {
  try { if (recorder && recorder.state === 'recording') recorder.stop(); } catch (_) { /* noop */ }
  try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (_) { /* noop */ }
}
async function startRec() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  recorder = new MediaRecorder(stream);
  chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();
}
function stopRec() {
  return new Promise((resolve, reject) => {
    if (!recorder) return reject(new Error('pas d enregistrement'));
    recorder.onstop = async () => {
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        const arr = await blob.arrayBuffer();
        const ac = window.getAudioContext();
        const audio = await ac.decodeAudioData(arr);
        // downmix mono + limite à 5 s
        const sr = audio.sampleRate;
        const len = Math.min(audio.length, sr * 5);
        const mono = new Float32Array(len);
        for (let ch = 0; ch < audio.numberOfChannels; ch++) {
          const d = audio.getChannelData(ch);
          for (let i = 0; i < len; i++) mono[i] += d[i] / audio.numberOfChannels;
        }
        // normalise le volume
        let peak = 1e-6; for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(mono[i]));
        const g = Math.min(4, 0.9 / peak); for (let i = 0; i < len; i++) mono[i] *= g;
        resolve({ mono, sr });
      } catch (e) { reject(e); }
    };
    recorder.stop();
  });
}

function playBuffer(samples, sr) {
  const ac = window.getAudioContext();
  const buf = ac.createBuffer(1, samples.length, sr);
  buf.copyToChannel(samples, 0);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = 0.9;
  src.connect(g).connect(ac.destination); src.start();
}

// --- UI Studio Voix ---
export function openVoiceStudio(scaleName, onAdd) {
  const overlay = el('div', 'kz-modal-overlay');
  const modal = el('div', 'kz-modal small kz-voice');
  const head = el('div', 'kz-modal-head');
  const h2 = el('h2'); h2.innerHTML = `<span class="kz-h2-ic">${icon('voice')}</span>Studio Voix`;
  const close = el('button', 'kz-close'); close.innerHTML = icon('close');
  close.addEventListener('click', () => { stopMic(); overlay.remove(); });
  head.append(h2, close);
  modal.append(head);

  const body = el('div', 'kz-voice-body');
  modal.append(body);

  let take = null;     // { mono, sr }
  let strength = 0.9;

  function render() {
    body.innerHTML = '';
    // Bouton d'enregistrement
    const recBtn = el('button', 'kz-rec-btn');
    const setRecLabel = (rec) => { recBtn.innerHTML = `<span class="kz-rec-dot${rec ? ' on' : ''}"></span>${rec ? 'Stop' : (take ? 'Réenregistrer' : 'Enregistrer')}`; };
    setRecLabel(false);
    recBtn.addEventListener('click', async () => {
      if (recorder && recorder.state === 'recording') {
        setRecLabel(false);
        try { take = await stopRec(); } catch (e) { toast('Micro indisponible'); }
        render();
      } else {
        try { await startRec(); setRecLabel(true); recBtn.classList.add('recording'); }
        catch (e) { toast('Autorise le micro 🎤'); }
      }
    });
    body.append(recBtn);
    body.append(el('div', 'kz-voice-hint', 'Chante/parle 2–3 s, puis règle l\'autotune.'));

    if (take) {
      // Réglage autotune + effets + preview + ajout
      const s = slider(`${icon('voice')} Autotune`, strength, (v) => { strength = v; }, { format: (v) => Math.round(v * 100) + '%' });
      body.append(s);

      const row = el('div', 'kz-voice-row');
      const preview = el('button', 'kz-chip'); preview.innerHTML = `${icon('play')} Écouter`;
      preview.addEventListener('click', () => { const tuned = autotune(take.mono, take.sr, scaleName, strength); playBuffer(tuned, take.sr); });
      row.append(preview);
      const dry = el('button', 'kz-chip'); dry.innerHTML = `${icon('voice')} Voix brute`;
      dry.addEventListener('click', () => playBuffer(take.mono, take.sr));
      row.append(dry);
      body.append(row);

      const add = el('button', 'kz-chip kz-voice-add'); add.innerHTML = `${icon('check')} Ajouter à mes sons`;
      add.addEventListener('click', () => {
        const tuned = autotune(take.mono, take.sr, scaleName, strength);
        const url = encodeWavUrl(tuned, take.sr);
        onAdd(url);
        overlay.remove();
      });
      body.append(add);
    }
  }
  render();

  overlay.append(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { stopMic(); overlay.remove(); } });
  document.body.append(overlay);
}
