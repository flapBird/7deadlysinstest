// Canvas share cards (spec §4 图片交付动作): 1080×1920 portrait + 1080×1080 square.
// Drawing runs in a module worker (OffscreenCanvas) to keep the main thread free;
// falls back to a main-thread render when workers are unavailable. Blobs are
// prepared when the result becomes available so the share call happens inside the
// user gesture.
import { SITE } from '../site/config.mjs';
import { CONTENT as t } from './content.mjs';
import { track } from './events.mjs';
import { buildShareText } from './share-text.mjs';

// ── Blob generation (worker-first, main-thread fallback) ────────────────────
let cardWorker = null;
let workerBroken = false;
let seq = 0;

function ensureWorker() {
  if (cardWorker || workerBroken) return cardWorker;
  try {
    const url = new URL('./card-worker.mjs', import.meta.url);
    cardWorker = new Worker(url, { type: 'module' });
  } catch {
    workerBroken = true;
    cardWorker = null;
  }
  return cardWorker;
}

function generateInWorker(kind, top, totals) {
  const worker = ensureWorker();
  if (!worker) return null;
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const handler = (event) => {
      if (!event.data || event.data.id !== id) return;
      worker.removeEventListener('message', handler);
      if (event.data.ok) resolve(event.data.blob);
      else reject(new Error(event.data.error || 'worker draw failed'));
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ id, kind, top, totals });
    setTimeout(() => {
      worker.removeEventListener('message', handler);
      reject(new Error('worker draw timeout'));
    }, 8000);
  });
}

async function generateCardBlob(kind, top, totals) {
  if (!workerBroken) {
    try {
      const blob = await generateInWorker(kind, top, totals);
      if (blob) return blob;
    } catch {
      // Worker path failed once — stop using it and draw on the main thread.
      workerBroken = true;
      try {
        cardWorker.terminate();
      } catch {
        /* ignore */
      }
      cardWorker = null;
    }
  }
  const { drawCardBlob } = await import('./card-render.mjs');
  return drawCardBlob(kind, top, totals);
}

// ── Button wiring ────────────────────────────────────────────────────────────
export function initShareCards({ portraitBtn, squareBtn, errorEl, getData }) {
  const blobs = { portrait: null, square: null };
  const states = { portrait: 'idle', square: 'idle' };
  let data = null;

  const fileName = (kind) => {
    const top = data.top;
    const sins = top.dual ? top.first.sin + '-' + top.second.sin : top.first.sin;
    const size = kind === 'portrait' ? '1080x1920' : '1080x1080';
    return '7-deadly-sins-' + sins + '-' + kind + '-' + size + '.png';
  };

  const shareTextShort = () => (data ? buildShareText(t, data.top, SITE.url) : t.site.tagline);

  function updateButton(kind) {
    const btn = kind === 'portrait' ? portraitBtn : squareBtn;
    const state = states[kind];
    if (state === 'idle' || state === 'busy') {
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
    const format = kind === 'portrait' ? t.result.cardPortraitLabel : t.result.cardSquareLabel;
    btn.textContent = format + ' · ' + btn.textContent;
  }

  async function prepare(kind) {
    states[kind] = 'busy';
    updateButton(kind);
    try {
      if (!data) data = getData();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      blobs[kind] = await generateCardBlob(kind, data.top, data.totals);
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
  prepare('portrait');
  prepare('square');
}
