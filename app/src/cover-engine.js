// Neon Vice Cover Studio — the cover engine. Everything the app exports is
// drawn here on a plain 2D canvas: panel photos, the sunset/neon grade, the
// sun, skyline and palm silhouettes, the halftone title block and the grain.
// All artwork is drawn from code; no Rockstar art, logo or font is used.

import { layoutOf, gradeOf } from './state.js';

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function coverFit(img, rect) {
  const scale = Math.max(rect.w / img.width, rect.h / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  return { w, h, x: rect.x + (rect.w - w) / 2, y: rect.y + (rect.h - h) / 2 };
}

function drawPhoto(ctx, img, rect, place) {
  const fit = coverFit(img, rect);
  const zoom = place.zoom || 1;
  const dw = fit.w * zoom;
  const dh = fit.h * zoom;
  const dx = fit.x + (fit.w - dw) / 2 + (place.ox || 0) * rect.w;
  const dy = fit.y + (fit.h - dh) / 2 + (place.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawSun(ctx, grade, w, h, zone) {
  const cx = w * 0.5;
  const cy = zone === 'top' ? h * 0.13 : h * 0.62;
  const r = Math.min(w, h) * 0.16;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
  glow.addColorStop(0, grade.sky[0] + 'cc');
  glow.addColorStop(0.5, grade.sky[1] + '44');
  glow.addColorStop(1, grade.sky[1] + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  // Paint the slitted disc on its own canvas first: cutting the slits with
  // destination-out on the main canvas would punch holes through the
  // photos underneath.
  const disc = document.createElement('canvas');
  disc.width = Math.ceil(r * 2 + 4);
  disc.height = Math.ceil(r * 2 + 4);
  const dctx = disc.getContext('2d');
  const fill = dctx.createLinearGradient(0, 0, 0, disc.height);
  fill.addColorStop(0, '#fff7c0');
  fill.addColorStop(0.45, grade.sky[0]);
  fill.addColorStop(1, grade.sky[1]);
  dctx.fillStyle = fill;
  dctx.beginPath();
  dctx.arc(r + 2, r + 2, r, 0, Math.PI * 2);
  dctx.fill();
  dctx.globalCompositeOperation = 'destination-out';
  const gap = r * 0.16;
  for (let i = 0; i < 3; i++) {
    const y = r + 2 + r * 0.1 + i * gap * 1.7;
    dctx.fillRect(0, y, disc.width, gap * (0.55 + i * 0.22));
  }
  ctx.drawImage(disc, cx - r - 2, cy - r - 2);
}

function drawSkyline(ctx, w, h, baseY, colour) {
  const rnd = mulberry(20261119);
  ctx.fillStyle = colour;
  let x = 0;
  while (x < w) {
    const bw = w * (0.04 + rnd() * 0.07);
    const bh = h * (0.04 + rnd() * 0.11);
    ctx.fillRect(x, baseY - bh, bw, bh + 2);
    if (rnd() > 0.45) {
      ctx.fillRect(x + bw * 0.28, baseY - bh - h * 0.035, bw * 0.2, h * 0.035);
    }
    x += bw + w * 0.008;
  }
  ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
  const winRnd = mulberry(77);
  for (let i = 0; i < 46; i++) {
    const wx = winRnd() * w;
    const wy = baseY - h * 0.02 - winRnd() * h * 0.12;
    ctx.fillRect(wx, wy, Math.max(2, w * 0.004), Math.max(2, h * 0.006));
  }
}

function drawPalm(ctx, x, baseY, s, lean, colour) {
  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -70, 26, -128);
  ctx.stroke();
  ctx.translate(26, -128);
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI * 0.92 + i * (Math.PI * 0.27);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      Math.cos(ang) * 52,
      Math.sin(ang) * 52 - 18,
      Math.cos(ang) * 88,
      Math.sin(ang) * 88 + 26,
    );
    ctx.lineWidth = 6;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(-4, 4, 7, 0, Math.PI * 2);
  ctx.arc(6, 8, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBirds(ctx, w, h, zone) {
  const y0 = zone === 'top' ? h * 0.1 : h * 0.08;
  ctx.strokeStyle = 'rgba(20, 8, 30, 0.75)';
  ctx.lineWidth = Math.max(2, w * 0.0022);
  ctx.lineCap = 'round';
  const spots = [
    [0.16, 0.02, 1],
    [0.3, -0.02, 0.8],
    [0.78, 0.03, 1.1],
    [0.86, -0.01, 0.7],
  ];
  for (const [fx, fy, s] of spots) {
    const x = w * fx;
    const y = y0 + h * fy;
    const r = w * 0.014 * s;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x - r * 0.4, y - r * 0.9, x, y);
    ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.9, x + r, y);
    ctx.stroke();
  }
}

function drawHalftone(ctx, x, y, w, h, colour) {
  const step = Math.max(9, w * 0.012);
  ctx.fillStyle = colour;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const t = 1 - (yy - y) / h;
      const r = Math.max(0.4, step * 0.26 * t);
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawGrain(ctx, w, h, seed) {
  const rnd = mulberry(seed);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const n = Math.floor((w * h) / 9000);
  for (let i = 0; i < n; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.4, 1.4);
  }
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  for (let i = 0; i < n; i++) {
    ctx.fillRect(rnd() * w, rnd() * h, 1.4, 1.4);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8, 4, 20, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function frameRect(layout, w, h) {
  const gap = Math.round(Math.min(w, h) * 0.012);
  return layout.panels.map((p) => ({
    x: Math.round(p.x * w) + (p.x > 0 ? gap / 2 : 0),
    y: Math.round(p.y * h) + (p.y > 0 ? gap / 2 : 0),
    w: Math.round(p.w * w) - (p.x > 0 ? gap / 2 : 0) - (p.x + p.w < 1 ? gap / 2 : 0),
    h: Math.round(p.h * h) - (p.y > 0 ? gap / 2 : 0) - (p.y + p.h < 1 ? gap / 2 : 0),
    tilt: p.tilt || 0,
    backdrop: !!p.backdrop,
  }));
}

function titleBandRect(layout, w, h, pos) {
  if (layout.titleZone === 'center') {
    return {
      x: Math.round(w / 3), y: Math.round(h / 3),
      w: Math.round(w / 3), h: Math.round(h / 3),
    };
  }
  const bandH = Math.round(h * (layout.id === 'bleed' ? 0.3 : 0.22));
  if (pos === 'top' || layout.titleZone === 'top') {
    return { x: 0, y: 0, w, h: bandH };
  }
  return { x: 0, y: h - bandH, w, h: bandH };
}

function fitTitleFont(ctx, text, maxW, startPx, family) {
  let px = startPx;
  ctx.font = `${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxW) {
    px = Math.floor(px * 0.94);
    ctx.font = `${px}px ${family}`;
  }
  return px;
}

function drawTitleBlock(ctx, state, grade, band, w, h) {
  const pad = Math.round(Math.min(w, h) * 0.035);
  const cx = band.x + band.w / 2;
  const isCenter = band.w < w * 0.5;
  const top = band.y + pad * 0.7;

  if (state.halftone && !isCenter) {
    drawHalftone(
      ctx, band.x + pad, band.y + band.h - pad * 1.15,
      band.w * 0.3, pad * 0.85, 'rgba(255,255,255,0.28)',
    );
  }

  const titleFamily = '"ViceTitle", "Arial Narrow", sans-serif';
  const subFamily = '"ViceSub", "Arial Narrow", sans-serif';
  const maxTitleW = band.w - pad * 2;
  const basePx = Math.round(Math.min(w, h) * 0.115 * state.titleScale);
  const titlePx = fitTitleFont(ctx, state.title.toUpperCase(), maxTitleW, basePx, titleFamily);
  const titleY = top + titlePx * 0.92;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const grad = ctx.createLinearGradient(cx - maxTitleW / 2, titleY - titlePx, cx + maxTitleW / 2, titleY);
  grad.addColorStop(0, grade.title[0]);
  grad.addColorStop(0.55, grade.title[1]);
  grad.addColorStop(1, grade.title[0]);
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = Math.round(Math.min(w, h) * 0.02);
  ctx.shadowOffsetY = Math.round(titlePx * 0.06);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(24, 6, 32, 0.9)';
  ctx.lineWidth = Math.max(2, titlePx * 0.07);
  ctx.font = `${titlePx}px ${titleFamily}`;
  ctx.strokeText(state.title.toUpperCase(), cx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(state.title.toUpperCase(), cx, titleY);
  ctx.restore();

  if (state.subtitle) {
    const subPx = Math.round(titlePx * 0.32);
    const subY = titleY + subPx * 1.5;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `italic ${subPx}px ${subFamily}`;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = Math.round(subPx * 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.subtitle, cx, subY);
    ctx.restore();
  }
}

function gradeWash(ctx, grade, w, h) {
  const sky = ctx.createLinearGradient(0, 0, w * 0.25, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.55;
  const deep = ctx.createLinearGradient(0, h * 0.55, 0, h);
  deep.addColorStop(0, 'rgba(0,0,0,0)');
  deep.addColorStop(1, grade.deep);
  ctx.fillStyle = deep;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function renderCover(canvas, state, images, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const layout = layoutOf(state);
  const grade = gradeOf(state);

  ctx.fillStyle = '#12081f';
  ctx.fillRect(0, 0, W, H);

  const rects = frameRect(layout, W, H);
  const band = titleBandRect(layout, W, H, state.titlePos);

  const backdropIdx = rects.findIndex((r) => r.backdrop);
  if (backdropIdx >= 0) {
    const place = state.panels[backdropIdx];
    const img = images[place.photo];
    if (img) drawPhoto(ctx, img, rects[backdropIdx], place);
  }

  if (state.showSun && layout.id !== 'nine') drawSun(ctx, grade, W, H, layout.titleZone);
  if (state.showSkyline && layout.id !== 'nine') {
    drawSkyline(ctx, W, H, H * 0.8, 'rgba(16, 6, 28, 0.85)');
  }
  drawBirds(ctx, W, H, layout.titleZone);

  const gap = Math.round(Math.min(W, H) * 0.012);
  rects.forEach((rect, i) => {
    if (rect.backdrop) return;
    const place = state.panels[i];
    const img = images[place.photo];
    ctx.save();
    if (rect.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((rect.tilt * Math.PI) / 180);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.03);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.012);
      ctx.fillStyle = '#fdf6ec';
      ctx.fillRect(-gap, -gap, rect.w + gap * 2, rect.h + gap * 2.4);
      ctx.shadowColor = 'transparent';
      if (img) drawPhoto(ctx, img, { x: 0, y: 0, w: rect.w, h: rect.h }, place);
      ctx.restore();
    } else {
      ctx.fillStyle = '#1a0b28';
      ctx.fillRect(rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2);
      if (img) drawPhoto(ctx, img, rect, place);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.004);
      ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
      ctx.restore();
    }
  });

  if (layout.id === 'tilted' && state.showPalms) {
    drawPalm(ctx, W * 0.03, H * 0.99, Math.min(W, H) * 0.0016, 0.1, 'rgba(12,4,22,0.9)');
    drawPalm(ctx, W * 0.97, H * 0.99, Math.min(W, H) * 0.0013, -0.12, 'rgba(12,4,22,0.9)');
  }

  gradeWash(ctx, grade, W, H);

  if (layout.titleZone === 'center') {
    ctx.fillStyle = 'rgba(14, 5, 26, 0.92)';
    ctx.fillRect(band.x, band.y, band.w, band.h);
    const edge = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y + band.h);
    edge.addColorStop(0, grade.sky[0]);
    edge.addColorStop(1, grade.sky[1]);
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.006);
    ctx.strokeRect(band.x + 2, band.y + 2, band.w - 4, band.h - 4);
  } else if (layout.id !== 'bleed') {
    const shade = ctx.createLinearGradient(0, band.y, 0, band.y + band.h);
    shade.addColorStop(0, 'rgba(10, 3, 20, 0)');
    shade.addColorStop(1, 'rgba(10, 3, 20, 0.88)');
    ctx.fillStyle = shade;
    ctx.fillRect(band.x, band.y, band.w, band.h);
  } else {
    const shade = ctx.createLinearGradient(0, band.y - band.h * 0.4, 0, band.y + band.h);
    shade.addColorStop(0, 'rgba(10, 3, 20, 0)');
    shade.addColorStop(1, 'rgba(10, 3, 20, 0.9)');
    ctx.fillStyle = shade;
    ctx.fillRect(band.x, band.y - band.h * 0.4, band.w, band.h * 1.4);
  }

  drawTitleBlock(ctx, state, grade, band, W, H);

  if (state.showPalms && layout.id !== 'tilted' && layout.id !== 'nine') {
    drawPalm(ctx, W * 0.015, H * 0.985, Math.min(W, H) * 0.0011, 0.08, 'rgba(10,3,18,0.85)');
  }
  if (state.grain) drawGrain(ctx, W, H, 987654);
  if (state.vignette) drawVignette(ctx, W, H);
}

export function panelAt(state, px, py, W, H) {
  const layout = layoutOf(state);
  const rects = frameRect(layout, W, H);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (r.backdrop) continue;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
