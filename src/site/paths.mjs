// Single source of truth for URL construction (spec §1).
// Default locale (en) uses unprefixed paths; future locales use /{locale}/….
// Trailing slashes keep every page servable as a static directory index.
export function pathFor(locale = 'en', page = 'home', sin) {
  const prefix = locale === 'en' ? '' : '/' + locale;
  switch (page) {
    case 'home':
      return prefix + '/';
    case 'result':
      return prefix + '/result/' + sin + '/';
    case 'notfound':
      return prefix + '/404.html';
    default:
      throw new Error('Unknown page: ' + page);
  }
}
