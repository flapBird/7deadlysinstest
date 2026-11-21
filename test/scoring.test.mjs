// Spec §6 题序与分数 / 好友回流 / 恢复 — pure-logic acceptance cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { QUESTIONS, QUESTION_IDS, SIN_ORDER } from '../src/quiz/questions.mjs';
import {
  scoreAnswers,
  rankSins,
  topSins,
  scorePercent,
  encodeInviteScores,
  decodeInviteScores,
  validateInvite,
  buildInviteUrl,
} from '../src/quiz/scoring.mjs';
import { sanitizeRecord, freshRecord } from '../src/client/store.mjs';

const answersAll = (v) => Object.fromEntries(QUESTION_IDS.map((id) => [id, v]));
const totalsOf = (overrides) => {
  const answers = answersAll(1); // positive → 0, reversed (v=1) → 4
  for (const q of QUESTIONS) if (q.dir === 'rev') answers[q.id] = 5; // reversed → 0
  return { ...answers, ...overrides };
};

test('question constraints: 21 unique ids, 3 per sin with exactly 1 reversed', () => {
  assert.equal(new Set(QUESTION_IDS).size, 21);
  for (const sin of SIN_ORDER) {
    const qs = QUESTIONS.filter((q) => q.sin === sin);
    assert.equal(qs.length, 3, sin);
    assert.equal(qs.filter((q) => q.dir === 'rev').length, 1, sin);
  }
  assert.equal(new Set(QUESTIONS.slice(0, 3).map((q) => q.sin)).size, 3);
  for (let i = 1; i < QUESTIONS.length; i++) {
    assert.notEqual(QUESTIONS[i].sin, QUESTIONS[i - 1].sin, 'adjacent at ' + QUESTION_IDS[i]);
  }
});

test('boundaries: all-5 → 8 everywhere, all-1 → 4 everywhere', () => {
  const all5 = scoreAnswers(answersAll(5));
  const all1 = scoreAnswers(answersAll(1));
  assert.deepEqual(Object.values(all5), [8, 8, 8, 8, 8, 8, 8]);
  assert.deepEqual(Object.values(all1), [4, 4, 4, 4, 4, 4, 4]);
});

test('boundaries: 0/12 and 12/12 constructible', () => {
  const min = scoreAnswers(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, q.dir === 'pos' ? 1 : 5]))
  );
  const max = scoreAnswers(
    Object.fromEntries(QUESTIONS.map((q) => [q.id, q.dir === 'pos' ? 5 : 1]))
  );
  assert.deepEqual(Object.values(min), [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(Object.values(max), [12, 12, 12, 12, 12, 12, 12]);
});

test('spec example: Wrath two positive 5,5 and reversed 2 → 11/12, 92%', () => {
  const answers = totalsOf({ q04: 2, q13: 5, q17: 5 });
  const totals = scoreAnswers(answers);
  assert.equal(totals.wrath, 11);
  assert.equal(scorePercent(11), 92);
  // every other sin at 0 → Wrath is the sole dominant
  const top = topSins(rankSins(totals));
  assert.equal(top.first.sin, 'wrath');
  assert.equal(top.dual, false);
});

test('incomplete or invalid answers score null', () => {
  const partial = answersAll(3);
  delete partial.q07;
  assert.equal(scoreAnswers(partial), null);
  assert.equal(scoreAnswers({ ...answersAll(3), q02: 6 }), null);
  assert.equal(scoreAnswers({ ...answersAll(3), q02: 0 }), null);
  assert.equal(scoreAnswers({ ...answersAll(3), q02: 2.5 }), null);
  assert.equal(scoreAnswers(null), null);
});

test('ranking ties break by fixed slug order', () => {
  const totals = { pride: 5, greed: 5, lust: 5, envy: 1, gluttony: 1, wrath: 1, sloth: 1 };
  const ranked = rankSins(totals);
  assert.deepEqual(ranked.slice(0, 3).map((r) => r.sin), ['pride', 'greed', 'lust']);
});

test('dual dominant when top1 − top2 is 0 or 1, single at 2; title max two', () => {
  const base = { pride: 8, greed: 4, lust: 4, envy: 4, gluttony: 4, wrath: 4, sloth: 4 };
  assert.equal(topSins(rankSins({ ...base, greed: 8 })).dual, true);
  assert.equal(topSins(rankSins({ ...base, greed: 7 })).dual, true);
  assert.equal(topSins(rankSins({ ...base, greed: 6 })).dual, false);
  // three-way tie: fixed order picks the pair
  const tie = topSins(rankSins({ pride: 8, greed: 8, lust: 8, envy: 0, gluttony: 0, wrath: 0, sloth: 0 }));
  assert.deepEqual([tie.first.sin, tie.second.sin], ['pride', 'greed']);
});

