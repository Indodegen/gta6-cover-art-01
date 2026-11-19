// SPDX-License-Identifier: MIT
// Neon Coast Cover Studio — cover render engine.
// Draws a multi-panel GTA-poster-style cover on any 2D canvas, fully offline.
// No Rockstar logo, artwork or font is used anywhere: all lettering is drawn
// with system fonts and every panel photo comes from the user's own files.

export const LAYOUTS = {
  viceGrid: { name: 'Vice Grid', panels: 9, kind: 'grid' },
  heroThree: { name: 'Hero + Three', panels: 4, kind: 'hero' },
  tilted: { name: 'Tilted Snapshots', panels: 4, kind: 'tilted' },
  fullBleed: { name: 'Full Bleed', panels: 1, kind: 'full' },
  duoSplit: { name: 'Duo Split', panels: 2, kind: 'duo' },
  triptych: { name: 'Triptych', panels: 3, kind: 'tri' },
};

export const GRADES = {
  viceSunset: { name: 'Vice Sunset', top: '#ff7a18', mid: '#ff2d78', low: '#2b1055', tint: 'rgba(255,110,40,0.20)' },
  neonNight: { name: 'Neon Night', top: '#00e5ff', mid: '#ff2d95', low: '#0b0626', tint: 'rgba(0,229,255,0.16)' },
  palmGold: { name: 'Palm Gold', top: '#ffd166', mid: '#ef8354', low: '#3d2b1f', tint: 'rgba(255,190,80,0.18)' },
  tealNoir: { name: 'Teal Noir', top: '#7ef0d4', mid: '#1f7a6d', low: '#06121a', tint: 'rgba(40,200,180,0.16)' },
  bubblegum: { name: 'Bubblegum', top: '#ff9ecf', mid: '#c44dff', low: '#2a0a3d', tint: 'rgba(255,120,200,0.18)' },
  monoNoir: { name: 'Mono Noir', top: '#ffffff', mid: '#9aa0a6', low: '#000000', tint: 'rgba(255,255,255,0.10)' },
};

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export function defaultState() {
  return {
    layout: 'viceGrid',
    grade: 'viceSunset',
    size: 'square',
    title: 'NEON COAST',
    subtitle: 'welcome to paradise',
    badge: 'VICE CITY • 2026',
    heat: 4,
    grain: true,
    vignette: true,
    halftone: true,
    frame: true,
    panels: Array.from({ length: 9 }, (_, i) => ({
      photo: i % 2 === 0 ? 'boulevard' : 'pier',
      zoom: 1.15,
      ox: 0,
      oy: 0,
    })),
  };
}

export function layoutRects(kind, W, H, count) {
  const g = Math.max(6, Math.round(W * 0.008));
  const rects = [];
  if (kind === 'grid') {
    const cw = (W - g * 4) / 3, ch = (H - g * 4) / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      rects.push({ x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch });
  } else if (kind === 'hero') {
    const hw = W * 0.62, hh = H * 0.62;
    rects.push({ x: g, y: g, w: hw - g, h: hh - g });
    const sw = W - hw - g, sh = (hh - g * 2) / 3;
    for (let i = 0; i < 3; i++) rects.push({ x: hw + g, y: g + i * (sh + g), w: sw - g, h: sh });
    rects.push({ x: g, y: hh + g, w: W - g * 2, h: H - hh - g * 2 });
    return rects.slice(0, 4).map((r, i) => (i === 3 ? { x: g, y: hh + g, w: W - g * 2, h: H - hh - g * 2 } : r));
  } else if (kind === 'tilted') {
    const cw = W * 0.46, ch = H * 0.42;
    rects.push({ x: W * 0.05, y: H * 0.04, w: cw, h: ch, rot: -0.05 });
    rects.push({ x: W * 0.49, y: H * 0.06, w: cw, h: ch, rot: 0.04 });
    rects.push({ x: W * 0.05, y: H * 0.52, w: cw, h: ch, rot: 0.04 });
    rects.push({ x: W * 0.49, y: H * 0.50, w: cw, h: ch, rot: -0.05 });
  } else if (kind === 'full') {
    rects.push({ x: 0, y: 0, w: W, h: H });
  } else if (kind === 'duo') {
    rects.push({ x: g, y: g, w: (W - g * 3) / 2, h: H - g * 2 });
    rects.push({ x: g * 2 + (W - g * 3) / 2, y: g, w: (W - g * 3) / 2, h: H - g * 2 });
  } else {
    const cw = (W - g * 4) / 3;
    for (let i = 0; i < 3; i++) rects.push({ x: g + i * (cw + g), y: g, w: cw, h: H - g * 2 });
  }
  return rects.slice(0, count);
}

export function drawCoverPhoto(ctx, img, rect, panel) {
  if (!img) return;
  const z = panel.zoom || 1;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * z;
  const dw = iw * scale, dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w * 0.2;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h * 0.2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

export function applyGradeOverlay(ctx, W, H, grade, strength) {
  const s = strength == null ? 1 : strength;
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, grade.top);
  g.addColorStop(0.55, grade.mid);
  g.addColorStop(1, grade.low);
  ctx.save();
  ctx.globalAlpha = 0.15 * s;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function drawSunRays(ctx, W, H, grade) {
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.translate(W * 0.5, H * 0.18);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, grade.top);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-W * 0.02, H);
    ctx.lineTo(W * 0.02, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function drawGrain(ctx, W, H, seed) {
  let s = seed || 12345;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  ctx.save();
  ctx.globalAlpha = 0.045;
  const step = Math.max(3, Math.round(W / 360));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const v = rnd() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, step, step);
    }
  }
  ctx.restore();
}

