// modes/sequencer.js — grille séquenceur (une ligne par instrument).
import { el, slider, openSoundLibrary, iconButton, toast } from '../ui.js';
import { findSound, KITS, addProcessedSound, pickSound, VIBES, getVibe } from '../sounds.js';
import { GENRES, fitTemplate } from '../genres.js';
import { makeChar, drawDancer } from '../dancers.js';
import { openVoiceStudio } from '../voice.js';
import { openDrawStudio } from '../draw.js';
import { EMOTIONS, findEmotion, renderFeelingsPanel } from '../feelings.js';
import { SCALES, buildNoteRows, drumRowToMini, meloGridToMini, fxChain, assemble } from '../music.js';
import { defaultDjState, djFxChain, djIsActive, renderDjControls, pumpTail } from '../djfx.js';
import { icon } from '../icons.js';

export function createSequencer(ctx) {
  // --- État ---
  const st = {
    steps: ctx.getLevel() === 'simple' ? 8 : 16,
    scale: 'Mineure cool',
    octaves: ctx.getLevel() === 'simple' ? 1 : 2,
    drums: [],   // { id, soundId, cells:[bool], gain, muted, fx:{} }
    melo: null,  // { soundId, cells:[noteIdx|null], gain, fx:{} }
    bass: null,
    playHead: 0,
    // --- Mode Morceau (enchaînement de loops) ---
    scenes: [],       // { kind:'loop'|'break'|'drop', bars, snap }
    songMode: false,  // true = joue le morceau (arrange), false = joue la boucle courante
    editing: null,    // index de la scène en cours d'édition dans la grille, ou null
    pending: null,    // index du loop lancé, en attente de la prochaine mesure (quantize)
    dropSnap: null,   // snapshot figé comme "le Drop"
    // --- Sous-menu Ultra DJ (effets live sur le beat) ---
    dj: defaultDjState(),
    djOpen: false,
    // --- Sous-menu Feelings (émotions qui transforment la musique) ---
    feelOpen: false,
    mood: null,       // id de l'émotion active
    morph: { a: 'joie', b: 'colere', t: 0 }, // fondu live entre deux émotions
  };

  let uid = 0;
  const nid = () => 'trk' + (uid++);

  // Danseurs pixel-art par piste (overlay animé, sans gêner le séquenceur).
  st.danceOn = true;
  let dancers = [], danceSeed = 0, danceRAF = 0;
  function addDancer(container) {
    if (!st.danceOn) return;
    container.style.position = 'relative';
    const cv = el('canvas', 'kz-dancer');
    container.append(cv);
    dancers.push({ cv, char: makeChar(danceSeed++) });
  }
  function danceLoop() {
    danceRAF = requestAnimationFrame(danceLoop);
    if (!st.danceOn || !dancers.length) return;
    const cyc = ctx.getElapsedCycles ? ctx.getElapsedCycles() : -1;
    const playing = cyc >= 0;
    const t = playing ? cyc : performance.now() / 2400;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const d of dancers) {
      const cw = d.cv.clientWidth, ch = d.cv.clientHeight;
      if (!cw || !ch) continue;
      if (d.cv.width !== Math.round(cw * dpr) || d.cv.height !== Math.round(ch * dpr)) { d.cv.width = Math.round(cw * dpr); d.cv.height = Math.round(ch * dpr); }
      drawDancer(d.cv.getContext('2d'), d.cv.width, d.cv.height, t, playing, st.steps, d.char);
    }
  }

  function defaultKit() {
    const kit = KITS['Techno galaxie'];
    st.drums = kit.map((sid) => makeDrum(sid));
    // motif de départ "méga cool" pour que ça sonne tout de suite
    const [bd, sd, hh, cp] = st.drums;
    seedStep(bd, [0, 4, 8, 12]);
    seedStep(sd, [4, 12]);
    seedStep(hh, st.steps === 8 ? [0, 2, 4, 6] : [0, 2, 4, 6, 8, 10, 12, 14]);
    if (cp) seedStep(cp, [12]);
    st.melo = makeMelo('sawtooth');
    // mélodie générée AU PIF à chaque lancement (une note par colonne, densité ~40%)
    const rows = st.melo.noteRows;
    st.melo.cells = Array(st.steps).fill(null).map(() => (Math.random() < 0.42 ? Math.floor(Math.random() * rows.length) : null));
    // garantit au moins 3 notes pour que ça sonne
    let placed = st.melo.cells.filter((c) => c != null).length;
    while (placed < 3) { const i = Math.floor(Math.random() * st.steps); if (st.melo.cells[i] == null) { st.melo.cells[i] = Math.floor(Math.random() * rows.length); placed++; } }
    if (ctx.getLevel() === 'expert') {
      st.bass = makeMelo('jvbass');
      st.bass.octaves = 1; st.bass.base = 2;
      st.bass.noteRows = buildNoteRows(st.scale, 1, 2);
      const brows = st.bass.noteRows;
      const bp = st.steps === 8 ? [0, 0, null, 0, 2, null, 0, null] : [0, null, 0, null, null, 0, null, 0, 2, null, 2, null, null, 0, null, 0];
      st.bass.cells = bp.map((p) => (p == null ? null : Math.min(p, brows.length - 1)));
    }
  }

  function makeDrum(soundId) {
    return { id: nid(), soundId, cells: Array(st.steps).fill(false), gain: 0.9, muted: false, fx: {} };
  }
  function makeMelo(soundId) {
    return { id: nid(), soundId, cells: Array(st.steps).fill(null), gain: 0.7, muted: false,
      fx: { room: 0.3 }, noteRows: buildNoteRows(st.scale, st.octaves, 3), octaves: st.octaves, base: 3 };
  }
  function seedStep(track, idxs) { idxs.forEach((i) => { if (i < track.cells.length) track.cells[i] = 2; }); }

  function resizeTracks() {
    const fit = (cells, fill) => {
      const out = Array(st.steps).fill(fill);
      for (let i = 0; i < Math.min(cells.length, st.steps); i++) out[i] = cells[i];
      return out;
    };
    st.drums.forEach((d) => (d.cells = fit(d.cells, false)));
    if (st.melo) st.melo.cells = fit(st.melo.cells, null);
    if (st.bass) st.bass.cells = fit(st.bass.cells, null);
  }

  // Vélocité par pas : 0=off, 2=normal, 3=accent (fort), 1=ghost (faible).
  const VEL = { 1: 0.5, 2: 1, 3: 1.4 };

  // --- Génération du code ---
  const clone = (o) => (o == null ? null : JSON.parse(JSON.stringify(o)));
  function snapshot() {
    return { steps: st.steps, drums: clone(st.drums), melo: clone(st.melo), bass: clone(st.bass) };
  }

  // Patterns Strudel d'une source { drums, melo, bass } (état live OU snapshot).
  function patternsOf(src) {
    const pats = [];
    (src.drums || []).forEach((d) => {
      if (d.muted || !(d.gain > 0.001) || !d.cells.some(Boolean)) return; // volume 0 = silence total

      const snd = findSound(d.soundId);
      const name = snd ? snd.name : d.soundId;
      let p = drumRowToMini(name, d.cells);
      // Vélocité par pas : ajoute une chaîne de gain si des accents/ghosts existent.
      if (d.cells.some((c) => c === 1 || c === 3)) {
        const g = d.cells.map((c) => (c ? (VEL[c] ?? 1) : '~')).join(' ');
        p += `.gain("${g}")`;
      }
      pats.push(p + fxChain({ gain: d.gain, ...d.fx }));
    });
    const pump = pumpTail(st.dj.sidechain); // "pompe" appliquée aux pistes tenues
    [src.melo, src.bass].forEach((m) => {
      if (!m || m.muted || !(m.gain > 0.001) || !m.cells.some((c) => c != null)) return; // volume 0 = silence total
      const snd = findSound(m.soundId);
      const name = snd ? snd.name : m.soundId;
      pats.push(meloGridToMini(name, m.noteRows, m.cells) + fxChain({ gain: m.gain, ...m.fx }) + pump);
    });
    return pats;
  }
  function stackStr(pats) {
    if (!pats.length) return 'silence';
    return `stack(\n    ${pats.join(',\n    ')}\n  )`;
  }
  // Le Drop = le groove complet + un crash sur le "1" pour l'impact.
  function dropStackStr(snap) {
    const pats = patternsOf(snap);
    pats.push('s("cr ~ ~ ~ ~ ~ ~ ~").gain(0.6)');
    return stackStr(pats);
  }
  // Le Break = montée automatique : filtre qui s'ouvre + roulement de caisse
  // qui accélère + riser, puis ça explose sur le Drop juste après.
  function breakStackStr(bars) {
    const b = bars || 4;
    return `stack(\n    s("bd ~ ~ ~"),\n    s("cp*<2 4 8 16>").gain(0.5),\n    s("wind").slow(${b}).gain(0.45)\n  ).lpf(saw.range(500,11000).slow(${b}))`;
  }

  function buildCode() {
    const bpm = ctx.getBpm();
    const fx = djFxChain(st.dj, st.steps); // effets Ultra DJ appliqués au motif final
    if (st.songMode && st.scenes.length) {
      const cpm = (Math.round((bpm / 4) * 1000) / 1000);
      const parts = st.scenes.map((sc) => {
        const body = sc.kind === 'break' ? breakStackStr(sc.bars)
          : sc.kind === 'drop' ? dropStackStr(sc.snap)
            : stackStr(patternsOf(sc.snap));
        return `[${sc.bars}, ${body}]`;
      });
      return `setcpm(${cpm})\narrange(\n  ${parts.join(',\n  ')}\n)${fx}`;
    }
    return assemble(patternsOf(st), bpm) + fx;
  }
  ctx.registerBuildCode(buildCode);

  // --- Rendu ---
  const root = ctx.root;

  function changed() { ctx.requestPlay(); scheduleRecord(); }
  // Le changement doit-il être calé sur la mesure ? (Sync ON + en lecture)
  function willQuantize() { return !!(ctx.isPlaying && ctx.isPlaying() && ctx.quantizeOn && ctx.quantizeOn()); }

  // --- Historique : annuler / refaire (A10) ---
  let history = [], hp = -1, histTimer = null, restoring = false;
  function fullState() {
    return JSON.stringify({ bpm: ctx.getBpm ? ctx.getBpm() : null, steps: st.steps, scale: st.scale, octaves: st.octaves, drums: st.drums, melo: st.melo, bass: st.bass, scenes: st.scenes, songMode: st.songMode, editing: st.editing, dropSnap: st.dropSnap, dj: st.dj });
  }
  function recordNow() {
    const s = fullState();
    if (hp >= 0 && s === history[hp]) return;   // rien de neuf (ex : après un undo)
    history = history.slice(0, hp + 1);
    history.push(s); hp = history.length - 1;
    if (history.length > 40) { history.shift(); hp--; }
  }
  function scheduleRecord() { if (restoring) return; if (histTimer) clearTimeout(histTimer); histTimer = setTimeout(() => { histTimer = null; recordNow(); }, 350); }
  function restoreFull(json) {
    const o = JSON.parse(json);
    restoring = true;
    if (o.bpm && ctx.setBpm) ctx.setBpm(o.bpm);
    st.steps = o.steps; st.scale = o.scale; st.octaves = o.octaves;
    st.drums = o.drums; st.melo = o.melo; st.bass = o.bass;
    st.scenes = o.scenes; st.songMode = o.songMode; st.editing = o.editing; st.dropSnap = o.dropSnap;
    Object.assign(st.dj, o.dj);
    render(); ctx.requestPlay();
    restoring = false;
  }
  function undo() {
    if (histTimer) { clearTimeout(histTimer); histTimer = null; recordNow(); } // fige le changement en cours
    if (hp <= 0) { toast('Rien à annuler'); return; }
    hp--; restoreFull(history[hp]); toast('Annulé ↩');
  }
  function redo() {
    if (hp >= history.length - 1) { toast('Rien à refaire'); return; }
    hp++; restoreFull(history[hp]); toast('Refait ↪');
  }
  // Lancement d'un loop / bascule de mode : quantifié si possible.
  function launch() { ctx.requestPlay(willQuantize() ? { quantize: true } : undefined); }

  function render() {
    root.innerHTML = '';
    dancers = []; danceSeed = 0;   // les canvases sont recréés à chaque rendu
    const level = ctx.getLevel();

    // Barre outils
    const tools = el('div', 'kz-seq-tools');
    tools.append(iconButton(icon('undo'), 'Annuler', undo, 'small'));
    tools.append(iconButton(icon('redo'), 'Refaire', redo, 'small'));
    tools.append(iconButton(icon('dice'), 'Surprise', () => { randomize(); toast('Nouveau motif !'); }, 'small'));
    tools.append(iconButton(icon('wand'), 'Génère', () => openGenrePicker(), 'small'));
    tools.append(iconButton(icon('dance'), 'Danse', () => { st.danceOn = !st.danceOn; render(); toast(st.danceOn ? 'Danseurs activés 🕺' : 'Danseurs coupés'); }, 'small' + (st.danceOn ? ' active' : '')));
    tools.append(iconButton(icon('eraser'), 'Effacer', () => { clearAll(); }, 'small'));
    tools.append(iconButton(icon('sliders'), 'Ultra DJ', () => { const wasOpen = st.djOpen; st.djOpen = !st.djOpen; if (st.djOpen) st.feelOpen = false; render(); if (!wasOpen) window.scrollTo({ top: 0, behavior: 'smooth' }); }, 'small' + ((st.djOpen || djIsActive(st.dj)) ? ' active' : '')));
    tools.append(iconButton(icon('mood'), 'Feelings', () => { const wasOpen = st.feelOpen; st.feelOpen = !st.feelOpen; if (st.feelOpen) st.djOpen = false; render(); if (!wasOpen) window.scrollTo({ top: 0, behavior: 'smooth' }); }, 'small' + ((st.feelOpen || st.mood) ? ' active' : '')));
    tools.append(iconButton(icon('pencil'), 'Dessin', () => openDrawStudio({ steps: st.steps }, (res) => { applyDrawing(res); }), 'small'));
    tools.append(iconButton(icon('voice'), 'Voix', () => openVoiceStudio(st.scale, async (url) => {
      const item = await addProcessedSound('Ma voix', url, 'melo');
      if (!st.melo) { st.melo = makeMelo(item.id); } else { st.melo.soundId = item.id; }
      render(); changed();
      toast('Ta voix joue la mélodie 🎤');
    }), 'small'));
    if (level === 'expert') {
      // sélecteur de gamme
      const scaleSel = el('select', 'kz-select');
      Object.keys(SCALES).forEach((s) => {
        const o = el('option', null, s); o.value = s; if (s === st.scale) o.selected = true; scaleSel.append(o);
      });
      scaleSel.addEventListener('change', () => { st.scale = scaleSel.value; rebuildScales(); render(); changed(); });
      const sl = el('label', 'kz-inline-label'); sl.innerHTML = icon('scale'); sl.append(scaleSel);
      tools.append(sl);
      // nombre de pas
      const stepSel = el('select', 'kz-select');
      [8, 16].forEach((n) => { const o = el('option', null, n + ' pas'); o.value = n; if (n === st.steps) o.selected = true; stepSel.append(o); });
      stepSel.addEventListener('change', () => { st.steps = +stepSel.value; resizeTracks(); render(); changed(); });
      tools.append(stepSel);
      tools.append(iconButton(icon('plus'), 'Instrument', () => addDrumTrack(), 'small'));
    }
    root.append(tools);

    const grid = el('div', 'kz-tracks');
    st.drums.forEach((d) => grid.append(renderDrumTrack(d, level)));
    if (st.melo) grid.append(renderMeloTrack(st.melo, 'Mélodie', level));
    if (st.bass) grid.append(renderMeloTrack(st.bass, 'Basse', level));

    // Ultra DJ / Feelings s'ouvrent EN HAUT (juste sous les outils), pas en bas.
    if (st.djOpen) root.append(renderDjPanel());
    if (st.feelOpen) root.append(renderFeelPanel());
    root.append(grid);
    root.append(renderSongPanel());

    if (level === 'simple') {
      // kits rapides
      const kits = el('div', 'kz-kits');
      kits.append(el('span', 'kz-kits-label', 'Kits :'));
      Object.keys(KITS).forEach((k) => {
        const b = el('button', 'kz-chip', k);
        b.addEventListener('click', () => { applyKit(k); render(); changed(); });
        kits.append(b);
      });
      root.append(kits);
    }
  }

  function renderDrumTrack(d, level) {
    const row = el('div', 'kz-track');
    const snd = findSound(d.soundId);
    const head = el('div', 'kz-track-head');
    const pick = el('button', 'kz-track-sound');
    pick.innerHTML = `<span class="kz-emoji">${snd ? icon(snd.emoji) : icon('gain')}</span><span>${snd ? snd.label : d.soundId}</span>`;
    pick.addEventListener('click', () => openSoundLibrary((s) => { d.soundId = s.id; render(); changed(); }, 'drum', { used: usedDrumIds(d) }));
    head.append(pick);
    if (level === 'expert') {
      const mute = el('button', 'kz-mini' + (d.muted ? ' on' : '')); mute.innerHTML = icon(d.muted ? 'mute' : 'gain');
      mute.addEventListener('click', () => { d.muted = !d.muted; render(); changed(); });
      head.append(mute);
      const del = el('button', 'kz-mini'); del.innerHTML = icon('trash');
      del.addEventListener('click', () => { st.drums = st.drums.filter((x) => x !== d); render(); changed(); });
      head.append(del);
    }
    row.append(head);

    const cells = el('div', 'kz-cells');
    cells.style.setProperty('--steps', st.steps);
    d.cells.forEach((on, i) => {
      const c = el('button', 'kz-cell' + (on ? ' on' : '') + (on === 3 ? ' vel-accent' : '') + (on === 1 ? ' vel-ghost' : '') + (i % 4 === 0 ? ' beat' : ''));
      c.dataset.step = i;
      // Tape : off -> normal -> accent (fort) -> ghost (faible) -> off.
      c.addEventListener('click', () => {
        const cur = d.cells[i];
        const next = !cur ? 2 : (cur === 3 ? 1 : (cur === 1 ? 0 : 3));
        d.cells[i] = next;
        c.classList.toggle('on', !!next);
        c.classList.toggle('vel-accent', next === 3);
        c.classList.toggle('vel-ghost', next === 1);
        changed();
      });
      cells.append(c);
    });
    addDancer(cells);
    row.append(cells);

    if (level === 'expert') row.append(renderFxRow(d));
    return row;
  }

  function renderMeloTrack(m, title, level) {
    const wrap = el('div', 'kz-track kz-melo');
    const head = el('div', 'kz-track-head');
    const snd = findSound(m.soundId);
    const pick = el('button', 'kz-track-sound');
    pick.innerHTML = `<span class="kz-emoji">${snd ? icon(snd.emoji) : icon('synth')}</span><span>${title}</span>`;
    pick.addEventListener('click', () => openSoundLibrary((s) => { m.soundId = s.id; render(); changed(); }, 'melo'));
    head.append(pick);
    if (level === 'expert') {
      const mute = el('button', 'kz-mini' + (m.muted ? ' on' : '')); mute.innerHTML = icon(m.muted ? 'mute' : 'gain');
      mute.addEventListener('click', () => { m.muted = !m.muted; render(); changed(); });
      head.append(mute);
    }
    wrap.append(head);

    // grille de notes : rangées = notes, colonnes = pas
    const rows = m.noteRows;
    const gridEl = el('div', 'kz-noterows');
    rows.forEach((note, r) => {
      const line = el('div', 'kz-noterow');
      line.append(el('span', 'kz-notename', note.replace(/[0-9]/g, '')));
      const cells = el('div', 'kz-cells');
      cells.style.setProperty('--steps', st.steps);
      for (let i = 0; i < st.steps; i++) {
        const active = m.cells[i] === r;
        const c = el('button', 'kz-cell melo' + (active ? ' on' : '') + (i % 4 === 0 ? ' beat' : ''));
        c.dataset.step = i;
        c.addEventListener('click', () => {
          m.cells[i] = (m.cells[i] === r) ? null : r; // une note par colonne
          render(); changed();
        });
        cells.append(c);
      }
      line.append(cells);
      gridEl.append(line);
    });
    addDancer(gridEl);
    wrap.append(gridEl);
    if (level === 'expert') wrap.append(renderFxRow(m));
    return wrap;
  }

  function renderFxRow(track) {
    const fx = track.fx;
    const box = el('div', 'kz-fx');
    const L = (ic, t) => `${icon(ic)} ${t}`;
    box.append(slider(L('gain', 'Volume'), track.gain, (v) => { track.gain = v; changed(); }));
    box.append(slider(L('filter', 'Filtre'), fx.lpf ?? 1, (v) => { fx.lpf = v; changed(); }));
    box.append(slider(L('reverb', 'Réverb'), fx.room ?? 0, (v) => { fx.room = v; changed(); }));
    box.append(slider(L('echo', 'Écho'), fx.delay ?? 0, (v) => { fx.delay = v; changed(); }));
    box.append(slider(L('crush', 'Crush'), fx.crush ?? 0, (v) => { fx.crush = v; changed(); }));
    box.append(slider(L('disto', 'Disto'), fx.distort ?? 0, (v) => { fx.distort = v; changed(); }));
    // Effets Expert supplémentaires (explorés dans Strudel)
    box.append(slider(L('voice', 'Voyelle'), fx.vowel ?? 0, (v) => { fx.vowel = v; changed(); }, { format: (v) => (v > 0 ? 'aeiou'[Math.min(4, Math.floor(v * 5))].toUpperCase() : 'off') }));
    box.append(slider(L('filter', 'Aigu'), fx.hpf ?? 0, (v) => { fx.hpf = v; changed(); }));
    box.append(slider(L('disto', 'Satur.'), fx.shape ?? 0, (v) => { fx.shape = v; changed(); }));
    box.append(slider(L('chip', 'Grésil'), fx.coarse ?? 0, (v) => { fx.coarse = v; changed(); }));
    box.append(slider(L('wah', 'Phaser'), fx.phaser ?? 0, (v) => { fx.phaser = v; changed(); }));
    box.append(slider(L('echo', 'Trémolo'), fx.tremolo ?? 0, (v) => { fx.tremolo = v; changed(); }));
    return box;
  }

  // --- Actions ---
  // Sons déjà pris par les AUTRES pistes de batterie (empêche les doublons).
  function usedDrumIds(exclude) {
    return new Set(st.drums.filter((d) => d !== exclude).map((d) => d.soundId));
  }
  function addDrumTrack() {
    openSoundLibrary((s) => { st.drums.push(makeDrum(s.id)); render(); changed(); }, 'drum', { used: usedDrumIds(null) });
  }
  function applyKit(name) {
    const kit = KITS[name];
    kit.forEach((sid, i) => { if (st.drums[i]) st.drums[i].soundId = sid; else st.drums.push(makeDrum(sid)); });
  }
  function rebuildScales() {
    if (st.melo) { st.melo.noteRows = buildNoteRows(st.scale, st.melo.octaves, st.melo.base); st.melo.cells = st.melo.cells.map(() => null); }
    if (st.bass) { st.bass.noteRows = buildNoteRows(st.scale, 1, 2); st.bass.cells = st.bass.cells.map(() => null); }
  }
  function randomize() {
    st.drums.forEach((d, di) => {
      d.cells = d.cells.map((_, i) => {
        if (di === 0) return i % 4 === 0 ? 2 : 0;         // kick sur les temps
        if (di === 1) return i % 8 === 4 ? 2 : 0;         // snare backbeat
        return Math.random() < 0.35 ? 2 : 0;              // reste aléatoire
      });
    });
    if (st.melo) {
      const rows = st.melo.noteRows;
      st.melo.cells = st.melo.cells.map(() => (Math.random() < 0.4 ? Math.floor(Math.random() * rows.length) : null));
    }
    render(); changed(); recordNow();
  }
  function clearAll() {
    st.drums.forEach((d) => (d.cells = d.cells.map(() => 0)));
    if (st.melo) st.melo.cells = st.melo.cells.map(() => null);
    if (st.bass) st.bass.cells = st.bass.cells.map(() => null);
    render(); changed(); recordNow();
  }

  // --- Sous-menu Ultra DJ ---
  let djTimer = null;
  function djChange() { if (djTimer) return; djTimer = setTimeout(() => { djTimer = null; changed(); }, 60); }
  function renderDjPanel() {
    const box = el('div', 'kz-song');
    const head = el('div', 'kz-song-head');
    const ti = el('span', 'kz-song-title'); ti.innerHTML = `${icon('sliders')} Ultra DJ`;
    head.append(ti);
    const close = el('button', 'kz-song-toggle on', 'Fermer');
    close.addEventListener('click', () => { st.djOpen = false; render(); });
    head.append(close);
    box.append(head);
    const controls = el('div', 'dj-controls');
    renderDjControls(controls, st.dj, djChange);
    box.append(controls);
    return box;
  }

  // --- Sous-menu Feelings (émotions -> transforment la musique) ---
  function renderFeelPanel() {
    const box = el('div', 'kz-song');
    const head = el('div', 'kz-song-head');
    const ti = el('span', 'kz-song-title'); ti.innerHTML = `${icon('mood')} Feelings`;
    head.append(ti);
    const close = el('button', 'kz-song-toggle on', 'Fermer');
    close.addEventListener('click', () => { st.feelOpen = false; render(); });
    head.append(close);
    box.append(head);
    const controls = el('div', 'kz-feel');
    renderFeelingsPanel(controls, st.mood, (emo) => applyEmotion(emo));
    box.append(controls);

    // Morphing : fondu live entre deux émotions.
    const m = st.morph;
    const A = findEmotion(m.a) || EMOTIONS[0], B = findEmotion(m.b) || EMOTIONS[1];
    box.append(el('div', 'kz-song-sub', 'Morphing (fondu entre deux ambiances)'));
    const ab = el('div', 'kz-morph-ab');
    const chip = (which, emo) => {
      const b = el('button', 'kz-morph-chip');
      b.innerHTML = `<span class="kz-morph-ic">${icon(emo.icon)}</span><span>${emo.label}</span>`;
      b.title = 'Changer d\'ambiance';
      b.addEventListener('click', () => {
        const idx = EMOTIONS.findIndex((e) => e.id === m[which]);
        m[which] = EMOTIONS[(idx + 1) % EMOTIONS.length].id;
        morphEmotions(m.a, m.b, m.t); render();
      });
      return b;
    };
    const arrow = el('span', 'kz-morph-arrow'); arrow.innerHTML = icon('reverse');
    ab.append(chip('a', A), arrow, chip('b', B));
    box.append(ab);
    box.append(slider(`${A.label} ⟷ ${B.label}`, m.t, (v) => { m.t = v; morphEmotions(m.a, m.b, v); }, { format: (v) => Math.round(v * 100) + '%' }));
    return box;
  }

  // Régénère la mélodie avec un CARACTÈRE (registre + contour) selon l'émotion.
  // noteRows : index 0 = aigu (aiguës en haut de la grille).
  function regenMelodyShaped(prof) {
    if (!st.melo) return;
    const R = st.melo.noteRows.length;
    const center = Math.round((1 - prof.bias) * (R - 1));   // bias 1 -> aigu (index 0)
    const span = Math.max(1, Math.floor(R * 0.5));
    const cells = [];
    for (let i = 0; i < st.steps; i++) {
      if (Math.random() > prof.density) { cells.push(null); continue; }
      const t = st.steps > 1 ? i / (st.steps - 1) : 0;
      let target = center;
      if (prof.contour === 'up') target = center + Math.round((0.5 - t) * span);        // monte (vers l'aigu)
      else if (prof.contour === 'down') target = center + Math.round((t - 0.5) * span);  // descend
      else if (prof.contour === 'wave') target = center + Math.round(Math.sin(t * Math.PI * 2) * span * 0.5);
      else target = center + Math.round((Math.random() - 0.5) * span);                    // aléatoire (agité)
      target += Math.round((Math.random() - 0.5) * 2);      // petit grain
      cells.push(Math.max(0, Math.min(R - 1, target)));
    }
    let placed = cells.filter((c) => c != null).length;
    while (placed < 3) { const i = Math.floor(Math.random() * st.steps); if (cells[i] == null) { cells[i] = center; placed++; } }
    st.melo.cells = cells;
  }

  function setDrumEnergy(energy) {
    st.drums.forEach((d, di) => {
      d.cells = d.cells.map((_, i) => {
        if (di === 0) return i % 4 === 0 ? 2 : 0;                          // kick : sur les temps
        if (di === 1) return i % 8 === 4 ? 2 : 0;                          // snare : backbeat
        if (di === 2) return Math.random() < (0.25 + energy * 0.6) ? 2 : 0; // hats : densité selon énergie
        return Math.random() < energy * 0.4 ? 2 : 0;                       // reste : ghost notes
      });
    });
  }

  function applyEmotion(emo) {
    if (ctx.setBpm) ctx.setBpm(emo.bpm);
    st.scale = emo.scale;
    if (st.melo) st.melo.noteRows = buildNoteRows(st.scale, st.melo.octaves, st.melo.base);
    if (st.bass) st.bass.noteRows = buildNoteRows(st.scale, 1, 2);
    Object.assign(st.dj, defaultDjState(), emo.dj);              // effets de l'ambiance (exclusifs)
    setDrumEnergy(emo.energy);
    regenMelodyShaped(emo.mel || { density: 0.25 + emo.energy * 0.35, bias: 0.5, contour: 'rand' });
    if (st.bass) {
      const lo = st.bass.noteRows.length - 1;
      st.bass.cells = st.bass.cells.map((_, i) => (i % 4 === 0 ? lo : (Math.random() < emo.energy * 0.35 ? Math.floor(Math.random() * st.bass.noteRows.length) : null)));
    }
    st.mood = emo.id;
    render(); changed(); recordNow();
    toast(emo.label + ' ' + '🎛️');
  }

  // Morph live entre deux émotions : interpole tempo + effets, bascule la gamme
  // à mi-parcours. Ne régénère PAS les notes/beats (fondu de "feel", pas de saut).
  function morphEmotions(aId, bId, t) {
    const A = findEmotion(aId), B = findEmotion(bId);
    if (!A || !B) return;
    st.mood = null;
    // Gamme : bascule au milieu (la mélodie se re-mappe à la nouvelle gamme).
    const scale = t < 0.5 ? A.scale : B.scale;
    if (scale !== st.scale) {
      st.scale = scale;
      if (st.melo) st.melo.noteRows = buildNoteRows(st.scale, st.melo.octaves, st.melo.base);
      if (st.bass) st.bass.noteRows = buildNoteRows(st.scale, 1, 2);
    }
    // Effets : interpolation des champs continus des deux ambiances.
    const da = { ...defaultDjState(), ...A.dj }, db = { ...defaultDjState(), ...B.dj };
    const L = (k) => (da[k] ?? 0) + ((db[k] ?? 0) - (da[k] ?? 0)) * t;
    const cur = st.dj;
    cur.filterOn = !!(da.filterOn || db.filterOn);
    cur.cutoff = L('cutoff'); cur.res = L('res');
    cur.room = L('room'); cur.delay = L('delay'); cur.crush = L('crush'); cur.coarse = L('coarse'); cur.vowel = L('vowel');
    cur.autowah = t < 0.5 ? da.autowah : db.autowah;
    cur.phaser = t < 0.5 ? da.phaser : db.phaser;
    // Tempo : fondu fluide (phase préservée).
    const bpm = Math.round(A.bpm + (B.bpm - A.bpm) * t);
    if (ctx.setBpm) ctx.setBpm(bpm, true); else changed();
    scheduleRecord();
  }

  // --- Dessin -> son : mappe le tracé sur les pistes ---
  function applyDrawing({ kind, steps, cols, rnd }) {
    if (steps !== st.steps) { st.steps = steps; resizeTracks(); }
    if (kind === 'melo') {
      if (!st.melo) st.melo = makeMelo('sawtooth');
      const R = st.melo.noteRows.length;
      st.melo.cells = cols.map((y) => {
        if (y == null) return Math.random() < rnd * 0.2 ? Math.floor(Math.random() * R) : null;
        let row = Math.round(y * (R - 1));                        // haut (y=0) -> aigu (row 0)
        if (rnd > 0.15 && Math.random() < rnd) row += (Math.random() < 0.5 ? -1 : 1);
        if (Math.random() < rnd * 0.12) return null;             // petits silences
        return Math.max(0, Math.min(R - 1, row));
      });
      let placed = st.melo.cells.filter((c) => c != null).length;
      while (placed < 3) { const i = Math.floor(Math.random() * st.steps); if (st.melo.cells[i] == null) { st.melo.cells[i] = Math.floor(Math.random() * R); placed++; } }
      st.mood = null;
      render(); changed(); recordNow(); toast('Ton dessin joue la mélodie 🎨');
    } else {
      const n = st.drums.length;
      if (!n) return;
      st.drums.forEach((d) => (d.cells = d.cells.map(() => 0)));
      cols.forEach((y, i) => {
        if (y == null) { if (Math.random() < rnd * 0.22) st.drums[Math.floor(Math.random() * n)].cells[i] = 2; return; }
        let band = Math.round((1 - y) * (n - 1));                 // bas (y=1) -> grave (kick, index 0)
        if (rnd > 0.15 && Math.random() < rnd) band += (Math.random() < 0.5 ? -1 : 1);
        band = Math.max(0, Math.min(n - 1, band));
        st.drums[band].cells[i] = 2;
        if (Math.random() < rnd * 0.2) st.drums[Math.floor(Math.random() * n)].cells[i] = 1; // ghost
      });
      st.drums[0].cells[0] = 2;                                  // fondation kick
      for (let i = 4; i < st.steps; i += 4) if (Math.random() < 1 - rnd * 0.5) st.drums[0].cells[i] = 2;
      st.mood = null;
      render(); changed(); recordNow(); toast('Ton dessin joue le rythme 🥁');
    }
  }

  // --- Générateur de morceau par genre (B1) ---
  function generateGenre(id) {
    const R = GENRES[id];
    if (!R) return;
    const n = st.steps;
    const bpm = R.bpm[0] + Math.floor(Math.random() * (R.bpm[1] - R.bpm[0] + 1));
    if (ctx.setBpm) ctx.setBpm(bpm);
    st.scale = R.scale;
    st.dj.swing = R.swing || 0;
    st.songMode = false; st.editing = null;

    // Batterie : un son du genre par rôle, motif typé (vélocité incluse).
    st.drums = [];
    const roles = [['kick', R.kick], ['snare', R.snare], ['hat', R.hat], ['clap', R.clap]];
    roles.forEach(([emoji, tmpl]) => {
      if (!tmpl || !tmpl.some((v) => v)) return;
      const snd = pickSound({ emoji, type: 'drum', vibe: id });
      if (!snd) return;
      const d = makeDrum(snd.id);
      d.cells = fitTemplate(tmpl, n).map((v) => (emoji === 'hat' && v === 2 && Math.random() < 0.15 ? 1 : v)); // hats un peu humanisés
      st.drums.push(d);
    });

    // Mélodie : son "synthé" du genre + motif au registre/contour du style.
    const meloSnd = pickSound({ emoji: 'synth', type: 'melo', vibe: id }) || pickSound({ type: 'melo' });
    st.melo = makeMelo(meloSnd.id);
    st.melo.noteRows = buildNoteRows(st.scale, st.melo.octaves, 3);
    regenMelodyShaped(R.mel);

    // Basse (Expert) : son de basse du genre, fondamentale sur le motif.
    if (ctx.getLevel() === 'expert') {
      const bassSnd = pickSound({ emoji: 'bass', type: 'melo', vibe: id }) || pickSound({ emoji: 'bass', type: 'melo' });
      st.bass = makeMelo(bassSnd ? bassSnd.id : 'jvbass');
      st.bass.octaves = 1; st.bass.base = 2;
      st.bass.noteRows = buildNoteRows(st.scale, 1, 2);
      const lo = st.bass.noteRows.length - 1;
      st.bass.cells = fitTemplate(R.bass, n).map((v) => (v ? (Math.random() < 0.25 ? Math.floor(Math.random() * st.bass.noteRows.length) : lo) : null));
    }
    render(); changed(); recordNow(); // action discrète -> un pas d'historique propre
  }

  function openGenrePicker() {
    const overlay = el('div', 'kz-modal-overlay');
    const modal = el('div', 'kz-modal small kz-genre');
    const head = el('div', 'kz-modal-head');
    const h2 = el('h2'); h2.innerHTML = `<span class="kz-h2-ic">${icon('wand')}</span>Générateur`;
    const close = el('button', 'kz-close'); close.innerHTML = icon('close');
    close.addEventListener('click', () => overlay.remove());
    head.append(h2, close);
    modal.append(head);
    modal.append(el('div', 'kz-voice-hint', 'Choisis un style — je compose le morceau entier.'));
    const grid = el('div', 'kz-genre-grid');
    Object.entries(GENRES).forEach(([gid, g]) => {
      const v = getVibe(gid) || VIBES[gid];
      const b = el('button', 'kz-genre-btn');
      if (v) b.style.setProperty('--vc', v.color);
      b.innerHTML = `<span class="kz-genre-dot"></span><span>${g.label}</span>`;
      b.addEventListener('click', () => { generateGenre(gid); overlay.remove(); toast('Morceau ' + g.label + ' généré 🎹'); });
      grid.append(b);
    });
    modal.append(grid);
    overlay.append(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.append(overlay);
  }

  // --- Mode Morceau : panneau + actions ---
  const KIND = { loop: { e: 'loop', l: 'Loop' }, break: { e: 'burst', l: 'Break' }, drop: { e: 'drop', l: 'DROP' } };

  function renderSongPanel() {
    const box = el('div', 'kz-song');
    const head = el('div', 'kz-song-head');
    const ti = el('span', 'kz-song-title'); ti.innerHTML = `${icon('song')} Loops`;
    head.append(ti);
    const toggle = el('button', 'kz-song-toggle' + (st.songMode ? ' on' : ''));
    toggle.innerHTML = st.songMode ? `${icon('song')} Morceau` : `${icon('loop')} Boucle`;
    toggle.title = st.songMode ? 'Joue tous les loops à la suite' : 'Joue seulement le loop courant en boucle';
    toggle.addEventListener('click', () => { st.songMode = !st.songMode; const q = willQuantize(); render(); ctx.requestPlay(q ? { quantize: true } : undefined); scheduleRecord(); });
    head.append(toggle);
    box.append(head);

    if (!st.scenes.length) {
      box.append(el('div', 'kz-song-empty', "Aucun loop. Fais un motif, puis « Enregistrer ce loop » — ils s'enchaîneront en morceau."));
    } else {
      const list = el('div', 'kz-loops');
      st.scenes.forEach((sc, i) => {
        const k = KIND[sc.kind] || KIND.loop;
        const row = el('div', 'kz-loop-row k-' + sc.kind + (st.editing === i ? ' editing' : '') + (st.pending === i ? ' pending' : ''));
        const main = el('button', 'kz-loop-main');
        main.innerHTML = `<span class="kz-loop-num">${i + 1}</span><span class="kz-loop-ic">${icon(k.e)}</span><span class="kz-loop-name">${k.l}</span>`;
        main.title = 'Éditer ce loop dans la grille';
        main.addEventListener('click', () => loadScene(i));
        row.append(main);
        const bars = el('button', 'kz-loop-bars', sc.bars + '×');
        bars.title = 'Mesures (toucher pour changer)';
        bars.addEventListener('click', () => { const seq = [1, 2, 4, 8]; sc.bars = seq[(seq.indexOf(sc.bars) + 1) % seq.length]; render(); changed(); });
        row.append(bars);
        const acts = el('div', 'kz-loop-acts');
        const mk = (ic, title, fn, disabled) => { const b = el('button', 'kz-loop-btn'); b.innerHTML = icon(ic); b.title = title; if (disabled) b.disabled = true; else b.addEventListener('click', fn); return b; };
        acts.append(mk('up', 'Monter', () => moveScene(i, -1), i === 0));
        acts.append(mk('down', 'Descendre', () => moveScene(i, 1), i === st.scenes.length - 1));
        acts.append(mk('dup', 'Dupliquer', () => dupScene(i)));
        acts.append(mk('trash', 'Supprimer', () => delScene(i)));
        row.append(acts);
        list.append(row);
      });
      box.append(list);
    }

    const acts = el('div', 'kz-song-acts');
    const add = el('button', 'kz-chip'); add.innerHTML = `${icon('plus')} Enregistrer ce loop`;
    add.addEventListener('click', () => addLoop());
    acts.append(add);
    if (st.editing != null && st.scenes[st.editing]) {
      const upd = el('button', 'kz-chip'); upd.innerHTML = `${icon('loop')} Mettre à jour le loop ${st.editing + 1}`;
      upd.addEventListener('click', () => updateScene());
      acts.append(upd);
    }
    const drop = el('button', 'kz-chip kz-drop'); drop.innerHTML = `${icon('drop')} Définir le Drop${st.dropSnap ? ' ' + icon('check') : ''}`;
    drop.addEventListener('click', () => defineDrop());
    acts.append(drop);
    const auto = el('button', 'kz-chip kz-break'); auto.innerHTML = `${icon('burst')} Break auto + reprise`;
    auto.addEventListener('click', () => autoBreakDrop());
    acts.append(auto);
    box.append(acts);

    // Effets live : one-shots de transition (riser, impact, reverse, tape-stop).
    if (ctx.fxShots && ctx.fxShots.length) {
      box.append(el('div', 'kz-song-sub', 'Effets live (juste avant le drop)'));
      const fxRow = el('div', 'kz-fxshots');
      ctx.fxShots.forEach((f) => {
        const b = el('button', 'kz-fxshot');
        b.innerHTML = `<span class="kz-emoji">${icon(f.icon)}</span><span>${f.label}</span>`;
        b.addEventListener('click', () => { b.classList.remove('fire'); void b.offsetWidth; b.classList.add('fire'); ctx.fxShot(f.id); });
        fxRow.append(b);
      });
      box.append(fxRow);
    }
    return box;
  }

  function addLoop() { st.scenes.push({ kind: 'loop', bars: 4, snap: snapshot() }); st.editing = st.scenes.length - 1; st.songMode = true; render(); changed(); toast('Loop ' + st.scenes.length + ' enregistré'); }
  function updateScene() { if (st.editing == null) return; st.scenes[st.editing].snap = snapshot(); render(); changed(); toast('Loop ' + (st.editing + 1) + ' mis à jour'); }
  function moveScene(i, dir) {
    const j = i + dir; if (j < 0 || j >= st.scenes.length) return;
    const t = st.scenes[i]; st.scenes[i] = st.scenes[j]; st.scenes[j] = t;
    if (st.editing === i) st.editing = j; else if (st.editing === j) st.editing = i;
    render(); changed();
  }
  function dupScene(i) {
    st.scenes.splice(i + 1, 0, clone(st.scenes[i]));
    if (st.editing != null && st.editing > i) st.editing++;
    render(); changed(); toast('Loop dupliqué');
  }
  function delScene(i) {
    st.scenes.splice(i, 1);
    if (st.editing === i) st.editing = null; else if (st.editing != null && st.editing > i) st.editing--;
    render(); changed();
  }
  function loadScene(i) {
    const snap = clone(st.scenes[i].snap);
    if (!snap) return;
    st.steps = snap.steps || st.steps;
    st.drums = snap.drums || [];
    st.melo = snap.melo;
    st.bass = snap.bass;
    st.editing = i;
    const q = willQuantize();
    st.pending = q ? i : null;        // le loop clignote jusqu'à son entrée sur la mesure
    render();
    ctx.requestPlay(q ? { quantize: true } : undefined);
    scheduleRecord();
  }
  function defineDrop() { st.dropSnap = snapshot(); render(); toast('🔥 Drop défini ! Fais "Break auto".'); }
  function autoBreakDrop() {
    const d = st.dropSnap ? clone(st.dropSnap) : snapshot();
    st.scenes = [
      { kind: 'loop', bars: 4, snap: clone(d) },   // intro : le groove
      { kind: 'break', bars: 4, snap: clone(d) },  // montée automatique
      { kind: 'drop', bars: 8, snap: clone(d) },   // reprise qui explose
    ];
    st.songMode = true; st.editing = null;
    render(); changed();
    toast('💥 Morceau créé ! Appuie sur ▶︎ pour le drop');
  }

  // Curseur de lecture (surbrillance colonne courante).
  function highlight(step) {
    st.playHead = step;
    root.querySelectorAll('.kz-cell').forEach((c) => {
      c.classList.toggle('playing', +c.dataset.step === step);
    });
    // Loop en cours de lecture (mode Morceau) : surligne la ligne active.
    if (st.songMode && st.scenes.length && ctx.getElapsedCycles) {
      const rows = root.querySelectorAll('.kz-loop-row');
      if (!rows.length) return;
      const cyc = ctx.getElapsedCycles();
      if (cyc < 0) { rows.forEach((r) => r.classList.remove('now')); return; }
      const total = st.scenes.reduce((a, s) => a + s.bars, 0) || 1;
      const pos = cyc % total;
      let idx = 0, acc = 0;
      for (let n = 0; n < st.scenes.length; n++) { acc += st.scenes[n].bars; if (pos < acc) { idx = n; break; } }
      rows.forEach((r, n) => r.classList.toggle('now', n === idx));
    }
  }

  // --- API mode ---
  return {
    buildCode,
    highlight,
    // La mesure est tombée : le loop en attente est maintenant en jeu.
    onQuantizedFire() { st.pending = null; root.querySelectorAll('.kz-loop-row.pending').forEach((e) => e.classList.remove('pending')); },
    stepsCount: () => st.steps,
    onLevelChange(level) {
      st.steps = level === 'simple' ? 8 : 16;
      st.octaves = level === 'simple' ? 1 : 2;
      if (level === 'expert' && !st.bass) { /* laissé optionnel */ }
      resizeTracks();
      if (st.melo) { st.melo.noteRows = buildNoteRows(st.scale, st.octaves, 3); }
      render();
    },
    init() { defaultKit(); render(); recordNow(); danceLoop(); },
    destroy() { if (danceRAF) cancelAnimationFrame(danceRAF); dancers = []; root.innerHTML = ''; },
  };
}
