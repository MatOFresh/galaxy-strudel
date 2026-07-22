// icons.js — jeu d'icônes SVG monochrome "techno/robot", unicolore.
// Toutes héritent de currentColor (donc de la teinte du contexte). Style
// géométrique, stroke 2, coins nets — cohérent façon instrument de studio.
const S = (inner, fill) =>
  `<svg viewBox="0 0 24 24" class="ic" fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const I = {
  // --- chrome / navigation ---
  home: S('<path d="M4 11l8-6 8 6"/><path d="M6 10v9h5v-5h2v5h5v-9"/>'),
  back: S('<path d="M15 5l-7 7 7 7"/>'),
  close: S('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: S('<path d="M5 12l5 5L20 6"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  trash: S('<path d="M5 7h14M9 7V4h6v3M7 7l1 12h8l1-12"/>'),
  reset: S('<path d="M5 9h8a4 4 0 110 8H8"/><path d="M5 9l3-3M5 9l3 3"/>'),
  // --- transport ---
  play: S('<path d="M8 5l11 7-11 7z"/>', true),
  pause: S('<rect x="7" y="5" width="3.4" height="14" rx="1"/><rect x="13.6" y="5" width="3.4" height="14" rx="1"/>', true),
  // --- robot / niveaux ---
  robot: S('<rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 4v4"/><circle cx="12" cy="4" r="1.4"/><path d="M9.5 12.5h.01M14.5 12.5h.01M9 16h6"/>'),
  cpu: S('<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10.5" y="10.5" width="3" height="3"/><path d="M9.5 4v3M14.5 4v3M9.5 17v3M14.5 17v3M4 9.5h3M4 14.5h3M17 9.5h3M17 14.5h3"/>'),
  // --- modes ---
  grid: S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 12h18M9 5v14M15 5v14"/>'),
  pads: S('<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>'),
  // --- outils séquenceur ---
  dice: S('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/>'),
  eraser: S('<path d="M4 15l7-7 6 6-4 4H8z"/><path d="M9 20h11"/>'),
  sliders: S('<path d="M4 8h8M17 8h3M4 16h3M12 16h8"/><circle cx="14" cy="8" r="2.4" fill="currentColor" stroke="none"/><circle cx="9" cy="16" r="2.4" fill="currentColor" stroke="none"/>'),
  scale: S('<path d="M9 18V6l10-2v11"/><circle cx="7" cy="18" r="2" fill="currentColor" stroke="none"/><circle cx="17" cy="15" r="2" fill="currentColor" stroke="none"/>'),
  steps: S('<path d="M5 20V9M10 20V4M15 20V12M20 20V7"/>'),
  // Kaléidoscope : deux triangles (hexagramme) + cercle + centre = mandala.
  kaleido: S('<circle cx="12" cy="12" r="9.2"/><path d="M12 3.2l7.6 13.2H4.4z"/><path d="M12 20.8L4.4 7.6h15.2z"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/>'),
  // --- morceau ---
  song: S('<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 8l3-4h12l3 4M8.5 4L6.5 8M13.5 4l-2 4"/>'),
  loop: S('<path d="M5 9a5 5 0 015-5h5M19 15a5 5 0 01-5 5H9"/><path d="M15 1l3 3-3 3M9 23l-3-3 3-3"/>'),
  burst: S('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>'),
  drop: S('<path d="M13 3L5 13h5l-1 8 9-12h-6z"/>', true),
  // --- effets DJ / fx ---
  slow: S('<path d="M11 6L5 12l6 6zM19 6l-6 6 6 6z"/>', true),
  fast: S('<path d="M5 6l6 6-6 6zM13 6l6 6-6 6z"/>', true),
  reverse: S('<path d="M8 7h10l-3-3M16 17H6l3 3"/>'),
  chop: S('<circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="M8 8l12 8M8 16L20 8"/>'),
  wah: S('<path d="M3 12c3-7 6 7 9 0s6-7 9 0"/>'),
  swing: S('<path d="M3 15c2.5 0 3-7 5.5-7S11 15 13.5 15s3-7 5.5-7"/><circle cx="8.5" cy="8" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="8" r="1.4" fill="currentColor" stroke="none"/>'),
  reverb: S('<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><path d="M8.5 8.5a5 5 0 000 7M15.5 8.5a5 5 0 010 7M6 6a9 9 0 000 12M18 6a9 9 0 010 12"/>'),
  echo: S('<circle cx="6" cy="12" r="2" fill="currentColor" stroke="none"/><circle cx="12.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18" cy="12" r="1" fill="currentColor" stroke="none"/>'),
  crush: S('<rect x="5" y="5" width="5" height="5"/><rect x="14" y="5" width="5" height="5"/><rect x="5" y="14" width="5" height="5"/><rect x="14" y="14" width="5" height="5"/>'),
  disto: S('<path d="M3 12h3l2-5 3 10 2-7 2 4 2-3h2"/>'),
  filter: S('<path d="M3 12h4l2-6 3 12 2-8 2 5h5"/>'),
  gain: S('<path d="M4 14V10h3l4-4v12l-4-4z"/><path d="M15 9c1.2 1.2 1.2 4.8 0 6" fill="none" stroke="currentColor"/>', true),
  mute: S('<path d="M4 14V10h3l4-4v12l-4-4z" fill="currentColor" stroke="none"/><path d="M15 9.5l4 5M19 9.5l-4 5"/>'),
  headphones: S('<path d="M5 13v3a2 2 0 002 2h1v-6H7a2 2 0 00-2 2zM19 13v3a2 2 0 01-2 2h-1v-6h1a2 2 0 012 2z"/><path d="M5 13a7 7 0 0114 0"/>'),
  power: S('<path d="M12 4v8"/><path d="M7.5 7a7 7 0 109 0"/>'),
  code: S('<path d="M9 8l-4 4 4 4M15 8l4 4-4 4M13 6l-2 12"/>'),
  up: S('<path d="M6 15l6-6 6 6"/>'),
  down: S('<path d="M6 9l6 6 6-6"/>'),
  dup: S('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'),
  // --- sons (catégories) ---
  kick: S('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>'),
  snare: S('<ellipse cx="12" cy="8.5" rx="8" ry="2.6"/><path d="M4 8.5v5c0 1.5 3.6 2.6 8 2.6s8-1.1 8-2.6v-5"/><path d="M6 16l-1 3M18 16l1 3"/>'),
  hat: S('<path d="M4 10h16M4 13.5h16"/><path d="M12 3v7M12 13.5v7"/>'),
  clap: S('<path d="M8 5l2 6M16 5l-2 6M5.5 9l2 5M18.5 9l-2 5M12 8v12"/>'),
  tom: S('<rect x="6" y="7" width="12" height="10" rx="2"/><path d="M6 7L4 4M18 7l2-3"/>'),
  cymbal: S('<path d="M3 14l9-2.5 9 2.5-9 2.2z"/><path d="M12 11.5V4"/>'),
  perc: S('<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>'),
  cowbell: S('<path d="M8.5 5h7l2 12H6.5z"/><path d="M10 17v2h4v-2"/>'),
  bass: S('<path d="M5 16a3 3 0 106 0 3 3 0 10-6 0"/><path d="M11 16V5l8-2v10"/>'),
  synth: S('<path d="M3 12h3l3-6 3 12 3-9 3 3h3"/>'),
  voice: S('<rect x="9.5" y="4" width="5" height="9" rx="2.5"/><path d="M6.5 11a5.5 5.5 0 0011 0M12 16.5V20M9 20h6"/>'),
  star: S('<path d="M12 3l2.2 6.5H21l-5.4 3.9 2 6.6L12 16l-5.6 4 2-6.6L3 9.5h6.8z"/>', true),
  noise: S('<path d="M3 12h2l1.5-5 2 10 2-7 2 4 1.5-6 2 8 1.5-4H21"/>'),
  chip: S('<rect x="6" y="6" width="12" height="12" rx="2"/><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none"/>'),
  // --- dessin -> son ---
  pencil: S('<path d="M5 19l1.5-.4L18 7a1.8 1.8 0 00-2.6-2.6L4 15.9 3.5 19z"/><path d="M14 6l3 3"/>'),
  wave: S('<path d="M3 12h2l2-6 3 12 3-9 2 5 2-3h4"/>'),
  // --- feelings (émotions) ---
  mood: S('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 14a4 4 0 007 0"/>'),
  happy: S('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 14a4 4 0 007 0"/>'),
  sad: S('<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M8.5 15.5a4 4 0 017-.5"/>'),
  angry: S('<circle cx="12" cy="12" r="9"/><path d="M8 9.5l2.2 1M16 9.5l-2.2 1"/><path d="M9 15.5h6"/>'),
  dream: S('<circle cx="12" cy="12" r="9"/><path d="M8 11a2 2 0 013 0M13 11a2 2 0 013 0"/><path d="M9.5 15h3"/>'),
  energy: S('<path d="M11 2L4 13h5l-1 9 8-12h-5z"/>', true),
  dark: S('<path d="M20.5 14.5A8 8 0 019.5 3.5a8 8 0 1011 11z"/>'),
  chill: S('<circle cx="12" cy="12" r="9"/><path d="M6.5 10.5h4.5M13 10.5h4.5"/><circle cx="8.7" cy="11.4" r="1.6" fill="currentColor" stroke="none"/><circle cx="15.3" cy="11.4" r="1.6" fill="currentColor" stroke="none"/><path d="M9.5 15.5a4 4 0 005 0"/>'),
  love: S('<path d="M12 20s-6.5-4.2-8.6-8.3A4.4 4.4 0 0112 6.5a4.4 4.4 0 018.6 5.2C18.5 15.8 12 20 12 20z"/>', true),
};

export function icon(name) {
  return I[name] || I.chip;
}
