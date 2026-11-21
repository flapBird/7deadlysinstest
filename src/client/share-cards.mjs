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
      btn.textContent = t.result.previewLabel;
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

  const dialog = document.querySelector('.card-preview');
  const image = dialog.querySelector('.preview-image');
  const save = dialog.querySelector('[data-save-card]');
  const share = dialog.querySelector('[data-system-share]');
  const shareError = dialog.querySelector('[data-share-error]');
  let selectedKind;
  let shareData;

  function preview(kind) {
    const blob = blobs[kind];
    if (!blob) {
      prepare(kind);
      return;
    }
    selectedKind = kind;
    const name = fileName(kind);
    const url = URL.createObjectURL(blob);
    image.src = url;
    save.href = url;
    save.download = name;
    dialog.querySelector('h2').textContent =
      kind === 'portrait' ? t.result.cardPortraitLabel : t.result.cardSquareLabel;
    shareError.hidden = true;
    shareData = null;
    if (navigator.share && navigator.canShare && typeof File === 'function') {
      const payload = { files: [new File([blob], name, { type: blob.type })], title: t.site.name, text: shareTextShort() };
      if (navigator.canShare(payload)) shareData = payload;
    }
    share.hidden = !shareData;
    dialog.showModal();
  }

  dialog.addEventListener('close', () => {
    URL.revokeObjectURL(image.src);
    image.removeAttribute('src');
    save.removeAttribute('href');
    shareData = null;
  });
  save.addEventListener('click', () => {
    track('share_click', { kind: 'card', card: selectedKind });
    track('share_success', { method: 'download', card: selectedKind });
  });
  share.addEventListener('click', async () => {
    const kind = selectedKind;
    track('share_click', { kind: 'card', card: kind });
    try {
      await navigator.share(shareData);
      track('share_success', { method: 'share', card: kind });
    } catch (error) {
      shareError.hidden = error.name === 'AbortError';
    }
  });
  portraitBtn.addEventListener('click', () => preview('portrait'));
  squareBtn.addEventListener('click', () => preview('square'));

  // Prepare both blobs once the result is on screen (spec: 结果可用时准备 Blob).
  prepare('portrait');
  prepare('square');
}
