// Result page boot (spec §3): public reading ships in static HTML; this module
// hydrates the personal state when the visitor's own first dominant matches the
// URL slug — scores, share actions, compare section and reading expansion.
import { SIN_ORDER, MAX_SCORE } from '../quiz/questions.mjs';
import { rankSins, topSins, scorePercent, encodeInviteScores } from '../quiz/scoring.mjs';
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { CONTENT as t } from './content.mjs';
import { createRecordStore, freshRecord } from './store.mjs';
import { SIN_COLORS } from './sin-theme.mjs';
import { escapeHtml, interpolate } from './quiz-view.mjs';
import { renderCompareSection } from './compare.mjs';
import { initShareCards } from './share-cards.mjs';
import { buildShareText, copyAction } from './share-text.mjs';
import { track } from './events.mjs';

const LOCALE = SITE.defaultLocale;
const $ = (sel) => document.querySelector(sel);

function slugFromPath() {
  const match = window.location.pathname.match(/\/result\/([a-z]+)\/?$/);
  return match ? match[1] : null;
}

function readingBlockHtml(sin, { kicker }) {
  const s = t.sins[sin];
  return (
    (kicker ? '<p class="kicker">' + escapeHtml(kicker) + '</p>' : '') +
    '<h2>' + escapeHtml(s.name) + '</h2>' +
    '<h2>' + escapeHtml(interpolate(t.reading.meaningHeading, { sin: s.name })) + '</h2>' +
    '<p>' + escapeHtml(s.meaning) + '</p>' +
    '<h2>' + escapeHtml(interpolate(t.reading.patternHeading, { sin: s.name })) + '</h2>' +
    '<p>' + escapeHtml(s.pattern) + '</p>' +
    '<h2>' + escapeHtml(interpolate(t.reading.virtueHeading, { virtue: s.virtueName })) + '</h2>' +
    '<p>' + escapeHtml(s.virtue) + '</p>'
  );
}

function detailFullHtml(sin) {
  const s = t.sins[sin];
  return (
    '<h3>' + escapeHtml(interpolate(t.reading.meaningHeading, { sin: s.name })) + '</h3>' +
    '<p>' + escapeHtml(s.meaning) + '</p>' +
    '<h3>' + escapeHtml(interpolate(t.reading.patternHeading, { sin: s.name })) + '</h3>' +
    '<p>' + escapeHtml(s.pattern) + '</p>' +
    '<h3>' + escapeHtml(interpolate(t.reading.virtueHeading, { virtue: s.virtueName })) + '</h3>' +
    '<p>' + escapeHtml(s.virtue) + '</p>'
  );
}

