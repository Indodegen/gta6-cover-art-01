// SPDX-License-Identifier: MIT
// Neon Coast Cover Studio — screenshot scenes for the bounty dossier.
// ?shot=cover  draws the best cover full-frame (the dossier's first shot).
// ?shot=editor draws the editor with a photo loaded.
// ?shot=wide   draws the wide 1920 x 1080 cover full-frame.
// ?shot=portrait draws the portrait 1080 x 1350 cover full-frame.
// The scene is drawn by the app itself, never edited or composited elsewhere.

import { renderCover, SIZES } from './cover.js';

function params() {
  return new URLSearchParams(location.search);
}

async function waitForApp() {
  for (let i = 0; i < 100; i++) {
    if (window.NeonCoast && window.NeonCoast.photos && window.NeonCoast.photos.boulevard) return window.NeonCoast;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('app did not load its sample photos');
}

function drawFullCover(app, sizeKey) {
  const size = SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.id = 'shotCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:contain;background:#0b0626;';
  renderCover(canvas.getContext('2d'), size.w, size.h, app.state, app.photos);
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.style.background = '#0b0626';
  document.body.appendChild(canvas);
  document.title = `Neon Coast — ${size.label}`;
}

async function runShotScene() {
  const shot = params().get('shot');
  if (!shot) return;
  const app = await waitForApp();
  if (shot === 'cover') drawFullCover(app, 'wide');
  else if (shot === 'wide') drawFullCover(app, 'wide');
  else if (shot === 'portrait') drawFullCover(app, 'portrait');
  else if (shot === 'square') drawFullCover(app, 'square');
  else if (shot === 'editor') {
    app.state.layout = 'heroThree';
    app.state.grade = 'neonNight';
    app.state.title = 'NEON COAST';
    app.syncControls();
    app.render();
    document.title = 'Neon Coast — editor';
  }
  window.NeonCoastShots = { done: true };
}

window.NeonCoastShots = {
  ready() { runShotScene().catch((e) => { document.title = `shot failed: ${e.message}`; }); },
};
