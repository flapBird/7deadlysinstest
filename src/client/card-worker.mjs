// Module worker: draws share cards off the main thread so the quiz/result page
// never blocks (keeps Total Blocking Time at zero on the result page).
import { drawCardBlob } from './card-render.mjs';

self.onmessage = async (event) => {
  const { id, kind, top, totals } = event.data || {};
  if (!id || !kind) return;
  try {
    const blob = await drawCardBlob(kind, top, totals);
    self.postMessage({ id, ok: true, blob });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
