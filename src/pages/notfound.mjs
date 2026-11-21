// 404 page: unknown slugs and stray paths land here (spec §1).
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { SIN_ORDER } from '../quiz/questions.mjs';
import { esc, resultHeader, documentShell } from './layout.mjs';

export function renderNotFound(t) {
  const sinLinks = SIN_ORDER.map((sin) => {
    const s = t.sins[sin];
    return (
      '<li><a href="' + pathFor(SITE.defaultLocale, 'result', sin) + '">' +
      esc(s.name) + '</a></li>'
    );
  }).join('');

  const mainHtml =
    '    <section class="notfound">\n' +
    '      <h1 class="result-title">' + esc(t.notfound.heading) + '</h1>\n' +
    '      <p class="result-lede">' + esc(t.notfound.body) + '</p>\n' +
    '      <div class="hero-actions">\n' +
    '        <a class="btn btn-primary" href="' + pathFor(SITE.defaultLocale, 'home') + '">' +
    esc(t.notfound.backHome) + '</a>\n' +
    '      </div>\n' +
    '      <ul class="notfound-list">' + sinLinks + '</ul>\n' +
    '    </section>\n';

  return documentShell({
    t,
    title: t.meta.notfound.title,
    description: t.meta.notfound.description,
    canonicalPath: '/404.html',
    headerHtml: resultHeader(t),
    mainHtml,
    jsonLd: [],
    scripts: [],
    preloads: [],
  });
}
