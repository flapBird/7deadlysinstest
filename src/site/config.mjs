// Site-wide configuration. The domain is injected here so locales never hardcode it.
// A future second language only needs new locale files plus a build-time locale list.
export const SITE = Object.freeze({
  url: 'https://7deadlysinstest.one',
  domain: '7deadlysinstest.one',
  name: '7 Deadly Sins Test',
  defaultLocale: 'en',
});
