// Neon Vice Cover Studio — shared state: layouts, colour grades, caption
// presets and the undo history. No DOM here, so the cover engine and the
// editor both read the same single source of truth.

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero Grid',
    blurb: 'One big hero shot, three stacked moments, title band below.',
    titleZone: 'bottom',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.78 },
      { x: 0.62, y: 0, w: 0.38, h: 0.26 },
      { x: 0.62, y: 0.26, w: 0.38, h: 0.26 },
      { x: 0.62, y: 0.52, w: 0.38, h: 0.26 },
    ],
  },
  {
    id: 'nine',
    name: 'Comic Nine',
    blurb: 'A nine-panel comic grid with the title punched in the middle.',
    titleZone: 'center',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 0, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 1 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
      { x: 2 / 3, y: 2 / 3, w: 1 / 3, h: 1 / 3 },
    ],
  },
  {
    id: 'tilted',
    name: 'Tilted Snaps',
    blurb: 'Full-bleed backdrop with three tilted snapshot prints on top.',
    titleZone: 'top',
    panels: [
      { x: 0, y: 0, w: 1, h: 1, backdrop: true },
      { x: 0.07, y: 0.3, w: 0.3, h: 0.44, tilt: -4 },
      { x: 0.36, y: 0.36, w: 0.3, h: 0.44, tilt: 2.5 },
      { x: 0.65, y: 0.3, w: 0.3, h: 0.44, tilt: -2 },
    ],
  },
  {
    id: 'bleed',
    name: 'Full Bleed',
    blurb: 'One photo edge to edge, the title stamped across the bottom.',
    titleZone: 'bottom',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: 'duo',
    name: 'Split Duo',
    blurb: 'Two tall halves side by side, one title band across them.',
    titleZone: 'bottom',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.78 },
      { x: 0.5, y: 0, w: 0.5, h: 0.78 },
    ],
  },
  {
    id: 'strips',
    name: 'Story Strips',
    blurb: 'Three vertical strips made for the tall story size.',
    titleZone: 'bottom',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.78 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.78 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.78 },
    ],
  },
];

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    sky: ['#ff9a3d', '#ff5e7a', '#b537f2'],
    title: ['#ffe259', '#ffa751'],
    glow: '#ff5e7a',
    tint: 'rgba(255, 94, 122, 0.16)',
    deep: 'rgba(70, 20, 90, 0.28)',
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    sky: ['#0affef', '#ff2fb3', '#1b0f3b'],
    title: ['#7df9ff', '#ff9de2'],
    glow: '#ff2fb3',
    tint: 'rgba(255, 47, 179, 0.18)',
    deep: 'rgba(10, 8, 40, 0.42)',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    sky: ['#ffd76a', '#ff8c42', '#c94b4b'],
    title: ['#fff3b0', '#ffb347'],
    glow: '#ff8c42',
    tint: 'rgba(255, 170, 60, 0.16)',
    deep: 'rgba(90, 30, 10, 0.26)',
  },
  {
    id: 'miami-teal',
    name: 'Miami Teal',
    sky: ['#7ef0d4', '#2bb3ff', '#0b3d66'],
    title: ['#e8fff9', '#7ef0d4'],
    glow: '#2bb3ff',
    tint: 'rgba(43, 179, 255, 0.16)',
    deep: 'rgba(6, 40, 66, 0.34)',
  },
  {
    id: 'noir',
    name: 'Noir Drive',
    sky: ['#e8e8e8', '#9a9a9a', '#141414'],
    title: ['#ffffff', '#c9c9c9'],
    glow: '#ffffff',
    tint: 'rgba(255, 255, 255, 0.07)',
    deep: 'rgba(0, 0, 0, 0.45)',
  },
];

export const CAPTION_PRESETS = [
  { title: 'VICE CITY', sub: 'welcome back to Leonida' },
  { title: 'NEON SHORE', sub: 'chasing the last light' },
  { title: 'NIGHT SHIFT', sub: 'the city never sleeps' },
  { title: 'PIER PRESSURE', sub: 'salt air, golden hour' },
  { title: 'GOLDEN HOUR', sub: 'every sunset is a premiere' },
  { title: 'LEONIDA NIGHTS', sub: 'drive fast, dream bigger' },
  { title: 'PALM COURT', sub: 'where the neon never fades' },
];

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'story', label: 'Story · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

export const MAX_PANELS = 9;

export function freshPanel(photoIndex) {
  return { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
}

export function defaultState() {
  return {
    layoutId: 'hero',
    gradeId: 'vice-sunset',
    title: 'VICE CITY',
    subtitle: 'welcome back to Leonida',
    titleScale: 1,
    titlePos: 'bottom',
    showSun: true,
    showSkyline: true,
    showPalms: true,
    grain: true,
    vignette: true,
    halftone: true,
    selectedPanel: 0,
    panels: Array.from({ length: MAX_PANELS }, (_, i) => freshPanel(i % 2)),
  };
}

export function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function layoutOf(state) {
  return LAYOUTS.find((l) => l.id === state.layoutId) || LAYOUTS[0];
}

export function gradeOf(state) {
  return GRADES.find((g) => g.id === state.gradeId) || GRADES[0];
}

// Panels the user can actually click and fill: a backdrop panel (the
// tilted layout's full-bleed photo) is not one. The Comic Nine centre
// cell is the title block, so it is simply not in the layout's panels.
export function visiblePanels(layout) {
  return layout.panels.filter((p) => !p.backdrop).length;
}

export function makeHistory(limit = 60) {
  const stack = [];
  let cursor = -1;
  return {
    push(snapshot) {
      stack.length = cursor + 1;
      stack.push(JSON.stringify(snapshot));
      if (stack.length > limit) stack.shift();
      cursor = stack.length - 1;
    },
    undo() {
      if (cursor <= 0) return null;
      cursor -= 1;
      return JSON.parse(stack[cursor]);
    },
    redo() {
      if (cursor >= stack.length - 1) return null;
      cursor += 1;
      return JSON.parse(stack[cursor]);
    },
    canUndo() {
      return cursor > 0;
    },
    canRedo() {
      return cursor < stack.length - 1;
    },
  };
}
