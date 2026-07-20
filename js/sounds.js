// sounds.js
// Bibliothèque de sons bien présentée : catégories + noms Strudel + emojis.
// Les noms correspondent aux samples des banques préchargées (dirt-samples,
// crate) et aux synthés intégrés. L'utilisateur peut aussi importer les siens.

import { registerSamples } from './strudel-engine.js';

// type 'drum'   -> son percussif, on/off par pas
// type 'melo'   -> jouable en notes (synthés ou samples pitchables)
// `emoji` porte désormais un NOM D'ICÔNE (cf. icons.js), rendu en SVG monochrome.
export const LIBRARY = {
  Batterie: [
    { id: 'bd', name: 'bd', label: 'Grosse caisse', emoji: 'kick', type: 'drum' },
    { id: 'sd', name: 'sd', label: 'Caisse claire', emoji: 'snare', type: 'drum' },
    { id: 'hh', name: 'hh', label: 'Charleston', emoji: 'hat', type: 'drum' },
    { id: 'oh', name: '808oh', label: 'Charleston ouvert', emoji: 'hat', type: 'drum' },
    { id: 'cp', name: 'cp', label: 'Clap', emoji: 'clap', type: 'drum' },
    { id: 'rim', name: 'rs', label: 'Rimshot', emoji: 'snare', type: 'drum' },
    { id: 'lt', name: 'lt', label: 'Tom grave', emoji: 'tom', type: 'drum' },
    { id: 'mt', name: 'mt', label: 'Tom médium', emoji: 'tom', type: 'drum' },
    { id: 'ht', name: 'ht', label: 'Tom aigu', emoji: 'tom', type: 'drum' },
    { id: 'cr', name: 'cr', label: 'Crash', emoji: 'cymbal', type: 'drum' },
    { id: 'rd', name: 'crate_rd', label: 'Ride', emoji: 'cymbal', type: 'drum' },
  ],
  Percussions: [
    { id: 'perc', name: 'perc', label: 'Perc', emoji: 'perc', type: 'drum' },
    { id: 'cb', name: 'cb', label: 'Cowbell', emoji: 'cowbell', type: 'drum' },
    { id: 'tabla', name: 'tabla', label: 'Tabla', emoji: 'perc', type: 'drum' },
    { id: 'east', name: 'east', label: 'Perc Est', emoji: 'perc', type: 'drum' },
    { id: 'click', name: 'click', label: 'Click', emoji: 'perc', type: 'drum' },
    { id: 'metal', name: 'metal', label: 'Métal', emoji: 'cymbal', type: 'drum' },
    { id: 'insect', name: 'insect', label: 'Insecte', emoji: 'noise', type: 'drum' },
    { id: 'space', name: 'space', label: 'Espace', emoji: 'star', type: 'drum' },
  ],
  Basses: [
    { id: 'jvbass', name: 'jvbass', label: 'Basse JV', emoji: 'bass', type: 'melo' },
    { id: 'bass', name: 'bass', label: 'Basse', emoji: 'bass', type: 'melo' },
    { id: 'sawtooth', name: 'sawtooth', label: 'Basse Saw', emoji: 'synth', type: 'melo' },
    { id: 'square', name: 'square', label: 'Basse Carré', emoji: 'synth', type: 'melo' },
  ],
  Synthés: [
    { id: 'sine', name: 'sine', label: 'Sinus doux', emoji: 'synth', type: 'melo' },
    { id: 'triangle', name: 'triangle', label: 'Triangle', emoji: 'synth', type: 'melo' },
    { id: 'sawtooth2', name: 'sawtooth', label: 'Saw brillant', emoji: 'synth', type: 'melo' },
    { id: 'square2', name: 'square', label: 'Carré rétro', emoji: 'synth', type: 'melo' },
    { id: 'arpy', name: 'arpy', label: 'Arpy', emoji: 'synth', type: 'melo' },
    { id: 'piano', name: 'juno', label: 'Piano', emoji: 'synth', type: 'melo' },
  ],
  Ambiances: [
    { id: 'casio', name: 'casio', label: 'Casio', emoji: 'synth', type: 'melo' },
    { id: 'jazz', name: 'jazz', label: 'Jazz', emoji: 'synth', type: 'melo' },
    { id: 'metal2', name: 'metal', label: 'Cloche métal', emoji: 'cymbal', type: 'melo' },
    { id: 'numbers', name: 'numbers', label: 'Voix chiffres', emoji: 'voice', type: 'drum' },
    { id: 'birds', name: 'birds', label: 'Oiseaux', emoji: 'star', type: 'drum' },
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
    const item = { id, name: id, label: file.name.replace(/\.[^.]+$/, ''), emoji: 'star', type: 'drum', imported: true };
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
