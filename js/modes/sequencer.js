// modes/sequencer.js — grille séquenceur (une ligne par instrument).
import { el, slider, openSoundLibrary, iconButton, toast } from '../ui.js';
import { findSound, KITS } from '../sounds.js';
import { SCALES, buildNoteRows, drumRowToMini, meloGridToMini, fxChain, assemble } from '../music.js';
import { defaultDjState, djFxChain, djIsActive, renderDjControls } from '../djfx.js';

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
    dropSnap: null,   // snapshot figé comme "le Drop"
    // --- Sous-menu Ultra DJ (effets live sur le beat) ---
    dj: defaultDjState(),
    djOpen: false,
  };

  let uid = 0;
  const nid = () => 'trk' + (uid++);

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
    // petite mélodie
    const rows = st.melo.noteRows;
    const pat = st.steps === 8 ? [0, null, 2, null, 1, null, 3, null] : [0, null, null, 2, null, null, 1, null, 3, null, null, 2, null, 1, null, 4];
    st.melo.cells = pat.map((p) => (p == null ? null : Math.min(p, rows.length - 1)));
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
  function seedStep(track, idxs) { idxs.forEach((i) => { if (i < track.cells.length) track.cells[i] = true; }); }

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

  // --- Génération du code ---
  const clone = (o) => (o == null ? null : JSON.parse(JSON.stringify(o)));
  function snapshot() {
    return { steps: st.steps, drums: clone(st.drums), melo: clone(st.melo), bass: clone(st.bass) };
  }

  // Patterns Strudel d'une source { drums, melo, bass } (état live OU snapshot).
  function patternsOf(src) {
    const pats = [];
    (src.drums || []).forEach((d) => {
      if (d.muted || !d.cells.some(Boolean)) return;
      const snd = findSound(d.soundId);
      const name = snd ? snd.name : d.soundId;
      pats.push(drumRowToMini(name, d.cells) + fxChain({ gain: d.gain, ...d.fx }));
    });
    [src.melo, src.bass].forEach((m) => {
      if (!m || m.muted || !m.cells.some((c) => c != null)) return;
      const snd = findSound(m.soundId);
      const name = snd ? snd.name : m.soundId;
      pats.push(meloGridToMini(name, m.noteRows, m.cells) + fxChain({ gain: m.gain, ...m.fx }));
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
    const fx = djFxChain(st.dj); // effets Ultra DJ appliqués au motif final
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

  function changed() { ctx.requestPlay(); }

  function render() {
    root.innerHTML = '';
    const level = ctx.getLevel();

    // Barre outils
    const tools = el('div', 'kz-seq-tools');
    tools.append(iconButton('🎲', 'Surprise', () => { randomize(); toast('Nouveau motif !'); }, 'small'));
    tools.append(iconButton('🧹', 'Effacer', () => { clearAll(); }, 'small'));
    tools.append(iconButton('🎚️', 'Ultra DJ', () => { st.djOpen = !st.djOpen; render(); }, 'small' + ((st.djOpen || djIsActive(st.dj)) ? ' active' : '')));
    if (level === 'expert') {
      // sélecteur de gamme
      const scaleSel = el('select', 'kz-select');
      Object.keys(SCALES).forEach((s) => {
        const o = el('option', null, s); o.value = s; if (s === st.scale) o.selected = true; scaleSel.append(o);
      });
      scaleSel.addEventListener('change', () => { st.scale = scaleSel.value; rebuildScales(); render(); changed(); });
      const sl = el('label', 'kz-inline-label', '🎼'); sl.append(scaleSel);
      tools.append(sl);
      // nombre de pas
      const stepSel = el('select', 'kz-select');
      [8, 16].forEach((n) => { const o = el('option', null, n + ' pas'); o.value = n; if (n === st.steps) o.selected = true; stepSel.append(o); });
      stepSel.addEventListener('change', () => { st.steps = +stepSel.value; resizeTracks(); render(); changed(); });
      tools.append(stepSel);
      tools.append(iconButton('➕', 'Instrument', () => addDrumTrack(), 'small'));
    }
    root.append(tools);

    const grid = el('div', 'kz-tracks');
    st.drums.forEach((d) => grid.append(renderDrumTrack(d, level)));
    if (st.melo) grid.append(renderMeloTrack(st.melo, '🎶 Mélodie', level));
    if (st.bass) grid.append(renderMeloTrack(st.bass, '🎸 Basse', level));
    root.append(grid);

    if (st.djOpen) root.append(renderDjPanel());
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
    pick.innerHTML = `<span class="kz-emoji">${snd ? snd.emoji : '🔊'}</span><span>${snd ? snd.label : d.soundId}</span>`;
    pick.addEventListener('click', () => openSoundLibrary((s) => { d.soundId = s.id; render(); changed(); }, 'drum'));
    head.append(pick);
    if (level === 'expert') {
      const mute = el('button', 'kz-mini' + (d.muted ? ' on' : ''), d.muted ? '🔇' : '🔊');
      mute.addEventListener('click', () => { d.muted = !d.muted; render(); changed(); });
      head.append(mute);
      const del = el('button', 'kz-mini', '🗑️');
      del.addEventListener('click', () => { st.drums = st.drums.filter((x) => x !== d); render(); changed(); });
      head.append(del);
    }
    row.append(head);

    const cells = el('div', 'kz-cells');
    cells.style.setProperty('--steps', st.steps);
    d.cells.forEach((on, i) => {
      const c = el('button', 'kz-cell' + (on ? ' on' : '') + (i % 4 === 0 ? ' beat' : ''));
      c.dataset.step = i;
      c.addEventListener('click', () => { d.cells[i] = !d.cells[i]; c.classList.toggle('on'); changed(); });
      cells.append(c);
    });
    row.append(cells);

    if (level === 'expert') row.append(renderFxRow(d));
    return row;
  }

  function renderMeloTrack(m, title, level) {
    const wrap = el('div', 'kz-track kz-melo');
    const head = el('div', 'kz-track-head');
    const snd = findSound(m.soundId);
    const pick = el('button', 'kz-track-sound');
    pick.innerHTML = `<span class="kz-emoji">${snd ? snd.emoji : '🎹'}</span><span>${title}</span>`;
    pick.addEventListener('click', () => openSoundLibrary((s) => { m.soundId = s.id; render(); changed(); }, 'melo'));
    head.append(pick);
    if (level === 'expert') {
      const mute = el('button', 'kz-mini' + (m.muted ? ' on' : ''), m.muted ? '🔇' : '🔊');
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
    wrap.append(gridEl);
    if (level === 'expert') wrap.append(renderFxRow(m));
    return wrap;
  }

  function renderFxRow(track) {
    const fx = track.fx;
    const box = el('div', 'kz-fx');
    box.append(slider('🔊 Volume', track.gain, (v) => { track.gain = v; changed(); }));
    box.append(slider('🌫️ Filtre', fx.lpf ?? 1, (v) => { fx.lpf = v; changed(); }));
    box.append(slider('🏔️ Réverb', fx.room ?? 0, (v) => { fx.room = v; changed(); }));
    box.append(slider('🔁 Écho', fx.delay ?? 0, (v) => { fx.delay = v; changed(); }));
    box.append(slider('🤖 Crush', fx.crush ?? 0, (v) => { fx.crush = v; changed(); }));
    box.append(slider('🔥 Disto', fx.distort ?? 0, (v) => { fx.distort = v; changed(); }));
    return box;
  }

  // --- Actions ---
  function addDrumTrack() {
    openSoundLibrary((s) => { st.drums.push(makeDrum(s.id)); render(); changed(); }, 'drum');
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
        if (di === 0) return i % 4 === 0;                // kick sur les temps
        if (di === 1) return i % 8 === 4;                // snare backbeat
        return Math.random() < 0.35;                      // reste aléatoire
      });
    });
    if (st.melo) {
      const rows = st.melo.noteRows;
      st.melo.cells = st.melo.cells.map(() => (Math.random() < 0.4 ? Math.floor(Math.random() * rows.length) : null));
    }
    render(); changed();
  }
  function clearAll() {
    st.drums.forEach((d) => (d.cells = d.cells.map(() => false)));
    if (st.melo) st.melo.cells = st.melo.cells.map(() => null);
    if (st.bass) st.bass.cells = st.bass.cells.map(() => null);
    render(); changed();
  }

  // --- Sous-menu Ultra DJ ---
  let djTimer = null;
  function djChange() { if (djTimer) return; djTimer = setTimeout(() => { djTimer = null; changed(); }, 60); }
  function renderDjPanel() {
    const box = el('div', 'kz-song');
    const head = el('div', 'kz-song-head');
    head.append(el('span', 'kz-song-title', '🎚️ Ultra DJ — triture le son'));
    const close = el('button', 'kz-song-toggle on', 'Fermer');
    close.addEventListener('click', () => { st.djOpen = false; render(); });
    head.append(close);
    box.append(head);
    const controls = el('div', 'dj-controls');
    renderDjControls(controls, st.dj, djChange);
    box.append(controls);
    return box;
  }

  // --- Mode Morceau : panneau + actions ---
  const KIND = { loop: { e: '🔁', l: 'Loop' }, break: { e: '💥', l: 'Break' }, drop: { e: '🔥', l: 'DROP' } };

  function renderSongPanel() {
    const box = el('div', 'kz-song');
    const head = el('div', 'kz-song-head');
    head.append(el('span', 'kz-song-title', '🎬 Morceau'));
    const toggle = el('button', 'kz-song-toggle' + (st.songMode ? ' on' : ''), st.songMode ? '▶︎ Morceau' : '🔁 Boucle');
    toggle.addEventListener('click', () => { st.songMode = !st.songMode; render(); changed(); });
    head.append(toggle);
    box.append(head);

    const list = el('div', 'kz-scenes');
    if (!st.scenes.length) {
      list.append(el('span', 'kz-song-empty', "Ajoute des loops → ils s'enchaînent en morceau."));
    }
    st.scenes.forEach((sc, i) => {
      const k = KIND[sc.kind] || KIND.loop;
      const chip = el('div', 'kz-scene k-' + sc.kind + (st.editing === i ? ' editing' : ''));
      const main = el('button', 'kz-scene-main');
      main.innerHTML = `<b>${i + 1}</b><span>${k.e}</span>`;
      main.title = k.l + ' — toucher pour éditer';
      main.addEventListener('click', () => loadScene(i));
      chip.append(main);
      const bars = el('button', 'kz-scene-bars', sc.bars + '×');
      bars.title = 'Nombre de mesures';
      bars.addEventListener('click', () => { const seq = [1, 2, 4, 8]; sc.bars = seq[(seq.indexOf(sc.bars) + 1) % seq.length]; render(); changed(); });
      chip.append(bars);
      const del = el('button', 'kz-scene-del', '✕');
      del.addEventListener('click', () => { st.scenes.splice(i, 1); if (st.editing === i) st.editing = null; else if (st.editing > i) st.editing--; render(); changed(); });
      chip.append(del);
      list.append(chip);
    });
    box.append(list);

    const acts = el('div', 'kz-song-acts');
    const add = el('button', 'kz-chip', '➕ Ajouter ce loop');
    add.addEventListener('click', () => addLoop());
    acts.append(add);
    if (st.editing != null) {
      const upd = el('button', 'kz-chip', '🔁 Mettre à jour ' + (st.editing + 1));
      upd.addEventListener('click', () => updateScene());
      acts.append(upd);
    }
    const drop = el('button', 'kz-chip kz-drop', '🔥 Définir le Drop' + (st.dropSnap ? ' ✓' : ''));
    drop.addEventListener('click', () => defineDrop());
    acts.append(drop);
    const auto = el('button', 'kz-chip kz-break', '💥 Break auto + reprise');
    auto.addEventListener('click', () => autoBreakDrop());
    acts.append(auto);
    box.append(acts);
    return box;
  }

  function addLoop() { st.scenes.push({ kind: 'loop', bars: 4, snap: snapshot() }); st.editing = st.scenes.length - 1; st.songMode = true; render(); changed(); toast('Loop ' + st.scenes.length + ' ajouté 🎬'); }
  function updateScene() { if (st.editing == null) return; st.scenes[st.editing].snap = snapshot(); render(); changed(); toast('Loop ' + (st.editing + 1) + ' mis à jour'); }
  function loadScene(i) {
    const snap = clone(st.scenes[i].snap);
    if (!snap) return;
    st.steps = snap.steps || st.steps;
    st.drums = snap.drums || [];
    st.melo = snap.melo;
    st.bass = snap.bass;
    st.editing = i;
    render(); changed();
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
  }

  // --- API mode ---
  return {
    buildCode,
    highlight,
    stepsCount: () => st.steps,
    onLevelChange(level) {
      st.steps = level === 'simple' ? 8 : 16;
      st.octaves = level === 'simple' ? 1 : 2;
      if (level === 'expert' && !st.bass) { /* laissé optionnel */ }
      resizeTracks();
      if (st.melo) { st.melo.noteRows = buildNoteRows(st.scale, st.octaves, 3); }
      render();
    },
    init() { defaultKit(); render(); },
    destroy() { root.innerHTML = ''; },
  };
}
