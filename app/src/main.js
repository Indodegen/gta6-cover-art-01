// Neon Vice Cover Studio — bootstrap. Loads the two free sample photos that
// ship with the app, creates the default state and hands the editor over.
// Photos the user adds never leave their machine: everything is read with
// FileReader and drawn on canvas locally.

import { defaultState } from './state.js';
import { buildEditor } from './editor.js';

const SAMPLES = [
  { name: 'Boulevard', src: 'samples/boulevard.jpg' },
  { name: 'Pier', src: 'samples/pier.jpg' },
];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function boot() {
  const photos = [];
  for (const sample of SAMPLES) {
    const img = await loadImage(sample.src);
    if (img) photos.push({ name: sample.name, img, thumb: sample.src });
  }
  // Wait for the local fonts before the first preview, so the first paint
  // already uses the real condensed title lettering, not a fallback.
  try {
    await Promise.all([
      document.fonts.load('900 100px "ViceTitle"'),
      document.fonts.load('italic 700 40px "ViceSub"'),
      document.fonts.load('700 16px "ViceUI"'),
    ]);
  } catch {
    // A font that fails to load falls back to the system sans in the app;
    // the cover still renders.
  }
  const state = defaultState();
  const editor = buildEditor({
    state,
    photos,
    onPhotosChange(next) {
      photos.length = 0;
      photos.push(...next);
    },
  });
  document.getElementById('year').textContent = String(new Date().getFullYear());
  window.__neonVice = { state, photos, redraw: editor.drawPreview };
}

document.addEventListener('DOMContentLoaded', boot);
