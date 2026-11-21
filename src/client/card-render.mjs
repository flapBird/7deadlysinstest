// Card rendering — shared by the module worker (default, off main thread) and a
// main-thread fallback. Uses OffscreenCanvas when available; local system fonts only.
import { SIN_ORDER, MAX_SCORE } from '../quiz/questions.mjs';
import { scorePercent } from '../quiz/scoring.mjs';
import { SITE } from '../site/config.mjs';
import { CONTENT as t } from './content.mjs';
import { SIN_COLORS } from './sin-theme.mjs';

const BG = '#0f0c15';
const TEXT = '#f5f1e8';
const MUTED = '#a89fb6';
const FAINT = 'rgba(245, 241, 232, 0.62)';

function createSurface(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const FONT_BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_DISPLAY = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';

function setSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
}

function rr(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBand(ctx, width, height) {
  const seg = width / SIN_ORDER.length;
  SIN_ORDER.forEach((sin, i) => {
    ctx.fillStyle = SIN_COLORS[sin].bar;
    ctx.fillRect(i * seg, 0, Math.ceil(seg), height);
  });
}

function drawDominantTitle(ctx, top, centerX, baselineY, singleSize, dualSize) {
  if (!top.dual) {
    ctx.fillStyle = SIN_COLORS[top.first.sin].bar;
    ctx.font = '700 ' + singleSize + 'px ' + FONT_DISPLAY;
    ctx.textAlign = 'center';
    ctx.fillText(t.sins[top.first.sin].name, centerX, baselineY);
    return;
  }
  const parts = [
    { text: t.sins[top.first.sin].name, color: SIN_COLORS[top.first.sin].bar },
    { text: ' + ', color: FAINT },
    { text: t.sins[top.second.sin].name, color: SIN_COLORS[top.second.sin].bar },
  ];
  ctx.font = '700 ' + dualSize + 'px ' + FONT_DISPLAY;
  const widths = parts.map((p) => ctx.measureText(p.text).width);
  const total = widths.reduce((a, b) => a + b, 0);
  let x = centerX - total / 2;
  ctx.textAlign = 'left';
  parts.forEach((p, i) => {
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, x, baselineY);
    x += widths[i];
  });
}

