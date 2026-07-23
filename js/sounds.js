// sounds.js
// Bibliothèque de sons bien présentée : catégories + noms Strudel + emojis.
// Les noms correspondent aux samples des banques préchargées (dirt-samples,
// crate) et aux synthés intégrés. L'utilisateur peut aussi importer les siens.

import { registerSamples } from './strudel-engine.js';

// type 'drum'   -> son percussif, on/off par pas
// type 'melo'   -> jouable en notes (synthés ou samples pitchables)
// `emoji` porte désormais un NOM D'ICÔNE (cf. icons.js), rendu en SVG monochrome.
// `vibe` = classe de sonorité (genre) avec code couleur (cf. VIBES). L'orga par
// famille (Batterie, Percussions, ...) reste ; la vibe est une étiquette EN PLUS.
export const LIBRARY = {
  Batterie: [
    { id: 'bd', name: 'bd', label: 'Grosse caisse', emoji: 'kick', type: 'drum', vibe: 'techno' },
    { id: 'sd', name: 'sd', label: 'Caisse claire', emoji: 'snare', type: 'drum', vibe: 'house' },
    { id: 'hh', name: 'hh', label: 'Charleston', emoji: 'hat', type: 'drum', vibe: 'techno' },
    { id: 'oh', name: '808oh', label: 'Charleston ouvert', emoji: 'hat', type: 'drum', vibe: 'house' },
    { id: 'cp', name: 'cp', label: 'Clap', emoji: 'clap', type: 'drum', vibe: 'house' },
    { id: 'rim', name: 'rs', label: 'Rimshot', emoji: 'snare', type: 'drum', vibe: 'hiphop' },
    { id: 'lt', name: 'lt', label: 'Tom grave', emoji: 'tom', type: 'drum', vibe: 'acoustique' },
    { id: 'mt', name: 'mt', label: 'Tom médium', emoji: 'tom', type: 'drum', vibe: 'acoustique' },
    { id: 'ht', name: 'ht', label: 'Tom aigu', emoji: 'tom', type: 'drum', vibe: 'acoustique' },
    { id: 'cr', name: 'cr', label: 'Crash', emoji: 'cymbal', type: 'drum', vibe: 'acoustique' },
    { id: 'rd', name: 'crate_rd', label: 'Ride', emoji: 'cymbal', type: 'drum', vibe: 'acoustique' },
    { id: 'bd808', name: '808bd', label: 'Kick 808', emoji: 'kick', type: 'drum', vibe: 'hiphop' },
    { id: 'kicklinn', name: 'kicklinn', label: 'Kick Linn', emoji: 'kick', type: 'drum', vibe: 'retro' },
    { id: 'reverbkick', name: 'reverbkick', label: 'Kick réverb', emoji: 'kick', type: 'drum', vibe: 'techno' },
    { id: 'hardkick', name: 'hardkick', label: 'Kick dur', emoji: 'kick', type: 'drum', vibe: 'techno' },
    { id: 'dr55', name: 'dr55', label: 'Kick DR-55', emoji: 'kick', type: 'drum', vibe: 'retro' },
    { id: 'sd808', name: '808sd', label: 'Snare 808', emoji: 'snare', type: 'drum', vibe: 'hiphop' },
    { id: 'drumtraks', name: 'drumtraks', label: 'Drumtraks', emoji: 'snare', type: 'drum', vibe: 'retro' },
    { id: 'realclaps', name: 'realclaps', label: 'Vrais claps', emoji: 'clap', type: 'drum', vibe: 'acoustique' },
    { id: 'hh27', name: 'hh27', label: 'Charley 27', emoji: 'hat', type: 'drum', vibe: 'retro' },
    { id: 'linnhats', name: 'linnhats', label: 'Hats Linn', emoji: 'hat', type: 'drum', vibe: 'retro' },
    { id: 'cy808', name: '808cy', label: 'Cymbale 808', emoji: 'cymbal', type: 'drum', vibe: 'hiphop' },
  ],
  Percussions: [
    { id: 'perc', name: 'perc', label: 'Perc', emoji: 'perc', type: 'drum', vibe: 'house' },
    { id: 'cb', name: 'cb', label: 'Cowbell', emoji: 'cowbell', type: 'drum', vibe: 'house' },
    { id: 'tabla', name: 'tabla', label: 'Tabla', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'east', name: 'east', label: 'Perc Est', emoji: 'perc', type: 'drum', vibe: 'ambient' },
    { id: 'click', name: 'click', label: 'Click', emoji: 'perc', type: 'drum', vibe: 'techno' },
    { id: 'metal', name: 'metal', label: 'Métal', emoji: 'cymbal', type: 'drum', vibe: 'techno' },
    { id: 'insect', name: 'insect', label: 'Insecte', emoji: 'noise', type: 'drum', vibe: 'ambient' },
    { id: 'space', name: 'space', label: 'Espace', emoji: 'star', type: 'drum', vibe: 'ambient' },
    { id: 'cc', name: 'cc', label: 'Cymbale CC', emoji: 'cymbal', type: 'drum', vibe: 'acoustique' },
    { id: 'tabla2', name: 'tabla2', label: 'Tabla 2', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'tablex', name: 'tablex', label: 'Tabla X', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'can', name: 'can', label: 'Canette', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'tink', name: 'tink', label: 'Tink', emoji: 'perc', type: 'drum', vibe: 'retro' },
    { id: 'tok', name: 'tok', label: 'Tok', emoji: 'perc', type: 'drum', vibe: 'techno' },
    { id: 'gretsch', name: 'gretsch', label: 'Gretsch', emoji: 'snare', type: 'drum', vibe: 'acoustique' },
    { id: 'glasstap', name: 'glasstap', label: 'Verre', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'bottle', name: 'bottle', label: 'Bouteille', emoji: 'perc', type: 'drum', vibe: 'acoustique' },
    { id: 'industrial', name: 'industrial', label: 'Industriel', emoji: 'noise', type: 'drum', vibe: 'techno' },
  ],
  Basses: [
    { id: 'jvbass', name: 'jvbass', label: 'Basse JV', emoji: 'bass', type: 'melo', vibe: 'house' },
    { id: 'bass', name: 'bass', label: 'Basse', emoji: 'bass', type: 'melo', vibe: 'house' },
    { id: 'sawtooth', name: 'sawtooth', label: 'Basse Saw', emoji: 'synth', type: 'melo', vibe: 'techno' },
    { id: 'square', name: 'square', label: 'Basse Carré', emoji: 'synth', type: 'melo', vibe: 'retro' },
    { id: 'bass1', name: 'bass1', label: 'Basse 1', emoji: 'bass', type: 'melo', vibe: 'house' },
    { id: 'bass2', name: 'bass2', label: 'Basse 2', emoji: 'bass', type: 'melo', vibe: 'house' },
    { id: 'bass3', name: 'bass3', label: 'Basse 3', emoji: 'bass', type: 'melo', vibe: 'house' },
    { id: 'bassdm', name: 'bassdm', label: 'Basse DM', emoji: 'bass', type: 'melo', vibe: 'retro' },
    { id: 'jungbass', name: 'jungbass', label: 'Jungle Bass', emoji: 'bass', type: 'melo', vibe: 'trance' },
  ],
  Synthés: [
    { id: 'sine', name: 'sine', label: 'Sinus doux', emoji: 'synth', type: 'melo', vibe: 'ambient' },
    { id: 'triangle', name: 'triangle', label: 'Triangle', emoji: 'synth', type: 'melo', vibe: 'retro' },
    { id: 'sawtooth2', name: 'sawtooth', label: 'Saw brillant', emoji: 'synth', type: 'melo', vibe: 'trance' },
    { id: 'square2', name: 'square', label: 'Carré rétro', emoji: 'synth', type: 'melo', vibe: 'retro' },
    { id: 'arpy', name: 'arpy', label: 'Arpy', emoji: 'synth', type: 'melo', vibe: 'trance' },
    { id: 'piano', name: 'juno', label: 'Piano', emoji: 'synth', type: 'melo', vibe: 'house' },
    { id: 'hoover', name: 'hoover', label: 'Hoover', emoji: 'synth', type: 'melo', vibe: 'trance' },
    { id: 'stab', name: 'stab', label: 'Stab', emoji: 'synth', type: 'melo', vibe: 'house' },
    { id: 'pad', name: 'pad', label: 'Nappe', emoji: 'synth', type: 'melo', vibe: 'ambient' },
    { id: 'padlong', name: 'padlong', label: 'Nappe longue', emoji: 'synth', type: 'melo', vibe: 'ambient' },
    { id: 'pluck', name: 'pluck', label: 'Pluck', emoji: 'synth', type: 'melo', vibe: 'trance' },
    { id: 'moog', name: 'moog', label: 'Moog', emoji: 'synth', type: 'melo', vibe: 'techno' },
    { id: 'sitar', name: 'sitar', label: 'Sitar', emoji: 'synth', type: 'melo', vibe: 'ambient' },
    { id: 'bleep', name: 'bleep', label: 'Bleep', emoji: 'synth', type: 'melo', vibe: 'retro' },
  ],
  Ambiances: [
    { id: 'casio', name: 'casio', label: 'Casio', emoji: 'synth', type: 'melo', vibe: 'retro' },
    { id: 'jazz', name: 'jazz', label: 'Jazz', emoji: 'synth', type: 'melo', vibe: 'acoustique' },
    { id: 'metal2', name: 'metal', label: 'Cloche métal', emoji: 'cymbal', type: 'melo', vibe: 'ambient' },
    { id: 'numbers', name: 'numbers', label: 'Voix chiffres', emoji: 'voice', type: 'drum', vibe: 'retro' },
    { id: 'birds', name: 'birds', label: 'Oiseaux', emoji: 'star', type: 'drum', vibe: 'ambient' },
    { id: 'birds3', name: 'birds3', label: 'Oiseaux 2', emoji: 'star', type: 'drum', vibe: 'ambient' },
    { id: 'crow', name: 'crow', label: 'Corbeau', emoji: 'star', type: 'drum', vibe: 'ambient' },
    { id: 'wind', name: 'wind', label: 'Vent', emoji: 'noise', type: 'drum', vibe: 'ambient' },
    { id: 'fire', name: 'fire', label: 'Feu', emoji: 'noise', type: 'drum', vibe: 'ambient' },
    { id: 'sheffield', name: 'sheffield', label: 'Sheffield', emoji: 'noise', type: 'drum', vibe: 'ambient' },
    { id: 'world', name: 'world', label: 'World', emoji: 'perc', type: 'drum', vibe: 'ambient' },
    { id: 'coins', name: 'coins', label: 'Pièces', emoji: 'star', type: 'drum', vibe: 'retro' },
    { id: 'alphabet', name: 'alphabet', label: 'Alphabet', emoji: 'voice', type: 'drum', vibe: 'retro' },
    { id: 'sax', name: 'sax', label: 'Saxo', emoji: 'synth', type: 'melo', vibe: 'acoustique' },
  ],
};

