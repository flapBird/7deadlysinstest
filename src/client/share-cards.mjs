// Canvas share cards (spec §4 图片交付动作): 1080×1920 portrait + 1080×1080 square.
// Drawn at actual pixels with local fonts only; shared data + color mapping, with
// independent spacing, title wrap and footer math per size. Blobs are prepared when
// the result becomes available so the share call happens inside the user gesture.
import { SIN_ORDER, MAX_SCORE } from '../quiz/questions.mjs';
import { scorePercent } from '../quiz/scoring.mjs';
import { SITE } from '../site/config.mjs';
import { CONTENT as t } from './content.mjs';
import { SIN_COLORS } from './sin-theme.mjs';
import { track } from './events.mjs';
import { buildShareText } from './share-text.mjs';

const FONT_BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FONT_DISPLAY = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';

const BG = '#0f0c15';
const TEXT = '#f5f1e8';
const MUTED = '#a89fb6';
const FAINT = 'rgba(245, 241, 232, 0.62)';

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
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
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
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
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

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/png'
    );
  });
}

// ── Button wiring ────────────────────────────────────────────────────────────
export function initShareCards({ portraitBtn, squareBtn, errorEl, getData }) {
  const blobs = { portrait: null, square: null };
  const states = { portrait: 'idle', square: 'idle' };
  let data = null;

  const fileName = (kind) => {
    const top = data.top;
    const sins = top.dual
      ? top.first.sin + '-' + top.second.sin
      : top.first.sin;
    const size = kind === 'portrait' ? '1080x1920' : '1080x1080';
    return '7-deadly-sins-' + sins + '-' + kind + '-' + size + '.png';
  };

  const shareTextShort = () => (data ? buildShareText(t, data.top, SITE.url) : t.site.tagline);

  function updateButton(kind) {
    const btn = kind === 'portrait' ? portraitBtn : squareBtn;
    const state = states[kind];
    if (state === 'busy') {
      btn.disabled = true;
      btn.textContent = t.result.preparingLabel;
    } else if (state === 'error') {
      btn.disabled = false;
      btn.textContent = t.result.retryLabel;
    } else {
      btn.disabled = false;
      const canShare =
        typeof navigator.share === 'function' &&
        typeof File !== 'undefined' &&
        navigator.canShare;
      btn.textContent = canShare ? t.result.shareLabel : t.result.downloadLabel;
    }
  }

  async function prepare(kind) {
    states[kind] = 'busy';
    updateButton(kind);
    try {
      if (!data) data = getData();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const canvas =
        kind === 'portrait' ? drawPortraitCard(data.top, data.totals) : drawSquareCard(data.top, data.totals);
      blobs[kind] = await canvasToBlob(canvas);
      states[kind] = 'ready';
    } catch {
      blobs[kind] = null;
      states[kind] = 'error';
      if (errorEl) errorEl.hidden = false;
    }
    updateButton(kind);
  }

  function download(kind) {
    const blob = blobs[kind];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(kind);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    track('share_success', { method: 'download', card: kind });
  }

  function onClick(kind) {
    track('share_click', { kind: 'card', card: kind });
    const blob = blobs[kind];
    if (!blob) {
      // Retry path after a failed generation.
      prepare(kind);
      return;
    }
    const file = new File([blob], fileName(kind), { type: 'image/png' });
    const shareData = { files: [file], title: t.site.name, text: shareTextShort() };
    // Call share() synchronously within the user gesture (Safari requirement);
    // user cancel (AbortError) stays on the page and never fires success.
    if (typeof navigator.share === 'function' && navigator.canShare && navigator.canShare(shareData)) {
      navigator
        .share(shareData)
        .then(() => track('share_success', { method: 'share', card: kind }))
        .catch((err) => {
          if (err && err.name !== 'AbortError') download(kind);
        });
      return;
    }
    download(kind);
  }

  portraitBtn.addEventListener('click', () => onClick('portrait'));
  squareBtn.addEventListener('click', () => onClick('square'));

  updateButton('portrait');
  updateButton('square');

  // Prepare both blobs once the result is on screen (spec: 结果可用时准备 Blob).
  const schedule =
    window.requestIdleCallback || ((fn) => setTimeout(fn, 350));
  schedule(() => {
    prepare('portrait');
    prepare('square');
  });
}
