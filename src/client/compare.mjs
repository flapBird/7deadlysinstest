// Friend comparison section (spec §4 好友回流).
// Rows are per sin in fixed order; You / Friend bars side by side with values,
// both dominants marked. The compare event fires only when both real seven-score
// sets are on screen together.
import { SIN_ORDER } from '../quiz/questions.mjs';
import { rankSins, topSins, scorePercent } from '../quiz/scoring.mjs';
import { SIN_COLORS } from './sin-theme.mjs';
import { track } from './events.mjs';
import { escapeHtml, interpolate } from './quiz-view.mjs';

function friendTotalsFromInvite(invite) {
  const totals = {};
  SIN_ORDER.forEach((sin, i) => (totals[sin] = invite.scores[i]));
  return totals;
}

function renderCol(score, sin, dominant, whoLabel) {
  const color = SIN_COLORS[sin].bar;
  return (
    '<div class="compare-col' + (dominant ? ' is-dominant' : '') + '" style="--row-accent:' + color + '">' +
    '<span class="compare-who">' + escapeHtml(whoLabel) + '</span>' +
    '<span class="score-bar"><span class="score-bar-fill" style="width:' +
    (score / 12) * 100 + '%"></span></span>' +
    '<span class="compare-val">' + score + '/12</span>' +
    '</div>'
  );
}

export function renderCompareSection(sectionEl, { t, youTotals, youTop, invite }) {
  const youRanked = rankSins(youTotals);

  let inner =
    '<h2>' + escapeHtml(t.result.compareHeading) + '</h2>' +
    '<p class="compare-note">' + escapeHtml(t.result.compareNote) + '</p>';

  if (invite.scores) {
    const friendTotals = friendTotalsFromInvite(invite);
    const friendTop = topSins(rankSins(friendTotals));
    const youDominants = new Set([youTop.first.sin, youTop.second && youTop.second.sin]);
    const friendDominants = new Set([friendTop.first.sin, friendTop.second && friendTop.second.sin]);

    const rows = SIN_ORDER.map((sin) => {
      const youScore = youTotals[sin];
      const friendScore = friendTotals[sin];
      return (
        '<li class="compare-row">' +
        '<span class="compare-sin">' + escapeHtml(t.sins[sin].name) + '</span>' +
        '<span class="compare-cols">' +
        renderCol(youScore, sin, youDominants.has(sin), t.result.compareYou) +
        renderCol(friendScore, sin, friendDominants.has(sin), t.result.compareFriend) +
        '</span>' +
        '</li>'
      );
    }).join('');

    inner += '<ul class="compare-rows">' + rows + '</ul>';
    sectionEl.innerHTML = inner;
    sectionEl.hidden = false;

    // Animate the fills in from zero (reduced-motion users get instant widths via CSS).
    requestAnimationFrame(() => {
      for (const fill of sectionEl.querySelectorAll('.score-bar-fill')) {
        const w = fill.style.width;
        fill.style.width = '0';
        requestAnimationFrame(() => (fill.style.width = w));
      }
    });

    track('compare');
    return;
  }

  // vs-only invite: show only what really exists — the friend's dominant sin.
  inner +=
    '<p class="compare-vs-only">' +
    escapeHtml(interpolate(t.result.compareVsOnly, { sin: t.sins[invite.vs].name })) +
    '</p>';
  sectionEl.innerHTML = inner;
  sectionEl.hidden = false;
}