// Classes de sonorité (genres) + code couleur. « perso » = sons importés/voix.
export const VIBES = {
  techno: { label: 'Techno', color: '#57D1FF' },
  trance: { label: 'Trance', color: '#B47CFF' },
  house: { label: 'House', color: '#FF9F1C' },
  hiphop: { label: 'Hip-hop', color: '#F4D03F' },
  ambient: { label: 'Ambient', color: '#35E3C2' },
  acoustique: { label: 'Acoustique', color: '#8BC34A' },
  retro: { label: 'Rétro', color: '#FF5DA2' },
  perso: { label: 'Perso', color: '#9AA6B8' },
};
export function getVibe(id) { return VIBES[id] || null; }

// Choisit un son de la bibliothèque par rôle (emoji), type et genre (vibe).
// Préfère un son du bon genre, sinon retombe sur le premier du rôle.
export function pickSound({ emoji, type, vibe } = {}) {
  let pool = Object.values(LIBRARY).flat();
  if (type) pool = pool.filter((s) => s.type === type);
  if (emoji) pool = pool.filter((s) => s.emoji === emoji);
  if (!pool.length) return null;
  return pool.find((s) => s.vibe === vibe) || pool[0];
}

// Sons importés par l'utilisateur (ajoutés dans une catégorie dédiée).
const imported = [];