function hydratePersonal(record) {
  const totals = record.result.scores;
  const ranked = rankSins(totals);
  const top = topSins(ranked);
  const slug = slugFromPath();
  const n1 = t.sins[top.first.sin].name;
  const n2 = top.dual ? t.sins[top.second.sin].name : null;

  // ── Hero ──────────────────────────────────────────────────────────────
  const kickerEl = $('[data-kicker]');
  const titleEl = $('[data-title]');
  const subtitleEl = $('[data-subtitle]');
  const publicLedeEl = $('[data-lede-public]');
  const personalLedeEl = $('[data-lede-personal]');

  kickerEl.textContent = t.result.yourResultKicker;
  if (top.dual) {
    titleEl.innerHTML =
      '<span style="color:' + SIN_COLORS[top.first.sin].bar + '">' + escapeHtml(n1) + '</span>' +
      '<span class="title-plus"> + </span>' +
      '<span style="color:' + SIN_COLORS[top.second.sin].bar + '">' + escapeHtml(n2) + '</span>';
    subtitleEl.hidden = true;
    personalLedeEl.textContent = interpolate(t.result.scoredLineDual, {
      sin1: n1,
      score1: top.first.score,
      sin2: n2,
      score2: top.second.score,
    });
  } else {
    personalLedeEl.textContent = interpolate(t.result.scoredLine, {
      score: top.first.score,
      sin: n1,
    });
  }
  publicLedeEl.hidden = true;
  personalLedeEl.hidden = false;

  // Public CTAs give way to the personal actions (spec §3.5).
  $('[data-cta-hero]').hidden = true;
  $('[data-cta-bottom]').hidden = true;
  $('[data-actions-personal]').hidden = false;

  // ── Copy share text (title area button) ───────────────────────────────
  const copyBtn = $('[data-copy]');
  const shareText = buildShareText(t, top, SITE.url + pathFor(LOCALE, 'result', top.first.sin));
  copyBtn.hidden = false;
  copyBtn.textContent = t.result.copyShare;
  copyBtn.addEventListener('click', () => {
    copyAction({
      button: copyBtn,
      text: shareText,
      copiedLabel: t.result.copied,
      fallbackLabel: t.result.copyFallback,
      kind: 'copy',
    });
  });

  // ── Seven score rows (fixed display order, spec §3.2) ────────────────
  const rowsEl = $('[data-score-rows]');
  const dominantSins = new Set([top.first.sin, top.second && top.second.sin]);
  rowsEl.innerHTML = SIN_ORDER.map((sin) => {
    const score = totals[sin];
    const pct = scorePercent(score);
    const color = SIN_COLORS[sin].bar;
    const isDom = dominantSins.has(sin);
    return (
      '<li class="score-row' + (isDom ? ' is-dominant' : '') + '" style="--row-accent:' + color + '"' +
      ' aria-label="' + escapeHtml(interpolate(t.result.scoreRowAria, { sin: t.sins[sin].name, score, percent: pct })) + '">' +
      '<span class="score-name"><span>' + escapeHtml(t.sins[sin].name) + '</span>' +
      (isDom ? '<span class="dominant-tag">' + escapeHtml(t.result.dominantTag) + '</span>' : '') +
      '</span>' +
      '<span class="score-bar"><span class="score-bar-fill" data-w="' + ((score / MAX_SCORE) * 100).toFixed(1) + '" style="width:0"></span></span>' +
      '<span class="score-value">' + score + '/12 · ' + pct + '%</span>' +
      '</li>'
    );
  }).join('');

  // Animate bars from zero; reduced-motion users see final widths instantly (CSS).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const fill of rowsEl.querySelectorAll('.score-bar-fill')) {
        fill.style.width = fill.dataset.w + '%';
      }
    });
  });

  $('[data-score-section]').hidden = false;

  // ── Share image cards ─────────────────────────────────────────────────
  initShareCards({
    portraitBtn: $('[data-card="portrait"]'),
    squareBtn: $('[data-card="square"]'),
    errorEl: $('[data-card-error]'),
    getData: () => ({ top, totals }),
  });

  // ── Compare with friend (spec §3.5, §4) ───────────────────────────────
  if (record.invite) {
    const compareEl = $('[data-compare]');
    renderCompareSection(compareEl, { t, youTotals: totals, youTop: top, invite: record.invite });
    if ((window.location.hash || '') === '#compare') {
      compareEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ── Dual dominant: expand the second sin's full reading ───────────────
  if (top.dual) {
    const secondEl = $('[data-second-reading]');
    secondEl.innerHTML =
      '<section class="reading second-reading">' +
      readingBlockHtml(top.second.sin, { kicker: t.result.secondReadingHint }) +
      '</section>';
  }

  // ── Other six sins: in-page expansion of the three sections ───────────
  const expandable = SIN_ORDER.filter((sin) => !dominantSins.has(sin));
  for (const sin of expandable) {
    const card = document.querySelector('[data-sin-card="' + sin + '"]');
    if (!card) continue;
    const details = card.querySelector('[data-details]');
    if (details) {
      card.querySelector('.sin-card-full').innerHTML = detailFullHtml(sin);
      details.hidden = false;
    }
  }

  // ── Personal actions: retake + invite ─────────────────────────────────
  $('[data-retake]').addEventListener('click', () => {
    const store = createRecordStore();
    store.save(freshRecord(record.invite));
    window.location.assign(pathFor(LOCALE, 'home'));
  });

  const inviteBtn = $('[data-invite]');
  const inviteNote = $('[data-invite-note]');
  const inviteUrl =
    SITE.url +
    '/?vs=' +
    encodeURIComponent(top.first.sin) +
    '#s=' +
    encodeInviteScores(totals);
  const inviteText = buildShareText(t, top, inviteUrl);
  inviteNote.hidden = false;
  inviteBtn.addEventListener('click', async () => {
    // Invite uses the quiz URL with context; normal share uses the public result URL.
    if (typeof navigator.share === 'function') {
      track('share_click', { kind: 'invite' });
      try {
        await navigator.share({ title: t.site.name, text: inviteText });
        track('share_success', { method: 'share', kind: 'invite' });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // cancel → stay on page
        /* share failed → fall through to copy */
      }
    }
    copyAction({
      button: inviteBtn,
      text: inviteText,
      copiedLabel: t.result.inviteCopied,
      fallbackLabel: t.result.copyFallback,
      kind: 'invite',
    });
  });
}

function boot() {
  const slug = slugFromPath();
  if (!slug || !SIN_ORDER.includes(slug)) return; // static 404 territory

  const store = createRecordStore();
  const record = store.load();

  if (!record || record.phase !== 'done') return; // public reading stays as-is
  const ranked = rankSins(record.result.scores);
  const top = topSins(ranked);

  if (top.first.sin === slug) {
    hydratePersonal(record);
  } else {
    // Visiting someone else's reading while owning a result — point back to it.
    const noteEl = $('[data-notyours]');
    if (noteEl) {
      const url = pathFor(LOCALE, 'result', top.first.sin);
      noteEl.innerHTML =
        escapeHtml(t.result.notYourPage) +
        ' <a href="' + url + '">' + escapeHtml(t.common.seeYourResult) + '</a>';
      noteEl.hidden = false;
    }
  }
}

boot();
