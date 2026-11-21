// Single-question quiz view (spec §2 layout): back + counter, 2px progress bar,
// statement, five 52px options, save note. Full re-render per question keeps the
// state machine simple; focus lands on the new statement after each change.
import { OPTION_VALUES } from '../quiz/questions.mjs';

export function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m
  );
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildQuizView({
  t,
  statement,
  number,
  total,
  answeredCount,
  selected,
  canBack,
  inviteNoteHtml,
  saveNote,
}) {
  const root = document.createElement('div');
  root.className = 'quiz';

  const optionButtons = OPTION_VALUES.map((value, i) => {
    const label = t.options[i];
    const isSelected = selected === value;
    return (
      '<button type="button" class="quiz-option' + (isSelected ? ' is-selected' : '') +
      '" data-value="' + value + '">' +
      '<span class="quiz-option-key" aria-hidden="true">' + (i + 1) + '</span>' +
      '<span class="quiz-option-label">' + escapeHtml(label) + '</span>' +
      '</button>'
    );
  }).join('');

  const pct = total ? Math.round((answeredCount / total) * 100) : 0;

  root.innerHTML =
    '<div class="quiz-top">' +
    '<button type="button" class="quiz-back" data-back' + (canBack ? '' : ' disabled') +
    ' aria-label="' + escapeHtml(t.home.backAria) + '">←</button>' +
    '<span class="quiz-counter" data-counter aria-label="' +
    escapeHtml(interpolate(t.home.counterAria, { n: number })) + '">' +
    number + ' / ' + total + '</span>' +
    '</div>' +
    '<div class="quiz-progress" role="progressbar" aria-label="' +
    escapeHtml(interpolate(t.home.progressAria, { answered: answeredCount })) +
    '" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + answeredCount + '">' +
    '<div class="quiz-progress-fill" data-fill style="width:' + pct + '%"></div></div>' +
    '<h2 class="quiz-statement" data-statement tabindex="-1">' + escapeHtml(statement) + '</h2>' +
    '<div class="quiz-options" role="group" aria-label="' + escapeHtml(t.home.optionsGroupAria) + '">' +
    optionButtons +
    '</div>' +
    '<p class="quiz-hint">' + escapeHtml(t.home.keyHint) + '</p>' +
    '<p class="quiz-save-note">' + escapeHtml(saveNote) + '</p>' +
    (inviteNoteHtml ? '<p class="quiz-invite-note">' + inviteNoteHtml + '</p>' : '');

  return {
    root,
    statementEl: root.querySelector('[data-statement]'),
    fillEl: root.querySelector('[data-fill]'),
    backEl: root.querySelector('[data-back]'),
    optionEls: [...root.querySelectorAll('.quiz-option')],
  };
}
