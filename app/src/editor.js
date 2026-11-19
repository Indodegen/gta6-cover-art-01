// Neon Vice Cover Studio — the editor. Wires the DOM to the state and the
// cover engine: photo tray, layout and grade pickers, caption fields, the
// drag-to-pan preview, undo/redo, the surprise button and PNG export.

import { LAYOUTS, GRADES, CAPTION_PRESETS, EXPORT_SIZES, layoutOf, gradeOf, visiblePanels, makeHistory, cloneState } from './state.js';
import { renderCover, panelAt } from './cover-engine.js';

const $ = (id) => document.getElementById(id);

export function buildEditor({ state, photos, onPhotosChange }) {
  const history = makeHistory();
  const preview = $('preview');
  const tray = $('photo-tray');
  const status = $('status-line');
  let drag = null;

  function photoImages() {
    return photos.map((p) => p.img).filter(Boolean);
  }

  function drawPreview() {
    const size = currentPreviewSize();
    renderCover(preview, state, photoImages(), size.w, size.h);
    markSelectedPanel();
  }

  function currentPreviewSize() {
    const ratio = $('size-square').checked ? 1 : $('size-story').checked ? 1080 / 1350 : 1920 / 1080;
    const box = preview.parentElement.getBoundingClientRect();
    const maxW = Math.min(box.width - 4, 640);
    const maxH = Math.min(window.innerHeight - 320, 560);
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    return { w: Math.max(240, Math.round(w)), h: Math.max(240, Math.round(h)) };
  }

  function commit(message) {
    history.push(cloneState(state));
    drawPreview();
    refreshHistoryButtons();
    if (message) flashStatus(message);
  }

  function flashStatus(message) {
    status.textContent = message;
    clearTimeout(flashStatus.timer);
    flashStatus.timer = setTimeout(() => {
      status.textContent = 'Ready — photos stay on your machine.';
    }, 2600);
  }

  function refreshHistoryButtons() {
    $('undo-btn').disabled = !history.canUndo();
    $('redo-btn').disabled = !history.canRedo();
  }

  function markSelectedPanel() {
    const layout = layoutOf(state);
    const chips = tray.querySelectorAll('.tray-photo');
    chips.forEach((chip, i) => chip.classList.toggle('assigned', state.panels[state.selectedPanel]?.photo === i));
    $('panel-label').textContent = `Panel ${state.selectedPanel + 1} of ${visiblePanels(layout)}`;
    const place = state.panels[state.selectedPanel];
    $('zoom-range').value = String(place.zoom);
    $('zoom-value').textContent = `${Math.round(place.zoom * 100)}%`;
  }

  function buildTray() {
    tray.innerHTML = '';
    photos.forEach((photo, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tray-photo';
      btn.title = `Use “${photo.name}” in the selected panel`;
      const img = document.createElement('img');
      img.src = photo.thumb;
      img.alt = photo.name;
      const tag = document.createElement('span');
      tag.textContent = photo.name;
      btn.append(img, tag);
      btn.addEventListener('click', () => {
        state.panels[state.selectedPanel].photo = i;
        commit(`Panel ${state.selectedPanel + 1} now shows ${photo.name}.`);
      });
      tray.appendChild(btn);
    });
    const add = document.createElement('label');
    add.className = 'tray-add';
    add.textContent = '+ Add photos';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.hidden = true;
    input.addEventListener('change', () => loadFiles(input.files));
    add.appendChild(input);
    tray.appendChild(add);
  }

  function loadFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'));
    if (!files.length) {
      flashStatus('That file is not an image — try a JPG or PNG.');
      return;
    }
    let pending = files.length;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          photos.push({ name: file.name.replace(/\.[^.]+$/, '').slice(0, 18), img, thumb: reader.result });
          pending -= 1;
          if (pending === 0) {
            onPhotosChange(photos);
            buildTray();
            commit(`${files.length} photo${files.length > 1 ? 's' : ''} added. Click one to place it.`);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function buildPickers() {
    const layoutBox = $('layout-picker');
    LAYOUTS.forEach((layout) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'picker-card';
      btn.dataset.layout = layout.id;
      btn.innerHTML = `<strong>${layout.name}</strong><span>${layout.blurb}</span>`;
      btn.addEventListener('click', () => {
        state.layoutId = layout.id;
        state.selectedPanel = 0;
        layoutBox.querySelectorAll('.picker-card').forEach((c) => c.classList.toggle('active', c === btn));
        commit(`Layout: ${layout.name}.`);
      });
      layoutBox.appendChild(btn);
    });
    const gradeBox = $('grade-picker');
    GRADES.forEach((grade) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grade-chip';
      btn.dataset.grade = grade.id;
      btn.style.background = `linear-gradient(135deg, ${grade.sky[0]}, ${grade.sky[1]} 55%, ${grade.sky[2]})`;
      btn.innerHTML = `<span>${grade.name}</span>`;
      btn.addEventListener('click', () => {
        state.gradeId = grade.id;
        gradeBox.querySelectorAll('.grade-chip').forEach((c) => c.classList.toggle('active', c === btn));
        commit(`Grade: ${grade.name}.`);
      });
      gradeBox.appendChild(btn);
    });
    layoutBox.querySelector(`[data-layout="${state.layoutId}"]`)?.classList.add('active');
    gradeBox.querySelector(`[data-grade="${state.gradeId}"]`)?.classList.add('active');
  }

  function wireCaption() {
    const titleInput = $('caption-title');
    const subInput = $('caption-sub');
    titleInput.value = state.title;
    subInput.value = state.subtitle;
    titleInput.addEventListener('input', () => {
      state.title = titleInput.value.toUpperCase().slice(0, 24) || 'VICE CITY';
      drawPreview();
    });
    titleInput.addEventListener('change', () => commit('Caption updated.'));
    subInput.addEventListener('input', () => {
      state.subtitle = subInput.value.slice(0, 48);
      drawPreview();
    });
    subInput.addEventListener('change', () => commit('Subtitle updated.'));
    $('title-size').addEventListener('input', (e) => {
      state.titleScale = Number(e.target.value);
      $('title-size-value').textContent = `${Math.round(state.titleScale * 100)}%`;
      drawPreview();
    });
    $('title-pos').addEventListener('change', (e) => {
      state.titlePos = e.target.value;
      commit(`Title moved ${state.titlePos}.`);
    });
    $('preset-select').addEventListener('change', (e) => {
      const preset = CAPTION_PRESETS[Number(e.target.value)];
      if (!preset) return;
      state.title = preset.title;
      state.subtitle = preset.sub;
      titleInput.value = preset.title;
      subInput.value = preset.sub;
      commit(`Caption: “${preset.title}”.`);
    });
  }

  function wireEffects() {
    const toggles = [
      ['fx-sun', 'showSun'],
      ['fx-skyline', 'showSkyline'],
      ['fx-palms', 'showPalms'],
      ['fx-grain', 'grain'],
      ['fx-vignette', 'vignette'],
      ['fx-halftone', 'halftone'],
    ];
    toggles.forEach(([id, key]) => {
      const box = $(id);
      box.checked = state[key];
      box.addEventListener('change', () => {
        state[key] = box.checked;
        commit();
      });
    });
  }

  function wirePanelControls() {
    $('zoom-range').addEventListener('input', (e) => {
      state.panels[state.selectedPanel].zoom = Number(e.target.value);
      $('zoom-value').textContent = `${Math.round(state.panels[state.selectedPanel].zoom * 100)}%`;
      drawPreview();
    });
    $('zoom-range').addEventListener('change', () => commit('Zoom set.'));
    $('fill-all-btn').addEventListener('click', () => {
      const layout = layoutOf(state);
      layout.panels.forEach((p, i) => {
        if (!p.backdrop) state.panels[i].photo = state.panels[state.selectedPanel].photo;
      });
      commit('One photo fills every panel.');
    });
    $('shuffle-photos-btn').addEventListener('click', () => {
      const layout = layoutOf(state);
      layout.panels.forEach((p, i) => {
        if (!p.backdrop) state.panels[i].photo = Math.floor(Math.random() * photos.length);
      });
      commit('Photos shuffled across the panels.');
    });
    $('reset-crop-btn').addEventListener('click', () => {
      const place = state.panels[state.selectedPanel];
      place.zoom = 1;
      place.ox = 0;
      place.oy = 0;
      commit('Crop reset for this panel.');
    });
  }

  function wirePreviewDrag() {
    preview.addEventListener('pointerdown', (e) => {
      const rect = preview.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * preview.width;
      const py = ((e.clientY - rect.top) / rect.height) * preview.height;
      const hit = panelAt(state, px, py, preview.width, preview.height);
      if (hit >= 0) {
        state.selectedPanel = hit;
        drag = { x: e.clientX, y: e.clientY, ox: state.panels[hit].ox, oy: state.panels[hit].oy, moved: false };
        preview.setPointerCapture(e.pointerId);
        drawPreview();
      }
    });
    preview.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const rect = preview.getBoundingClientRect();
      const place = state.panels[state.selectedPanel];
      place.ox = drag.ox + (e.clientX - drag.x) / rect.width;
      place.oy = drag.oy + (e.clientY - drag.y) / rect.height;
      place.ox = Math.max(-0.6, Math.min(0.6, place.ox));
      place.oy = Math.max(-0.6, Math.min(0.6, place.oy));
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      drawPreview();
    });
    preview.addEventListener('pointerup', () => {
      if (drag?.moved) commit('Photo repositioned.');
      drag = null;
    });
    preview.addEventListener('wheel', (e) => {
      e.preventDefault();
      const place = state.panels[state.selectedPanel];
      place.zoom = Math.max(1, Math.min(3, place.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
      drawPreview();
    }, { passive: false });
  }

  function wireActions() {
    $('undo-btn').addEventListener('click', () => {
      const prev = history.undo();
      if (!prev) return;
      Object.assign(state, prev);
      syncInputs();
      drawPreview();
      refreshHistoryButtons();
      flashStatus('Undone.');
    });
    $('redo-btn').addEventListener('click', () => {
      const next = history.redo();
      if (!next) return;
      Object.assign(state, next);
      syncInputs();
      drawPreview();
      refreshHistoryButtons();
      flashStatus('Redone.');
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        $('undo-btn').click();
      } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        $('redo-btn').click();
      }
    });
    $('surprise-btn').addEventListener('click', () => {
      state.layoutId = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)].id;
      state.gradeId = GRADES[Math.floor(Math.random() * GRADES.length)].id;
      const preset = CAPTION_PRESETS[Math.floor(Math.random() * CAPTION_PRESETS.length)];
      state.title = preset.title;
      state.subtitle = preset.sub;
      $('caption-title').value = preset.title;
      $('caption-sub').value = preset.sub;
      document.querySelectorAll('.picker-card').forEach((c) => c.classList.toggle('active', c.dataset.layout === state.layoutId));
      document.querySelectorAll('.grade-chip').forEach((c) => c.classList.toggle('active', c.dataset.grade === state.gradeId));
      commit(`Surprise: ${layoutOf(state).name} + ${gradeOf(state).name}.`);
    });
    $('upload-btn').addEventListener('click', () => $('file-input').click());
    $('file-input').addEventListener('change', (e) => loadFiles(e.target.files));
    $('drop-zone').addEventListener('click', () => $('file-input').click());
    ['dragover', 'dragenter'].forEach((evt) => $('drop-zone').addEventListener(evt, (e) => {
      e.preventDefault();
      $('drop-zone').classList.add('dragging');
    }));
    ['dragleave', 'drop'].forEach((evt) => $('drop-zone').addEventListener(evt, (e) => {
      e.preventDefault();
      $('drop-zone').classList.remove('dragging');
    }));
    $('drop-zone').addEventListener('drop', (e) => loadFiles(e.dataTransfer.files));
    document.querySelectorAll('input[name="preview-size"]').forEach((radio) => {
      radio.addEventListener('change', drawPreview);
    });
  }

  function wireExport() {
    EXPORT_SIZES.forEach((size) => {
      const btn = $(`export-${size.id}`);
      btn.addEventListener('click', () => {
        const off = document.createElement('canvas');
        renderCover(off, state, photoImages(), size.w, size.h);
        off.toBlob((blob) => {
          if (!blob) {
            flashStatus('Export failed — try again.');
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `neon-vice-cover-${size.id}-${size.w}x${size.h}.png`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          flashStatus(`Exported ${size.w} × ${size.h} PNG — check your downloads.`);
        }, 'image/png');
      });
    });
  }

  function syncInputs() {
    $('caption-title').value = state.title;
    $('caption-sub').value = state.subtitle;
    $('title-size').value = String(state.titleScale);
    $('title-size-value').textContent = `${Math.round(state.titleScale * 100)}%`;
    $('title-pos').value = state.titlePos;
    document.querySelectorAll('.picker-card').forEach((c) => c.classList.toggle('active', c.dataset.layout === state.layoutId));
    document.querySelectorAll('.grade-chip').forEach((c) => c.classList.toggle('active', c.dataset.grade === state.gradeId));
    const toggles = [
      ['fx-sun', 'showSun'], ['fx-skyline', 'showSkyline'], ['fx-palms', 'showPalms'],
      ['fx-grain', 'grain'], ['fx-vignette', 'vignette'], ['fx-halftone', 'halftone'],
    ];
    toggles.forEach(([id, key]) => { $(id).checked = state[key]; });
    markSelectedPanel();
  }

  buildTray();
  buildPickers();
  wireCaption();
  wireEffects();
  wirePanelControls();
  wirePreviewDrag();
  wireActions();
  wireExport();
  history.push(cloneState(state));
  refreshHistoryButtons();
  drawPreview();
  window.addEventListener('resize', drawPreview);

  return { drawPreview, commit, syncInputs };
}
