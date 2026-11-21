// Pure scoring, ranking and invite-codec functions (spec §2, §4).
// No DOM / storage access here so both the Node build and the browser can import them.
import {
  MAX_SCORE,
  QUESTIONS,
  SIN_ORDER,
  SIN_SET,
} from './questions.mjs';

export function isValidAnswer(v) {
  return Number.isInteger(v) && v >= 1 && v <= 5;
}

// answersById: { q01: 1..5, … } — returns { pride: 0..12, … } or null when incomplete/invalid.
export function scoreAnswers(answersById) {
  if (!answersById || typeof answersById !== 'object') return null;
  const totals = {};
  let seen = 0;
  for (const sin of SIN_ORDER) totals[sin] = 0;
  for (const q of QUESTIONS) {
    const v = answersById[q.id];
    if (!isValidAnswer(v)) return null;
    seen += 1;
    const contribution = q.dir === 'pos' ? v - 1 : 6 - v - 1;
    totals[q.sin] += contribution;
  }
  return seen === QUESTIONS.length ? totals : null;
}

// Fixed display order with score-descending ranking; ties broken by SIN_ORDER (spec §2).
export function rankSins(totals) {
  const entries = SIN_ORDER.map((sin) => ({ sin, score: totals[sin] }));
  entries.sort(
    (a, b) => b.score - a.score || SIN_ORDER.indexOf(a.sin) - SIN_ORDER.indexOf(b.sin)
  );
  return entries;
}

// Single or dual dominant: dual when top1 − top2 is 0 or 1; title never exceeds two items.
export function topSins(ranked) {
  const first = ranked[0];
  const second = ranked[1] ?? null;
  const dual = second !== null && first.score - second.score <= 1;
  return { first, second: dual ? second : null, dual };
}

export function scorePercent(score) {
  return Math.round((score / MAX_SCORE) * 100);
}

// ── Invite data contract (spec §4) ──────────────────────────────────────────
// Fragment carries derived totals only: /?vs={firstDominant}#s=4.6.3.5.2.11.7
// Values are written and read in SIN_ORDER.

export function encodeInviteScores(totals) {
  return SIN_ORDER.map((sin) => String(totals[sin])).join('.');
}

export function decodeInviteScores(str) {
  if (typeof str !== 'string') return null;
  const parts = str.split('.');
  if (parts.length !== SIN_ORDER.length) return null;
  const scores = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > MAX_SCORE) return null;
    scores.push(n);
  }
  const totals = {};
  SIN_ORDER.forEach((sin, i) => (totals[sin] = scores[i]));
  return totals;
}

// A valid invite needs a legal vs slug, seven legal totals, and the first dominant
// of those totals must match vs. Scores may be missing entirely (vs-only invite).
// Returns { vs, scores: number[7] } with values in SIN_ORDER, { vs, scores: null }
// for a vs-only invite, or null for an invalid invite.
export function validateInvite(vs, scoresStr) {
  if (!SIN_SET.has(vs)) return null;
  if (scoresStr == null || scoresStr === '') {
    return { vs, scores: null };
  }
  const totals = decodeInviteScores(scoresStr);
  if (!totals) return null;
  const first = topSins(rankSins(totals)).first;
  if (first.sin !== vs) return null;
  return { vs, scores: SIN_ORDER.map((sin) => totals[sin]) };
}

// Build the invite URL for a finished result.
export function buildInviteUrl(siteUrl, vs, totals) {
  return (
    siteUrl +
    '/?vs=' +
    encodeURIComponent(vs) +
    '#s=' +
    encodeInviteScores(totals)
  );
}
