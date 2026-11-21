// Browser events only (spec §4): start | complete | share_click | share_success | compare.
// Params are limited to operational info (action, method, card size) — never answers,
// scores, invite URLs or user identifiers. Cross-user aggregation is a separate plan;
// the first release validates these through local listeners (window events + log).
export function track(action, params = {}) {
  const detail = { action, ...params };
  try {
    window.dispatchEvent(new CustomEvent('sdst:track', { detail }));
  } catch {
    /* CustomEvent unavailable in very old hosts — the log below still records it */
  }
  const log = (window.__sdstEvents = window.__sdstEvents || []);
  log.push(detail);
  if (log.length > 100) log.shift();
}
