// SPDX-License-Identifier: MIT
// Neon Coast Cover Studio — editor wiring: photos, panels, undo/redo, export.
// All photos stay on this machine: uploads are read with FileReader and are
// never sent anywhere. The app makes no network request at all.

import { LAYOUTS, GRADES, SIZES, defaultState, renderCover, layoutRects } from './cover.js';

const $ = (id) => document.getElementById(id);
const state = defaultState();
const photos = {};
const history = [];
let historyIndex = -1;
let activePanel = 0;
let drag = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  photos.boulevard = await loadImage('samples/boulevard.jpg');
  photos.pier = await loadImage('samples/pier.jpg');
  photos.custom = null;
}

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  history.splice(historyIndex + 1);
  history.push(snapshot());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  updateUndoButtons();
}

function restoreHistory(i) {
  const next = JSON.parse(history[i]);
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, next);
  historyIndex = i;
  syncControls();
  render();
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undoBtn').disabled = historyIndex <= 0;
  $('redoBtn').disabled = historyIndex >= history.length - 1;
}

function render() {
  const canvas = $('preview');
  const size = SIZES[state.size];
  const scale = Math.min(560 / size.w, 560 / size.h, 1);
  canvas.width = Math.round(size.w * scale);
  canvas.height = Math.round(size.h * scale);
  const ctx = canvas.getContext('2d');
  renderCover(ctx, canvas.width, canvas.height, state, photos);
  drawPanelOverlay();
  $('sizeLabel').textContent = `${size.label} — preview ${canvas.width} x ${canvas.height}`;
}

function drawPanelOverlay() {
  const canvas = $('preview');
  const size = SIZES[state.size];
  const sx = canvas.width / size.w, sy = canvas.height / size.h;
  const layout = LAYOUTS[state.layout];
  const rects = layoutRects(layout.kind, size.w, size.h, layout.panels);
  const ctx = canvas.getContext('2d');
  rects.forEach((r, i) => {
    ctx.save();
    ctx.strokeStyle = i === activePanel ? '#ff2d78' : 'rgba(255,255,255,0.65)';
    ctx.lineWidth = i === activePanel ? 4 : 2;
    ctx.setLineDash(i === activePanel ? [] : [6, 4]);
    ctx.strokeRect(r.x * sx + 2, r.y * sy + 2, r.w * sx - 4, r.h * sy - 4);
    ctx.setLineDash([]);
    ctx.fillStyle = i === activePanel ? '#ff2d78' : 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 13px sans-serif';
    const label = `P${i + 1}`;
    const tw = ctx.measureText(label).width + 12;
    ctx.fillRect(r.x * sx + 4, r.y * sy + 4, tw, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, r.x * sx + 10, r.y * sy + 18);
    ctx.restore();
  });
}

