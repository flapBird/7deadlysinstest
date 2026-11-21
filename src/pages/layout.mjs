// Shared HTML shell: head, seven-color band, header, footer (spec §3.1).
import { SITE } from '../site/config.mjs';
import { pathFor } from '../site/paths.mjs';
import { SIN_ORDER } from '../quiz/questions.mjs';
import { ANALYTICS_SNIPPET } from '../site/analytics.mjs';

export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function colorBand() {
  return (
    '<div class="color-band" aria-hidden="true">' +
    SIN_ORDER.map((sin) => '<span class="band-' + sin + '"></span>').join('') +
    '</div>'
  );
}

// Home header: narrow site name (h1) with the time chip on the same line (spec §2).
export function homeHeader(t) {
  return (
    '<header class="site-head">' +
    '<h1 class="site-name">' + esc(t.site.name) + '</h1>' +
    '<span class="time-chip">' + esc(t.home.timeNote) + '</span>' +
    '</header>'
  );
}

export function resultHeader(t) {
  return (
    '<header class="site-head">' +
    '<a class="site-name site-name-link" href="' + pathFor(SITE.defaultLocale, 'home') + '">' +
    esc(t.site.name) +
    '</a>' +
    '</header>'
  );
}

export function siteFooter(t) {
  return (
    '<footer class="site-foot">' +
    '<p>' + esc(t.common.footer.disclaimer) + '</p>' +
    '<p>' + esc(t.common.footer.privacy) + '</p>' +
    '<p class="foot-rights">' + esc(t.common.footer.rights) + '</p>' +
    '</footer>'
  );
}

export function documentShell({
  t,
  title,
  description,
  canonicalPath,
  bodyTag = '<body>',
  headerHtml,
  mainHtml,
  jsonLd = null,
  scripts = [],
  preloads = [],
}) {
  const canonical = SITE.url + canonicalPath;
  const ogImage = SITE.url + '/assets/og.png';
  const ldScripts = jsonLd
    .map((ld) => '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>')
    .join('\n  ');
  const preloadHtml = preloads
    .map(
      (href) =>
        '<link rel="modulepreload" href="' + href + '" crossorigin="anonymous" />'
    )
    .join('\n  ');
  const scriptHtml = scripts
    .map((src) => '<script type="module" src="' + src + '"></script>')
    .join('\n  ');

  return '<!doctype html>\n<html lang="' + SITE.defaultLocale + '">\n<head>\n' +
    '  <meta charset="utf-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />\n' +
    '  <title>' + esc(title) + '</title>\n' +
    '  <meta name="description" content="' + esc(description) + '" />\n' +
    '  <link rel="canonical" href="' + canonical + '" />\n' +
    '  <meta name="theme-color" content="#0f0c15" />\n' +
    '  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg" />\n' +
    '  <meta property="og:site_name" content="' + esc(t.site.name) + '" />\n' +
    '  <meta property="og:type" content="website" />\n' +
    '  <meta property="og:title" content="' + esc(title) + '" />\n' +
    '  <meta property="og:description" content="' + esc(description) + '" />\n' +
    '  <meta property="og:url" content="' + canonical + '" />\n' +
    '  <meta property="og:image" content="' + ogImage + '" />\n' +
    '  <meta name="twitter:card" content="summary_large_image" />\n' +
    '  <meta name="twitter:title" content="' + esc(title) + '" />\n' +
    '  <meta name="twitter:description" content="' + esc(description) + '" />\n' +
    '  <meta name="twitter:image" content="' + ogImage + '" />\n' +
    '  <link rel="stylesheet" href="/assets/main.css" />\n' +
    (preloadHtml ? '  ' + preloadHtml + '\n' : '') +
    '  ' + ldScripts + '\n' +
    '  ' + ANALYTICS_SNIPPET + '\n' +
    '</head>\n' +
    bodyTag + '\n' +
    colorBand() + '\n' +
    headerHtml + '\n' +
    '  <main class="page" id="main">\n' +
    mainHtml +
    '  </main>\n' +
    siteFooter(t) + '\n' +
    scriptHtml + '\n' +
    '</body>\n</html>\n';
}
