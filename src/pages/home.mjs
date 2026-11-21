// Home page template (spec §2): quiz-first, knowledge entry below the quiz area.
// The first question is server-rendered with the exact geometry the client reuses,
// so the JS boot causes no layout shift; a draft restore swaps in-place.
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { SIN_ORDER, QUESTIONS, OPTION_VALUES } from '../quiz/questions.mjs';
import { esc, homeHeader, documentShell } from './layout.mjs';

const CLIENT_ENTRY = '/client/home.mjs';
// Main module graph — preloaded to avoid a request waterfall on the critical path.
const PRELOADS = [
  '/client/content.mjs',
  '/client/store.mjs',
  '/client/events.mjs',
  '/client/invite.mjs',
  '/client/quiz-view.mjs',
  '/site/config.mjs',
  '/site/paths.mjs',
  '/quiz/questions.mjs',
  '/quiz/scoring.mjs',
];

// Static first-question shell (same geometry as buildQuizView renders client-side).
function quizShellHtml(t) {
  const q = QUESTIONS[0];
  const options = OPTION_VALUES.map((value, i) =>
    '<button type="button" class="quiz-option" data-value="' + value + '">' +
    '<span class="quiz-option-key" aria-hidden="true">' + (i + 1) + '</span>' +
    '<span class="quiz-option-label">' + esc(t.options[i]) + '</span>' +
    '</button>'
  ).join('');
  return (
    '<div class="quiz">' +
    '<div class="quiz-top">' +
    '<button type="button" class="quiz-back" disabled aria-label="' + esc(t.home.backAria) + '">←</button>' +
    '<span class="quiz-counter" aria-label="' + esc(t.home.counterAria.replace('{n}', '1')) + '">1 / ' +
    QUESTIONS.length + '</span>' +
    '</div>' +
    '<div class="quiz-progress" role="progressbar" aria-label="' +
    esc(t.home.progressAria.replace('{answered}', '0')) +
    '" aria-valuemin="0" aria-valuemax="' + QUESTIONS.length + '" aria-valuenow="0">' +
    '<div class="quiz-progress-fill" style="width:0%"></div></div>' +
    '<h2 class="quiz-statement" tabindex="-1">' + esc(t.quiz[q.id]) + '</h2>' +
    '<div class="quiz-options" role="group" aria-label="' + esc(t.home.optionsGroupAria) + '">' +
    options +
    '</div>' +
    '<p class="quiz-hint">' + esc(t.home.keyHint) + '</p>' +
    '<p class="quiz-save-note">' + esc(t.home.saveNote) + '</p>' +
    '</div>'
  );
}

export function renderHome(t) {
  const knowledgeItems = SIN_ORDER.map((sin) => {
    const s = t.sins[sin];
    return `<li class="knowledge-item" data-sin="${sin}">
      <a class="knowledge-link" href="${pathFor(SITE.defaultLocale, 'result', sin)}">
        <img src="/assets/${sin}.webp" alt="" width="320" height="320" loading="lazy" decoding="async">
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.summary)}</p>
        <span class="virtue"><small>${esc(t.home.virtueLabel)}</small>${esc(s.virtueName)}</span>
      </a>
    </li>`;
  }).join('');

  const guide = `<div class="quiz-guide">
    <section><h2>${esc(t.home.howTitle)}</h2>
      <ol>${t.home.steps.map(step => `<li><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p></li>`).join('')}</ol>
    </section>
    <section id="faq"><h2>${esc(t.home.faqTitle)}</h2>
      ${t.home.faq.map(item => `<details><summary>${esc(item.q)}</summary><p>${esc(item.a)}</p></details>`).join('')}
    </section>
  </div>`;

  const mainHtml =
    '    <div class="home-spread"><header class="frontispiece">' +
    '<img class="front-art" src="/assets/temptation.webp" alt="" width="640" height="640">' +
    '<h2>' + esc(t.site.tagline) + '</h2><p>' + esc(t.home.intro) + '</p></header>' +
    '<div class="quiz-shell" data-quiz>\n' +
    '      <noscript><p class="noscript">' + esc(t.home.noscript) + '</p></noscript>\n' +
    '      ' + quizShellHtml(t) + '\n' +
    '    </div></div>\n' +
    '    <section class="knowledge" id="seven-sins">\n' +
    '      <h2>' + esc(t.home.knowledgeTitle) + '</h2>\n' +
    '      <p class="knowledge-intro">' + esc(t.home.knowledgeIntro) + '</p>\n' +
    '      <ul class="knowledge-list">\n      ' + knowledgeItems + '\n      </ul>\n' +
    '    </section>\n' + guide;

  return documentShell({
    t,
    title: t.meta.home.title,
    description: t.meta.home.description,
    canonicalPath: pathFor(SITE.defaultLocale, 'home'),
    headerHtml: homeHeader(t),
    mainHtml,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: t.site.name,
        url: SITE.url,
        inLanguage: SITE.defaultLocale,
      },
    ],
    scripts: [CLIENT_ENTRY],
    preloads: PRELOADS,
  });
}
