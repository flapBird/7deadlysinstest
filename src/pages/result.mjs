// Result page template (spec §3): fully readable public reading in static HTML,
// with containers the client fills for the personal state (scores, share, compare).
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { SIN_ORDER } from '../quiz/questions.mjs';
import { esc, resultHeader, documentShell } from './layout.mjs';

const CLIENT_ENTRY = '/client/result.mjs';
const PRELOADS = [
  '/client/content.mjs',
  '/client/store.mjs',
  '/client/events.mjs',
  '/client/invite.mjs',
  '/client/compare.mjs',
  '/client/share-cards.mjs',
  '/client/share-text.mjs',
  '/site/config.mjs',
  '/site/paths.mjs',
  '/quiz/questions.mjs',
  '/quiz/scoring.mjs',
];

export function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (m, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : m
  );
}

export function renderResult(t, sin) {
  const s = t.sins[sin];
  const others = SIN_ORDER.filter((x) => x !== sin);

  const otherCards = others
    .map((other) => {
      const o = t.sins[other];
      // Full text is injected client-side into this details block for the personal
      // state only ("可在本页展开读完三段"); public pages ship the summary + link.
      return (
        '<li class="sin-card" data-sin-card="' + other + '">\n' +
        '            <a class="sin-card-name" href="' +
        pathFor(SITE.defaultLocale, 'result', other) +
        '">' + esc(o.name) + '</a>\n' +
        '            <p class="sin-card-summary">' + esc(o.summary) + '</p>\n' +
        '            <details class="sin-card-details" data-details hidden>\n' +
        '              <summary>' + esc(t.result.expandHint) + '</summary>\n' +
        '              <div class="sin-card-full"></div>\n' +
        '            </details>\n' +
        '          </li>'
      );
    })
    .join('\n          ');

  const mainHtml =
    '    <section class="result-hero">\n' +
    '      <p class="kicker" data-kicker>' + esc(t.result.publicKicker) + '</p>\n' +
    '      <h1 class="result-title" data-title>' + esc(s.name) + '</h1>\n' +
    '      <p class="result-subtitle" data-subtitle>' + esc(s.subtitle) + '</p>\n' +
    '      <p class="result-lede" data-lede-public>' +
    esc(interpolate(t.result.publicIntro, { sin: s.name })) + '</p>\n' +
    '      <p class="result-lede result-lede-personal" data-lede-personal hidden></p>\n' +
    '      <p class="result-notyours" data-notyours hidden></p>\n' +
    '      <div class="hero-actions">\n' +
    '        <button type="button" class="btn btn-ghost btn-copy" data-copy hidden></button>\n' +
    '        <a class="btn btn-primary" data-cta-hero href="' + pathFor(SITE.defaultLocale, 'home') + '">' +
    esc(t.common.takeTheTest) + '</a>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '    <section class="score-section" data-score-section hidden>\n' +
    '      <h2>' + esc(t.result.scoreHeading) + '</h2>\n' +
    '      <p class="score-note">' + esc(t.result.scoreNote) + '</p>\n' +
    '      <ol class="score-rows" data-score-rows></ol>\n' +
    '      <div class="share-images" data-share-images>\n' +
    '        <span class="share-images-label">' + esc(t.result.shareImagesLabel) + '</span>\n' +
    '        <div class="share-images-buttons">\n' +
    '          <button type="button" class="btn btn-card" data-card="portrait" disabled></button>\n' +
    '          <button type="button" class="btn btn-card" data-card="square" disabled></button>\n' +
    '        </div>\n' +
    '        <p class="card-error" data-card-error hidden>' + esc(t.result.cardError) + '</p>\n' +
    '      </div>\n' +
    '    </section>\n' +
    '    <!-- Ad slot (spec §3.3): the only one on the page, below the seven score rows.\n' +
    '         Ships collapsed; unhide and fill only when real ad material exists.\n' +
    '         No ad requests are made while the quiz is running. -->\n' +
    '    <div class="ad-slot" data-ad-slot hidden></div>\n' +
    '    <section class="compare" data-compare hidden></section>\n' +
    '    <section class="reading">\n' +
    '      <h2>' + esc(interpolate(t.reading.meaningHeading, { sin: s.name })) + '</h2>\n' +
    '      <p>' + esc(s.meaning) + '</p>\n' +
    '      <h2>' + esc(interpolate(t.reading.patternHeading, { sin: s.name })) + '</h2>\n' +
    '      <p>' + esc(s.pattern) + '</p>\n' +
    '      <h2>' + esc(interpolate(t.reading.virtueHeading, { virtue: s.virtueName })) + '</h2>\n' +
    '      <p>' + esc(s.virtue) + '</p>\n' +
    '    </section>\n' +
    '    <div data-second-reading></div>\n' +
    '    <section class="other-sins">\n' +
    '      <h2>' + esc(t.result.otherSixHeading) + '</h2>\n' +
    '      <ul class="sin-cards">\n' +
    '          ' + otherCards + '\n' +
    '      </ul>\n' +
    '    </section>\n' +
    '    <section class="page-actions">\n' +
    '      <div class="actions-public">\n' +
    '        <a class="btn btn-primary" data-cta-bottom href="' + pathFor(SITE.defaultLocale, 'home') + '">' +
    esc(t.common.takeTheTest) + '</a>\n' +
    '      </div>\n' +
    '      <div class="actions-personal" data-actions-personal hidden>\n' +
    '        <button type="button" class="btn btn-secondary" data-retake>' + esc(t.common.retake) + '</button>\n' +
    '        <button type="button" class="btn btn-ghost" data-invite>' + esc(t.common.compareWithFriend) + '</button>\n' +
    '        <p class="invite-note" data-invite-note hidden>' + esc(t.result.inviteNote) + '</p>\n' +
    '      </div>\n' +
    '    </section>\n';

  const title = interpolate(t.result.titleTemplate, { sin: s.name });

  return documentShell({
    t,
    title,
    description: s.metaDescription,
    canonicalPath: pathFor(SITE.defaultLocale, 'result', sin),
    bodyTag: '<body data-sin="' + sin + '" data-page-sin="' + sin + '">',
    headerHtml: resultHeader(t),
    mainHtml,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        url: SITE.url + pathFor(SITE.defaultLocale, 'result', sin),
        description: s.metaDescription,
        inLanguage: SITE.defaultLocale,
        isPartOf: { '@type': 'WebSite', name: t.site.name, url: SITE.url },
      },
    ],
    scripts: [CLIENT_ENTRY],
    preloads: PRELOADS,
  });
}
