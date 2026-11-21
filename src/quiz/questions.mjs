// Question bank delivery copy (spec §2). IDs and dimensions are language-independent;
// statement text lives in src/locales/en.json keyed by id. Every round uses this order.
// `dir` is developer-only metadata: 'pos' contributes v-1, 'rev' contributes (6-v)-1.

export const SIN_ORDER = Object.freeze([
  'pride',
  'greed',
  'lust',
  'envy',
  'gluttony',
  'wrath',
  'sloth',
]);

export const SIN_SET = Object.freeze(new Set(SIN_ORDER));

export const OPTION_VALUES = Object.freeze([1, 2, 3, 4, 5]);
export const MAX_SCORE = 12; // 3 statements × max 4 points each

export const QUESTIONS = Object.freeze([
  { id: 'q01', sin: 'pride', dir: 'pos' },
  { id: 'q02', sin: 'envy', dir: 'pos' },
  { id: 'q03', sin: 'sloth', dir: 'pos' },
  { id: 'q04', sin: 'wrath', dir: 'rev' },
  { id: 'q05', sin: 'greed', dir: 'pos' },
  { id: 'q06', sin: 'gluttony', dir: 'pos' },
  { id: 'q07', sin: 'lust', dir: 'pos' },
  { id: 'q08', sin: 'envy', dir: 'rev' },
  { id: 'q09', sin: 'greed', dir: 'rev' },
  { id: 'q10', sin: 'pride', dir: 'rev' },
  { id: 'q11', sin: 'lust', dir: 'pos' },
  { id: 'q12', sin: 'sloth', dir: 'rev' },
  { id: 'q13', sin: 'wrath', dir: 'pos' },
  { id: 'q14', sin: 'gluttony', dir: 'rev' },
  { id: 'q15', sin: 'sloth', dir: 'pos' },
  { id: 'q16', sin: 'lust', dir: 'rev' },
  { id: 'q17', sin: 'wrath', dir: 'pos' },
  { id: 'q18', sin: 'gluttony', dir: 'pos' },
  { id: 'q19', sin: 'pride', dir: 'pos' },
  { id: 'q20', sin: 'greed', dir: 'pos' },
  { id: 'q21', sin: 'envy', dir: 'pos' },
]);

export const QUESTION_IDS = Object.freeze(QUESTIONS.map((q) => q.id));

export function questionIndex(id) {
  return QUESTION_IDS.indexOf(id);
}