export function getCategories() {
  const cats = { ...LIBRARY };
  if (imported.length) cats['Mes sons 🌟'] = imported;
  return cats;
}

export function findSound(id) {
  for (const arr of Object.values(getCategories())) {
    const found = arr.find((s) => s.id === id);
    if (found) return found;
  }
  return null;
}

// Importe des fichiers audio locaux -> enregistre dans Strudel + biblio.
export async function importFiles(fileList) {
  const added = [];
  const entries = {};
  for (const file of fileList) {
    if (!file.type.startsWith('audio')) continue;
    const url = URL.createObjectURL(file);
    const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    let id = base || 'son';
    let i = 1;
    while (findSound(id) || entries[id]) { id = base + i; i++; }
    entries[id] = [url];
    const item = { id, name: id, label: file.name.replace(/\.[^.]+$/, ''), emoji: 'star', type: 'drum', vibe: 'perso', imported: true };
    imported.push(item);
    added.push(item);
  }
  if (Object.keys(entries).length) {
    await registerSamples(entries);
  }
  return added;
}

// Ajoute un son déjà traité (ex. voix autotunée) à la bibliothèque.
export async function addProcessedSound(label, url, type = 'melo') {
  let id = 'voix'; let i = 1;
  while (findSound(id)) { id = 'voix' + i; i++; }
  await registerSamples({ [id]: [url] });
  const item = { id, name: id, label, emoji: 'voice', type, vibe: 'perso', imported: true };
  imported.push(item);
  return item;
}

// Kits presets pour démarrer vite (mode Simple).
export const KITS = {
  'Techno galaxie': ['bd', 'sd', 'hh', 'cp'],
  'Hip-hop': ['bd', 'sd', 'hh', 'perc'],
  'Jungle': ['bd', 'sd', 'hh', 'cb'],
  'Espace': ['bd', 'space', 'hh', 'metal'],
};
