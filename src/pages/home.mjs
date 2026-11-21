// Home page template (spec §2): quiz-first, knowledge entry below the quiz area.
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { SIN_ORDER } from '../quiz/questions.mjs';
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

export function renderHome(t) {
  const knowledgeItems = SIN_ORDER.map((sin) => {
    const s = t.sins[sin];
    return (
      '<li class="knowledge-item">' +
      '<a class="knowledge-link" href="' +
      pathFor(SITE.defaultLocale, 'result', sin) +
      '">' +
      esc(s.name) +
      '</a>' +
      '<span class="knowledge-summary">' + esc(s.summary) + '</span>' +
      '</li>'
    );
  }).join('\n      ');

  const mainHtml =
    '    <div class="quiz-shell" data-quiz>\n' +
    '      <noscript><p class="noscript">' + esc(t.home.noscript) + '</p></noscript>\n' +
    '    </div>\n' +
    '    <section class="knowledge">\n' +
    '      <h2>' + esc(t.home.knowledgeTitle) + '</h2>\n' +
    '      <p class="knowledge-intro">' + esc(t.home.knowledgeIntro) + '</p>\n' +
    '      <ul class="knowledge-list">\n      ' + knowledgeItems + '\n      </ul>\n' +
    '    </section>\n';

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