export function drawVignette(ctx, W, H) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function drawHalftoneDots(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(7, Math.round(w / 46));
  for (let yy = y; yy < y + h; yy += step) {
    for (let xx = x; xx < x + w; xx += step) {
      const r = step * 0.16 * (1 + ((xx + yy) % (step * 3)) / (step * 3));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function fitTitleFont(ctx, text, maxW, startPx, family) {
  let px = startPx;
  ctx.font = `900 ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px -= 4;
    ctx.font = `900 ${px}px ${family}`;
  }
  return px;
}

export function drawTitleBlock(ctx, W, H, state, grade) {
  const family = `'Arial Black', 'Archivo Black', Impact, sans-serif`;
  const bandH = H * 0.20;
  const bandY = H - bandH - H * 0.015;
  const pad = W * 0.045;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fillRect(pad * 0.55, bandY, W - pad * 1.1, bandH);
  ctx.strokeStyle = grade.mid;
  ctx.lineWidth = Math.max(4, W * 0.006);
  ctx.strokeRect(pad * 0.55, bandY, W - pad * 1.1, bandH);
  if (state.halftone) drawHalftoneDots(ctx, pad, bandY + bandH * 0.06, W * 0.10, bandH * 0.5, grade.mid);
  const title = (state.title || 'NEON COAST').toUpperCase();
  const px = fitTitleFont(ctx, title, W - pad * 3.4, bandH * 0.52, family);
  ctx.font = `900 ${px}px ${family}`;
  ctx.textBaseline = 'middle';
  const tx = pad * 1.9, ty = bandY + bandH * 0.42;
  ctx.lineWidth = Math.max(3, px * 0.09);
  ctx.strokeStyle = '#111';
  ctx.strokeText(title, tx, ty);
  const grad = ctx.createLinearGradient(tx, ty - px / 2, tx, ty + px / 2);
  grad.addColorStop(0, grade.top);
  grad.addColorStop(0.55, grade.mid);
  grad.addColorStop(1, grade.low);
  ctx.fillStyle = grad;
  ctx.fillText(title, tx, ty);
  ctx.font = `italic 700 ${Math.round(bandH * 0.20)}px Georgia, 'Times New Roman', serif`;
  ctx.fillStyle = '#222';
  ctx.fillText(state.subtitle || '', tx, bandY + bandH * 0.84);
  const badge = state.badge || '';
  if (badge) {
    ctx.font = `800 ${Math.round(bandH * 0.17)}px ${family}`;
    const bw = ctx.measureText(badge).width + bandH * 0.34;
    const bx = W - pad * 1.15 - bw, by = bandY - bandH * 0.30;
    ctx.fillStyle = grade.low;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + bw, by);
    ctx.lineTo(bx + bw - bandH * 0.16, by + bandH * 0.30);
    ctx.lineTo(bx + bandH * 0.16, by + bandH * 0.30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(badge, bx + bw / 2, by + bandH * 0.155);
    ctx.textAlign = 'left';
  }
  const stars = '★'.repeat(Math.max(0, Math.min(5, state.heat || 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, state.heat || 0)));
  ctx.font = `${Math.round(bandH * 0.22)}px sans-serif`;
  ctx.fillStyle = grade.mid;
  ctx.fillText(stars, W - pad * 1.15 - ctx.measureText(stars).width, bandY + bandH * 0.84);
  ctx.restore();
}

export function renderCover(ctx, W, H, state, photos) {
  const layout = LAYOUTS[state.layout] || LAYOUTS.viceGrid;
  const grade = GRADES[state.grade] || GRADES.viceSunset;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0b0626';
  ctx.fillRect(0, 0, W, H);
  const rects = layoutRects(layout.kind, W, H, layout.panels);
  drawSunRays(ctx, W, H, grade);
  rects.forEach((r, i) => {
    const panel = state.panels[i] || state.panels[0];
    const img = photos[panel.photo];
    ctx.save();
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(r.rot);
      ctx.translate(-r.w / 2, -r.h / 2);
      drawCoverPhoto(ctx, img, { x: 0, y: 0, w: r.w, h: r.h }, panel);
      ctx.restore();
    } else {
      drawCoverPhoto(ctx, img, r, panel);
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = state.frame === false ? 'rgba(255,255,255,0)' : '#fff';
    ctx.lineWidth = Math.max(3, W * 0.006);
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(r.rot);
      ctx.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
    } else {
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  });
  // One grade pass over the whole cover only: a per-panel pass washed the
  // photos out to a flat orange. Full-bleed gets a stronger single pass.
  applyGradeOverlay(ctx, W, H, grade, layout.kind === 'full' ? 0.8 : 0.6);
  if (state.vignette) drawVignette(ctx, W, H);
  drawTitleBlock(ctx, W, H, state, grade);
  if (state.grain) drawGrain(ctx, W, H, 20261119);
}