function panelAt(clientX, clientY) {
  const canvas = $('preview');
  const box = canvas.getBoundingClientRect();
  const size = SIZES[state.size];
  const x = (clientX - box.left) / box.width * size.w;
  const y = (clientY - box.top) / box.height * size.h;
  const layout = LAYOUTS[state.layout];
  const rects = layoutRects(layout.kind, size.w, size.h, layout.panels);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('layoutSelect').value = state.layout;
  $('gradeSelect').value = state.grade;
  $('sizeSelect').value = state.size;
  $('heatInput').value = state.heat;
  $('heatValue').textContent = `${state.heat} / 5`;
  $('grainCheck').checked = state.grain;
  $('vignetteCheck').checked = state.vignette;
  $('halftoneCheck').checked = state.halftone;
  $('frameCheck').checked = state.frame;
  const p = state.panels[activePanel] || state.panels[0];
  $('zoomInput').value = p.zoom;
  $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panelLabel').textContent = `Panel ${activePanel + 1} — ${p.photo}`;
  document.querySelectorAll('#layoutGrid button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#gradeGrid button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
}

function buildPickers() {
  const lg = $('layoutGrid');
  Object.entries(LAYOUTS).forEach(([key, l]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.textContent = `${l.name} · ${l.panels}`;
    b.addEventListener('click', () => { state.layout = key; activePanel = 0; pushHistory(); syncControls(); render(); });
    lg.appendChild(b);
  });
  const gg = $('gradeGrid');
  Object.entries(GRADES).forEach(([key, g]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.style.background = `linear-gradient(135deg, ${g.top}, ${g.mid} 55%, ${g.low})`;
    b.textContent = g.name;
    b.addEventListener('click', () => { state.grade = key; pushHistory(); syncControls(); render(); });
    gg.appendChild(b);
  });
}

function exportCover(sizeKey, download) {
  const size = SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  renderCover(canvas.getContext('2d'), size.w, size.h, state, photos);
  if (download) {
    const a = document.createElement('a');
    a.download = `neon-coast-cover-${sizeKey}-${size.w}x${size.h}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  }
  return canvas;
}

function exportAll() {
  Object.keys(SIZES).forEach((k, i) => setTimeout(() => exportCover(k, true), i * 350));
  $('exportStatus').textContent = 'Exported all 3 sizes as PNG — check your downloads.';
}

function randomize() {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.panels.forEach((p) => { p.zoom = 1 + Math.random() * 0.5; p.ox = (Math.random() - 0.5) * 0.6; p.oy = (Math.random() - 0.5) * 0.6; });
  activePanel = 0;
  pushHistory();
  syncControls();
  render();
}

function bindEvents() {
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; render(); });
  $('badgeInput').addEventListener('change', pushHistory);
  $('layoutSelect').addEventListener('change', (e) => { state.layout = e.target.value; activePanel = 0; pushHistory(); syncControls(); render(); });
  $('gradeSelect').addEventListener('change', (e) => { state.grade = e.target.value; pushHistory(); syncControls(); render(); });
  $('sizeSelect').addEventListener('change', (e) => { state.size = e.target.value; render(); });
  $('heatInput').addEventListener('input', (e) => { state.heat = Number(e.target.value); $('heatValue').textContent = `${state.heat} / 5`; render(); });
  $('heatInput').addEventListener('change', pushHistory);
  $('grainCheck').addEventListener('change', (e) => { state.grain = e.target.checked; pushHistory(); render(); });
  $('vignetteCheck').addEventListener('change', (e) => { state.vignette = e.target.checked; pushHistory(); render(); });
  $('halftoneCheck').addEventListener('change', (e) => { state.halftone = e.target.checked; pushHistory(); render(); });
  $('frameCheck').addEventListener('change', (e) => { state.frame = e.target.checked; pushHistory(); render(); });
  $('zoomInput').addEventListener('input', (e) => {
    const p = state.panels[activePanel];
    p.zoom = Number(e.target.value);
    $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
    render();
  });
  $('zoomInput').addEventListener('change', pushHistory);
  $('photoSelect').addEventListener('change', (e) => {
    state.panels[activePanel].photo = e.target.value;
    pushHistory();
    syncControls();
    render();
  });
  $('undoBtn').addEventListener('click', () => { if (historyIndex > 0) restoreHistory(historyIndex - 1); });
  $('redoBtn').addEventListener('click', () => { if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1); });
  $('randomBtn').addEventListener('click', randomize);
  $('exportBtn').addEventListener('click', () => { exportCover(state.size, true); $('exportStatus').textContent = `Exported ${SIZES[state.size].label} as PNG.`; });
  $('exportAllBtn').addEventListener('click', exportAll);
  $('uploadInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const f of files) {
      const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
      photos.custom = await loadImage(dataUrl);
      const opt = document.createElement('option');
      opt.value = 'custom';
      opt.textContent = `Your photo — ${f.name}`;
      const sel = $('photoSelect');
      if (![...sel.options].some((o) => o.value === 'custom')) sel.appendChild(opt);
      state.panels[activePanel].photo = 'custom';
    }
    pushHistory();
    syncControls();
    render();
  });
  const canvas = $('preview');
  canvas.addEventListener('pointerdown', (e) => {
    const i = panelAt(e.clientX, e.clientY);
    if (i >= 0) {
      activePanel = i;
      drag = { x: e.clientX, y: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
      canvas.setPointerCapture(e.pointerId);
      syncControls();
      render();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = state.panels[activePanel];
    p.ox = drag.ox + (e.clientX - drag.x) / 120;
    p.oy = drag.oy + (e.clientY - drag.y) / 120;
    p.ox = Math.max(-1, Math.min(1, p.ox));
    p.oy = Math.max(-1, Math.min(1, p.oy));
    render();
  });
  canvas.addEventListener('pointerup', () => { if (drag) { drag = null; pushHistory(); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[activePanel];
    p.zoom = Math.max(0.6, Math.min(3, p.zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
    $('zoomInput').value = p.zoom;
    $('zoomValue').textContent = `${Math.round(p.zoom * 100)}%`;
    render();
  }, { passive: false });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); if (historyIndex > 0) restoreHistory(historyIndex - 1); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); exportCover(state.size, true); }
  });
}

window.NeonCoast = { state, photos, renderCover, exportCover, SIZES, render, syncControls };

async function init() {
  buildPickers();
  bindEvents();
  await loadSamples();
  pushHistory();
  syncControls();
  render();
  if (window.NeonCoastShots) window.NeonCoastShots.ready();
}

init().catch((err) => {
  const el = $('exportStatus');
  if (el) el.textContent = `Could not load the sample photos: ${err.message}`;
});
