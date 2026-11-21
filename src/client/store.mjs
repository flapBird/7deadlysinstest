// Draft/result persistence (spec §2 计分、保存与恢复).
// Versioned localStorage key; strict validation on read (bad archive → fresh quiz);
// graceful in-memory fallback when storage is unavailable (tab-only, flagged).
import { QUESTIONS, SIN_ORDER, MAX_SCORE } from '../quiz/questions.mjs';
import { isValidAnswer } from '../quiz/scoring.mjs';

const KEY = 'sdst:v1';
const VERSION = 1;

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

function pickStorage() {
  try {
    const probe = '__sdst_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { backend: window.localStorage, persistent: true };
  } catch {
    return { backend: memoryStorage(), persistent: false };
  }
}

export function freshRecord(invite = null) {
  return {
    version: VERSION,
    phase: 'quiz',
    cursor: 0,
    answersById: {},
    invite,
    started: false,
    completed: false,
    result: null,
  };
}

function validInvite(inv) {
  if (inv === null || inv === undefined) return null;
  if (typeof inv !== 'object') return null;
  if (!SIN_ORDER.includes(inv.vs)) return null;
  if (inv.scores == null) return { vs: inv.vs, scores: null };
  if (
    Array.isArray(inv.scores) &&
    inv.scores.length === SIN_ORDER.length &&
    inv.scores.every((n) => Number.isInteger(n) && n >= 0 && n <= MAX_SCORE)
  ) {
    return { vs: inv.vs, scores: inv.scores.slice() };
  }
  return null;
}

// Completed results store only the seven totals; ranking is derived on read so the
// stored payload can never drift from the scoring rules.
function validateScores(result) {
  if (!result || typeof result !== 'object' || !result.scores) return null;
  const scores = {};
  for (const sin of SIN_ORDER) {
    const v = result.scores[sin];
    if (!Number.isInteger(v) || v < 0 || v > MAX_SCORE) return null;
    scores[sin] = v;
  }
  return { scores };
}

export function sanitizeRecord(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return null;
  const invite = validInvite(raw.invite);

  if (raw.phase === 'quiz') {
    const cursor = raw.cursor;
    if (!Number.isInteger(cursor) || cursor < 0 || cursor > QUESTIONS.length - 1) return null;
    const answersById = {};
    if (raw.answersById && typeof raw.answersById === 'object') {
      for (const q of QUESTIONS) {
        const v = raw.answersById[q.id];
        if (v === undefined) continue;
        if (!isValidAnswer(v)) return null;
        answersById[q.id] = v;
      }
    }
    return {
      version: VERSION,
      phase: 'quiz',
      cursor,
      answersById,
      invite,
      started: raw.started === true,
      completed: false,
      result: null,
    };
  }

  if (raw.phase === 'done') {
    const result = validateScores(raw.result);
    if (!result) return null;
    return {
      version: VERSION,
      phase: 'done',
      cursor: QUESTIONS.length - 1,
      answersById: {},
      invite,
      started: true,
      completed: raw.completed !== false,
      result,
    };
  }

  return null;
}

export function createRecordStore() {
  const { backend, persistent } = pickStorage();
  return {
    persistent,
    load() {
      try {
        const raw = JSON.parse(backend.getItem(KEY) || 'null');
        return sanitizeRecord(raw);
      } catch {
        return null;
      }
    },
    save(record) {
      try {
        backend.setItem(KEY, JSON.stringify(record));
      } catch {
        /* storage may reject mid-session; the in-memory copy keeps this tab going */
      }
    },
    clear() {
      try {
        backend.removeItem(KEY);
      } catch {
        /* ignore */
      }
    },
  };
}