test('invite codec: spec example round-trips in fixed order', () => {
  const totals = { pride: 4, greed: 6, lust: 3, envy: 5, gluttony: 2, wrath: 11, sloth: 7 };
  const encoded = encodeInviteScores(totals);
  assert.equal(encoded, '4.6.3.5.2.11.7');
  assert.deepEqual(decodeInviteScores(encoded), totals);
  assert.equal(
    buildInviteUrl('https://7deadlysinstest.one', 'wrath', totals),
    'https://7deadlysinstest.one/?vs=wrath#s=4.6.3.5.2.11.7'
  );
});

test('invite codec rejects malformed fragments', () => {
  assert.equal(decodeInviteScores('1.2.3'), null);
  assert.equal(decodeInviteScores('1.2.3.4.5.6.13'), null);
  assert.equal(decodeInviteScores('1.2.3.4.5.6.-1'), null);
  assert.equal(decodeInviteScores('1.2.3.4.5.6.x'), null);
  assert.equal(decodeInviteScores(''), null);
  assert.equal(decodeInviteScores(null), null);
});

test('validateInvite: first dominant must match vs; missing scores keep vs', () => {
  const good = { pride: 4, greed: 6, lust: 3, envy: 5, gluttony: 2, wrath: 11, sloth: 7 };
  assert.deepEqual(validateInvite('wrath', '4.6.3.5.2.11.7'), { vs: 'wrath', scores: Object.values(good) });
  assert.equal(validateInvite('pride', '4.6.3.5.2.11.7'), null); // wrath is top, not pride
  assert.equal(validateInvite('wrath', '1.2.3.4.5.6.99'), null);
  assert.deepEqual(validateInvite('wrath', null), { vs: 'wrath', scores: null });
  assert.deepEqual(validateInvite('wrath', ''), { vs: 'wrath', scores: null });
  assert.equal(validateInvite('nonsense', '4.6.3.5.2.11.7'), null);
  assert.equal(validateInvite(undefined, '4.6.3.5.2.11.7'), null);
});

test('record sanitization: quiz drafts round-trip, bad archives reset', () => {
  const draft = {
    version: 1,
    phase: 'quiz',
    cursor: 6,
    answersById: { q01: 4, q02: 2, q03: 5, q04: 1, q05: 3, q06: 2 },
    invite: { vs: 'wrath', scores: [4, 6, 3, 5, 2, 11, 7] },
    started: true,
  };
  const clean = sanitizeRecord(JSON.parse(JSON.stringify(draft)));
  assert.equal(clean.phase, 'quiz');
  assert.equal(clean.cursor, 6);
  assert.equal(Object.keys(clean.answersById).length, 6);
  assert.deepEqual(clean.invite.scores, [4, 6, 3, 5, 2, 11, 7]);
  assert.equal(clean.started, true);

  assert.equal(sanitizeRecord({ ...draft, cursor: 21 }), null);
  assert.equal(sanitizeRecord({ ...draft, cursor: -1 }), null);
  assert.equal(sanitizeRecord({ ...draft, answersById: { q01: 6 } }), null);
  assert.equal(sanitizeRecord({ ...draft, version: 2 }), null);
  assert.equal(sanitizeRecord({ version: 1, phase: 'elsewhere' }), null);
  assert.equal(sanitizeRecord(null), null);
  // invalid invite silently drops back to a normal quiz
  const badInvite = sanitizeRecord({ ...draft, invite: { vs: 'nope', scores: [1, 2, 3] } });
  assert.equal(badInvite.invite, null);
});

test('record sanitization: done records store only the seven totals', () => {
  const done = {
    version: 1,
    phase: 'done',
    invite: null,
    completed: true,
    result: { scores: { pride: 8, greed: 4, lust: 4, envy: 4, gluttony: 4, wrath: 4, sloth: 4 } },
  };
  const clean = sanitizeRecord(JSON.parse(JSON.stringify(done)));
  assert.equal(clean.phase, 'done');
  assert.equal(clean.result.scores.wrath, 4);
  assert.deepEqual(clean.answersById, {});
  assert.equal(
    sanitizeRecord({ ...done, result: { scores: { ...done.result.scores, pride: 13 } } }),
    null
  );
  assert.equal(
    sanitizeRecord({ ...done, result: { scores: { pride: 8 } } }),
    null
  );
});

test('fresh record starts a clean round', () => {
  const fresh = freshRecord();
  assert.equal(fresh.phase, 'quiz');
  assert.equal(fresh.cursor, 0);
  assert.deepEqual(fresh.answersById, {});
  assert.equal(fresh.started, false);
  assert.equal(fresh.completed, false);
});