// rows: [{sin, name, score, percent, dominant}] in fixed display order.
function drawRowsPortrait(ctx, rows, areaTop, areaBottom) {
  const left = 72;
  const right = 1008;
  const barLeft = left;
  const barRight = 820;
  const rowH = (areaBottom - areaTop) / rows.length;

  rows.forEach((row, i) => {
    const centerY = areaTop + rowH * i + rowH / 2;
    const color = SIN_COLORS[row.sin].bar;

    ctx.textAlign = 'left';
    ctx.fillStyle = TEXT;
    ctx.font = '600 34px ' + FONT_BODY;
    setSpacing(ctx, 1);
    ctx.fillText(row.name, left, centerY - 8);
    setSpacing(ctx, 0);

    if (row.dominant) {
      const nameW = ctx.measureText(row.name).width;
      ctx.fillStyle = color;
      ctx.font = '700 17px ' + FONT_BODY;
      setSpacing(ctx, 3);
      ctx.fillText(t.share.dominantTag, left + nameW + 18, centerY - 8);
      setSpacing(ctx, 0);
    }

    // bar
    const barY = centerY + 12;
    const barW = barRight - barLeft;
    rr(ctx, barLeft, barY, barW, 12, 6);
    ctx.fillStyle = 'rgba(245, 241, 232, 0.10)';
    ctx.fill();
    if (row.score > 0) {
      rr(ctx, barLeft, barY, Math.max(12, barW * (row.score / MAX_SCORE)), 12, 6);
      ctx.fillStyle = color;
      ctx.fill();
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cfc8dd';
    ctx.font = '500 30px ' + FONT_BODY;
    ctx.fillText(row.score + '/12 · ' + row.percent + '%', right, centerY + 4);
  });
}

function drawRowsSquare(ctx, rows, areaTop, areaBottom) {
  const left = 64;
  const right = 1016;
  const rowH = (areaBottom - areaTop) / rows.length;

  rows.forEach((row, i) => {
    const top = areaTop + rowH * i;
    const color = SIN_COLORS[row.sin].bar;

    ctx.textAlign = 'left';
    ctx.fillStyle = row.dominant ? color : TEXT;
    ctx.font = '600 27px ' + FONT_BODY;
    setSpacing(ctx, 1);
    ctx.fillText(row.name, left, top + 24);
    setSpacing(ctx, 0);

    if (row.dominant) {
      const nameW = ctx.measureText(row.name).width;
      ctx.font = '700 15px ' + FONT_BODY;
      setSpacing(ctx, 2.5);
      ctx.fillText(t.share.dominantTag, left + nameW + 14, top + 24);
      setSpacing(ctx, 0);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#cfc8dd';
    ctx.font = '500 25px ' + FONT_BODY;
    ctx.fillText(row.score + '/12 · ' + row.percent + '%', right, top + 24);

    const barY = top + 38;
    const barW = right - left;
    rr(ctx, left, barY, barW, 8, 4);
    ctx.fillStyle = 'rgba(245, 241, 232, 0.10)';
    ctx.fill();
    if (row.score > 0) {
      rr(ctx, left, barY, Math.max(8, barW * (row.score / MAX_SCORE)), 8, 4);
      ctx.fillStyle = color;
      ctx.fill();
    }
  });
}

function drawFooter(ctx, dominantColor, taglineY, domainY, ctaY, domainSize, taglineSize) {
  ctx.textAlign = 'center';
  ctx.fillStyle = MUTED;
  ctx.font = '500 ' + taglineSize + 'px ' + FONT_BODY;
  ctx.fillText(t.site.tagline, 540, taglineY);

  ctx.fillStyle = TEXT;
  ctx.font = '700 ' + domainSize + 'px ' + FONT_BODY;
  setSpacing(ctx, 1);
  ctx.fillText(SITE.domain, 540, domainY);
  setSpacing(ctx, 0);

  ctx.fillStyle = dominantColor;
  ctx.font = '700 24px ' + FONT_BODY;
  setSpacing(ctx, 7);
  ctx.fillText(t.share.ctaLine, 540, ctaY);
  setSpacing(ctx, 0);
}

function buildRows(top, totals) {
  const dominantSins = new Set([top.first.sin, top.second && top.second.sin]);
  return SIN_ORDER.map((sin) => ({
    sin,
    name: t.sins[sin].name,
    score: totals[sin],
    percent: scorePercent(totals[sin]),
    dominant: dominantSins.has(sin),
  }));
}

export function drawPortraitCard(top, totals) {
  const W = 1080;
  const H = 1920;
  const canvas = createSurface(W, H);
  const ctx = canvas.getContext('2d');
  const accent = SIN_COLORS[top.first.sin].bar;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(540, 360, 60, 540, 360, 760);
  glow.addColorStop(0, SIN_COLORS[top.first.sin].deep + '66');
  glow.addColorStop(1, 'rgba(15, 12, 21, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawBand(ctx, W, 18);

  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT;
  ctx.font = '600 46px ' + FONT_BODY;
  setSpacing(ctx, 10);
  ctx.fillText(t.site.name.toUpperCase(), 540, 176);
  setSpacing(ctx, 0);

  ctx.fillStyle = MUTED;
  ctx.font = '600 26px ' + FONT_BODY;
  setSpacing(ctx, 8);
  ctx.fillText(top.dual ? 'YOUR DOMINANT SINS' : 'YOUR DOMINANT SIN', 540, 268);
  setSpacing(ctx, 0);

  drawDominantTitle(ctx, top, 540, top.dual ? 400 : 428, 168, 104);

  ctx.fillStyle = MUTED;
  ctx.font = '500 34px ' + FONT_BODY;
  ctx.fillText(t.share.scoresLabel, 540, 586);

  drawRowsPortrait(ctx, buildRows(top, totals), 646, 1490);
  drawFooter(ctx, accent, 1668, 1740, 1800, 56, 38);

  return canvas;
}

export function drawSquareCard(top, totals) {
  const W = 1080;
  const H = 1080;
  const canvas = createSurface(W, H);
  const ctx = canvas.getContext('2d');
  const accent = SIN_COLORS[top.first.sin].bar;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(540, 240, 40, 540, 240, 620);
  glow.addColorStop(0, SIN_COLORS[top.first.sin].deep + '55');
  glow.addColorStop(1, 'rgba(15, 12, 21, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  drawBand(ctx, W, 14);

  ctx.textAlign = 'center';
  ctx.fillStyle = TEXT;
  ctx.font = '600 40px ' + FONT_BODY;
  setSpacing(ctx, 8);
  ctx.fillText(t.site.name.toUpperCase(), 540, 112);
  setSpacing(ctx, 0);

  ctx.fillStyle = MUTED;
  ctx.font = '600 23px ' + FONT_BODY;
  setSpacing(ctx, 6);
  ctx.fillText(top.dual ? 'YOUR DOMINANT SINS' : 'YOUR DOMINANT SIN', 540, 178);
  setSpacing(ctx, 0);

  drawDominantTitle(ctx, top, 540, 300, 116, 68);

  ctx.fillStyle = MUTED;
  ctx.font = '600 22px ' + FONT_BODY;
  setSpacing(ctx, 6);
  ctx.fillText(t.share.scoresLabel, 540, 372);
  setSpacing(ctx, 0);

  drawRowsSquare(ctx, buildRows(top, totals), 408, 836);
  drawFooter(ctx, accent, 930, 990, 1040, 46, 30);

  return canvas;
}



export async function drawCardBlob(kind, top, totals) {
  const canvas = kind === 'portrait' ? drawPortraitCard(top, totals) : drawSquareCard(top, totals);
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/png'
    );
  });
}
