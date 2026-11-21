// Home boot (spec §1, §2): restore draft or completed state, handle invite context,
// run the single-question state machine with keyboard + persistence + transitions.
import { QUESTIONS } from '../quiz/questions.mjs';
import { scoreAnswers, rankSins, topSins } from '../quiz/scoring.mjs';
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { CONTENT as t } from './content.mjs';
import { createRecordStore, freshRecord } from './store.mjs';
import { track } from './events.mjs';
import { readInviteFromLocation } from './invite.mjs';
import { buildQuizView, interpolate, escapeHtml } from './quiz-view.mjs';

const LOCALE = SITE.defaultLocale;
const TOTAL = QUESTIONS.length;
const container = document.querySelector('[data-quiz]');
const store = createRecordStore();

const reducedMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TRANSITION_MS = reducedMotion ? 0 : 180;

let record = store.load() || freshRecord();
let locked = false;
let firstPaint = true;
let currentIndex = 0;

function sinName(sin) {
  return t.sins[sin].name;
}

function inviteNoteHtml() {
  if (!record.invite) return '';
  const name = sinName(record.invite.vs);
  const text = interpolate(
    record.invite.scores ? t.home.inviteNote : t.home.inviteNoteNoScores,
    { sin: name }
  );
  return escapeHtml(text);
}

// ── Question flow (spec §2 一次选择的处理顺序) ──────────────────────────────
function renderQuestion(index) {
  currentIndex = index;
  const q = QUESTIONS[index];
  const answeredCount = Object.keys(record.answersById).length;
  const view = buildQuizView({
    t,
    statement: t.quiz[q.id],
    number: index + 1,
    total: TOTAL,
    answeredCount,
    selected: record.answersById[q.id] ?? null,
    canBack: index > 0,
    inviteNoteHtml: inviteNoteHtml(),
    saveNote: store.persistent ? t.home.saveNote : t.home.memoryNote,
  });
  container.replaceChildren(view.root);

  view.backEl.addEventListener('click', handleBack);
  for (const btn of view.optionEls) {
    btn.addEventListener('click', () => handleAnswer(Number(btn.dataset.value), btn));
  }

  if (!firstPaint) view.statementEl.focus({ preventScroll: true });
  firstPaint = false;
}

function markSelected(button) {
  for (const el of container.querySelectorAll('.quiz-option')) {
    el.classList.toggle('is-selected', el === button);
  }
}

function handleAnswer(value, button) {
  if (locked) return;
  locked = true;
  const q = QUESTIONS[currentIndex];

  // First valid answer of this round fires start (refresh/restore never re-fires).
  if (!record.started) {
    record.started = true;
    track('start');
  }

  record.answersById[q.id] = value;

  if (currentIndex === TOTAL - 1) {
    const totals = scoreAnswers(record.answersById);
    if (!totals) {
      locked = false;
      return;
    }
    // Completion persists totals and drops per-question answers (spec §2).
    record = {
      version: 1,
      phase: 'done',
      cursor: TOTAL - 1,
      answersById: {},
      invite: record.invite,
      started: true,
      completed: true,
      result: { scores: totals },
    };
    store.save(record);
    track('complete');
    markSelected(button);
    const target = pathFor(LOCALE, 'result', topSins(rankSins(totals)).first.sin);
    setTimeout(() => window.location.assign(target), Math.max(TRANSITION_MS, 120));
    return;
  }

  // Save the NEXT question's position before the transition so closing the tab
  // mid-transition restores to the next question (spec §2).
  record.cursor = currentIndex + 1;
  store.save(record);
  markSelected(button);
  setTimeout(() => {
    renderQuestion(currentIndex + 1);
    locked = false;
  }, TRANSITION_MS);
}

function handleBack() {
  if (locked || currentIndex === 0) return;
  // Back also saves the position and restores the original selection.
  record.cursor = currentIndex - 1;
  store.save(record);
  renderQuestion(currentIndex - 1);
}

// Keyboard 1–5 shares the click handler; ← goes back (spec §2).
document.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
  if (locked || record.phase !== 'quiz' || !container.querySelector('.quiz')) return;
  if (event.key >= '1' && event.key <= '5') {
    event.preventDefault();
    const value = Number(event.key);
    const button = container.querySelector('.quiz-option[data-value="' + value + '"]');
    if (button) handleAnswer(value, button);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    handleBack();
  }
});

// ── Completed visitors: result entry + retake (spec §2) ─────────────────────
function renderCompletedView() {
  const ranked = rankSins(record.result.scores);
  const top = topSins(ranked);
  const url = pathFor(LOCALE, 'result', top.first.sin);
  container.replaceChildren();

  const card = document.createElement('div');
  card.className = 'done-card';
  card.innerHTML =
    '<h2>' + escapeHtml(t.home.completedTitle) + '</h2>' +
    '<p class="done-top">' + escapeHtml(
      interpolate(t.result.scoredLine, { score: top.first.score, sin: sinName(top.first.sin) })
    ) + '</p>' +
    '<p class="done-note">' + escapeHtml(t.home.completedNote) + '</p>' +
    '<div class="hero-actions">' +
    '<a class="btn btn-primary" href="' + url + '">' + escapeHtml(t.common.seeYourResult) + '</a>' +
    '<button type="button" class="btn btn-ghost" data-startover>' + escapeHtml(t.common.startOver) + '</button>' +
    '</div>';
  card.querySelector('[data-startover]').addEventListener('click', () => retake());
  container.append(card);
}

function retake() {
  // Retake clears this round's personal state but keeps a valid invite context —
  // the friend's scores stay comparable after re-answering.
  record = freshRecord(record.invite);
  store.save(record);
  locked = false;
  firstPaint = true;
  renderQuestion(0);
}

// ── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
  // Invite handling (spec §1): a valid ?vs=…#s=… persists into the draft so the
  // context survives restarts mid-quiz.
  const incomingInvite = readInviteFromLocation();
  if (incomingInvite) {
    if (record.phase === 'done') {
      // Already finished → jump straight to the comparison on the personal result page.
      record.invite = incomingInvite;
      store.save(record);
      const own = pathFor(LOCALE, 'result', topSins(rankSins(record.result.scores)).first.sin);
      window.location.replace(own + '#compare');
      return;
    }
    record.invite = incomingInvite;
    store.save(record);
  }

  if (record.phase === 'done') {
    renderCompletedView();
  } else {
    renderQuestion(record.cursor);
  }
}

boot();
