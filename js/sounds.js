// sounds.js
// Bibliothèque de sons bien présentée : catégories + noms Strudel + emojis.
// Les noms correspondent aux samples des banques préchargées (dirt-samples,
// crate) et aux synthés intégrés. L'utilisateur peut aussi importer les siens.

import { registerSamples } from './strudel-engine.js';

// type 'drum'   -> son percussif, on/off par pas
// type 'melo'   -> jouable en notes (synthés ou samples pitchables)
export const LIBRARY = {
  Batterie: [
    { id: 'bd', name: 'bd', label: 'Grosse caisse', emoji: '🥁', type: 'drum' },
    { id: 'sd', name: 'sd', label: 'Caisse claire', emoji: '🪘', type: 'drum' },
    { id: 'hh', name: 'hh', label: 'Charleston', emoji: '🎩', type: 'drum' },
    { id: 'oh', name: 'oh', label: 'Charleston ouvert', emoji: '👐', type: 'drum' },
    { id: 'cp', name: 'cp', label: 'Clap', emoji: '👏', type: 'drum' },
    { id: 'rim', name: 'rim', label: 'Rimshot', emoji: '📏', type: 'drum' },
    { id: 'lt', name: 'lt', label: 'Tom grave', emoji: '🛢️', type: 'drum' },
    { id: 'mt', name: 'mt', label: 'Tom médium', emoji: '🥫', type: 'drum' },
    { id: 'ht', name: 'ht', label: 'Tom aigu', emoji: '🔔', type: 'drum' },
    { id: 'cr', name: 'cr', label: 'Crash', emoji: '💥', type: 'drum' },
    { id: 'rd', name: 'rd', label: 'Ride', emoji: '🛎️', type: 'drum' },
  ],
  Percussions: [
    { id: 'perc', name: 'perc', label: 'Perc', emoji: '🎯', type: 'drum' },
    { id: 'cb', name: 'cb', label: 'Cowbell', emoji: '🐄', type: 'drum' },
    { id: 'tabla', name: 'tabla', label: 'Tabla', emoji: '🪘', type: 'drum' },
    { id: 'east', name: 'east', label: 'Perc Est', emoji: '🌏', type: 'drum' },
    { id: 'click', name: 'click', label: 'Click', emoji: '🖱️', type: 'drum' },
    { id: 'metal', name: 'metal', label: 'Métal', emoji: '⚙️', type: 'drum' },
    { id: 'insect', name: 'insect', label: 'Insecte', emoji: '🦗', type: 'drum' },
    { id: 'space', name: 'space', label: 'Espace', emoji: '🛸', type: 'drum' },
  ],
  Basses: [
    { id: 'jvbass', name: 'jvbass', label: 'Basse JV', emoji: '🎸', type: 'melo' },
    { id: 'bass', name: 'bass', label: 'Basse', emoji: '🔊', type: 'melo' },
    { id: 'sawtooth', name: 'sawtooth', label: 'Basse Saw', emoji: '📐', type: 'melo' },
    { id: 'square', name: 'square', label: 'Basse Carré', emoji: '🟦', type: 'melo' },
  ],
  Synthés: [
    { id: 'sine', name: 'sine', label: 'Sinus doux', emoji: '〰️', type: 'melo' },
    { id: 'triangle', name: 'triangle', label: 'Triangle', emoji: '🔺', type: 'melo' },
    { id: 'sawtooth2', name: 'sawtooth', label: 'Saw brillant', emoji: '⚡', type: 'melo' },
    { id: 'square2', name: 'square', label: 'Carré rétro', emoji: '👾', type: 'melo' },
    { id: 'arpy', name: 'arpy', label: 'Arpy', emoji: '🎹', type: 'melo' },
    { id: 'piano', name: 'piano', label: 'Piano', emoji: '🎼', type: 'melo' },
  ],
  Ambiances: [
    { id: 'casio', name: 'casio', label: 'Casio', emoji: '🎛️', type: 'melo' },
    { id: 'jazz', name: 'jazz', label: 'Jazz', emoji: '🎷', type: 'melo' },
    { id: 'metal2', name: 'metal', label: 'Cloche métal', emoji: '🔩', type: 'melo' },
    { id: 'numbers', name: 'numbers', label: 'Voix chiffres', emoji: '🔢', type: 'drum' },
    { id: 'birds', name: 'birds', label: 'Oiseaux', emoji: '🐦', type: 'drum' },
  ],
};

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
    const item = { id, name: id, label: file.name.replace(/\.[^.]+$/, ''), emoji: '🌟', type: 'drum', imported: true };
    imported.push(item);
    added.push(item);
  }
  if (Object.keys(entries).length) {
    await registerSamples(entries);
  }
  return added;
}

// Kits presets pour démarrer vite (mode Simple).
export const KITS = {
  'Techno galaxie': ['bd', 'sd', 'hh', 'cp'],
  'Hip-hop': ['bd', 'sd', 'hh', 'perc'],
  'Jungle': ['bd', 'sd', 'hh', 'cb'],
  'Espace': ['bd', 'space', 'hh', 'metal'],
};
