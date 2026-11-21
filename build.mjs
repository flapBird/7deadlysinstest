// Static build entry (workorder A). Zero runtime dependencies.
// Renders the home page, the seven result pages, 404, sitemap and robots into dist/,
// generates the client content bundle from the locale file, copies client/quiz/site
// modules and assets, and validates content + internal links + question constraints.
import { mkdir, rm, writeFile, readFile, readdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE } from './src/site/config.mjs';
import { pathFor } from './src/site/paths.mjs';
import { QUESTIONS, QUESTION_IDS, SIN_ORDER, SIN_SET } from './src/quiz/questions.mjs';
import { scoreAnswers } from './src/quiz/scoring.mjs';
import { renderHome } from './src/pages/home.mjs';
import { renderResult } from './src/pages/result.mjs';
import { renderNotFound } from './src/pages/notfound.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'src');

const content = JSON.parse(await readFile(path.join(SRC, 'locales/en.json'), 'utf8'));

// ── Validation helpers ───────────────────────────────────────────────────────
const problems = [];
const fail = (msg) => problems.push(msg);

function assertLeafStrings(node, trail) {
  if (node === null || node === undefined) {
    fail('Missing content value at ' + trail);
    return;
  }
  if (typeof node === 'string') {
    if (node.trim() === '') fail('Empty content string at ' + trail);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => assertLeafStrings(v, trail + '[' + i + ']'));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) assertLeafStrings(v, trail + '.' + k);
  }
}

function collectLinks(html) {
  return [...html.matchAll(/href="(\/[^"]*?)"/g)].map((m) => m[1]);
}

function pageLinkTargets(html, pageLabel) {
  const results = new Set();
  let hasHome = false;
  for (const href of collectLinks(html)) {
    const m = href.match(/^\/result\/([a-z]+)\/$/);
    if (m) {
      if (!SIN_SET.has(m[1])) fail(pageLabel + ' links unknown sin slug: ' + href);
      else results.add(m[1]);
    } else if (href === '/') {
      hasHome = true;
    }
  }
  return { results, hasHome };
}

// ── 1. Content validation (spec §5-A: 全部翻译键有值) ───────────────────────
assertLeafStrings(content, 'en');
for (const id of QUESTION_IDS) {
  if (typeof content.quiz?.[id] !== 'string' || !content.quiz[id].trim()) {
    fail('Missing question text for ' + id);
  }
}
if (content.options.length !== 5) fail('options must have exactly 5 entries');

// Question constraints (spec §6 题序与分数) — build-time guarantee.
const ids = QUESTIONS.map((q) => q.id);
if (new Set(ids).size !== 21) fail('Question IDs are not unique');
for (const sin of SIN_ORDER) {
  const qs = QUESTIONS.filter((q) => q.sin === sin);
  if (qs.length !== 3) fail(sin + ' has ' + qs.length + ' questions, expected 3');
  if (qs.filter((q) => q.dir === 'rev').length !== 1) {
    fail(sin + ' must have exactly 1 reversed question');
  }
}
if (new Set(QUESTIONS.slice(0, 3).map((q) => q.sin)).size !== 3) {
  fail('The first three statements must cover three different sins');
}
for (let i = 1; i < QUESTIONS.length; i++) {
  if (QUESTIONS[i].sin === QUESTIONS[i - 1].sin) {
    fail('Adjacent questions repeat a sin at ' + ids[i]);
  }
}

// Scoring boundary checks (spec §6): all-5 → all 8, all-1 → all 4.
const all5 = scoreAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 5])));
const all1 = scoreAnswers(Object.fromEntries(QUESTION_IDS.map((id) => [id, 1])));
if (!all5 || Object.values(all5).some((v) => v !== 8)) fail('All-5 answers must score 8 everywhere');
if (!all1 || Object.values(all1).some((v) => v !== 4)) fail('All-1 answers must score 4 everywhere');

if (problems.length) {
  console.error('Content validation failed:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// ── 2. Render pages ──────────────────────────────────────────────────────────
const homeHtml = renderHome(content);
const resultHtmls = new Map();
for (const sin of SIN_ORDER) resultHtmls.set(sin, renderResult(content, sin));
const notFoundHtml = renderNotFound(content);

// Internal link validation (spec §5-A: 页面内链可达).
{
  const home = pageLinkTargets(homeHtml, 'home');
  for (const sin of SIN_ORDER) {
    if (!home.results.has(sin)) fail('home is missing a link to /result/' + sin + '/');
  }
  for (const sin of SIN_ORDER) {
    const { results, hasHome } = pageLinkTargets(resultHtmls.get(sin), 'result/' + sin);
    if (!hasHome) fail('result/' + sin + ' does not link back home');
    const missing = SIN_ORDER.filter((s) => s !== sin && !results.has(s));
    if (missing.length) fail('result/' + sin + ' is missing sibling links: ' + missing.join(', '));
  }
  if (!pageLinkTargets(notFoundHtml, '404').hasHome) fail('404 does not link home');
}

// Generated HTML must never leak raw `undefined` from a missing key.
for (const [name, html] of [['home', homeHtml], ['404', notFoundHtml], ...resultHtmls]) {
  if (html.includes('undefined')) fail(name + '.html contains the literal string "undefined"');
}

if (problems.length) {
  console.error('Build validation failed:');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

// ── 3. Emit dist ─────────────────────────────────────────────────────────────
await rm(DIST, { recursive: true, force: true });
for (const dir of [
  DIST,
  path.join(DIST, 'assets'),
  path.join(DIST, 'client'),
  path.join(DIST, 'quiz'),
  path.join(DIST, 'site'),
  path.join(DIST, '404'),
]) {
  await mkdir(dir, { recursive: true });
}
for (const sin of SIN_ORDER) {
  await mkdir(path.join(DIST, 'result', sin), { recursive: true });
}

const write = async (file, data) => {
  await writeFile(file, data);
  console.log('  wrote', path.relative(ROOT, file));
};

await write(path.join(DIST, 'index.html'), homeHtml);
for (const sin of SIN_ORDER) {
  await write(path.join(DIST, 'result', sin, 'index.html'), resultHtmls.get(sin));
}
await write(path.join(DIST, '404.html'), notFoundHtml);
await write(path.join(DIST, '404', 'index.html'), notFoundHtml);

const sitemapUrls = [
  { loc: SITE.url + '/', priority: '1.0' },
  ...SIN_ORDER.map((sin) => ({
    loc: SITE.url + pathFor(SITE.defaultLocale, 'result', sin),
    priority: '0.8',
  })),
];
await write(
  path.join(DIST, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapUrls
      .map(
        (u) =>
          '  <url><loc>' + u.loc + '</loc><lastmod>' +
          new Date().toISOString().slice(0, 10) +
          '</lastmod><priority>' + u.priority + '</priority></url>'
      )
      .join('\n') +
    '\n</urlset>\n'
);
await write(
  path.join(DIST, 'robots.txt'),
  'User-agent: *\nAllow: /\n\nSitemap: ' + SITE.url + '/sitemap.xml\n'
);

// Client content bundle generated from the locale file (single source of truth).
await write(
  path.join(DIST, 'client', 'content.mjs'),
  '// GENERATED by build.mjs from src/locales/en.json — do not edit.\n' +
    'export const CONTENT = ' + JSON.stringify(content) + ';\n\n' +
    'export const SITE_CONFIG = ' + JSON.stringify(SITE) + ';\n'
);

// Copy runtime modules + assets.
const copyDir = async (srcDir, destDir, ext) => {
  for (const entry of await readdir(srcDir)) {
    if (ext && !entry.endsWith(ext)) continue;
    await copyFile(path.join(srcDir, entry), path.join(destDir, entry));
  }
};
await copyDir(path.join(SRC, 'client'), path.join(DIST, 'client'), '.mjs');
for (const f of await readdir(path.join(SRC, 'quiz'))) {
  await copyFile(path.join(SRC, 'quiz', f), path.join(DIST, 'quiz', f));
}
for (const f of await readdir(path.join(SRC, 'site'))) {
  await copyFile(path.join(SRC, 'site', f), path.join(DIST, 'site', f));
}

// Minified stylesheet: strip comments, collapse whitespace, drop spaces around
// delimiters. Quoted strings (font names) keep their inner spacing.
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
await write(
  path.join(DIST, 'assets/main.css'),
  minifyCss(await readFile(path.join(SRC, 'styles/main.css'), 'utf8'))
);
await copyFile(path.join(SRC, 'assets/favicon.svg'), path.join(DIST, 'assets/favicon.svg'));
if (existsSync(path.join(SRC, 'assets/og.png'))) {
  await copyFile(path.join(SRC, 'assets/og.png'), path.join(DIST, 'assets/og.png'));
  console.log('  wrote dist/assets/og.png');
}

console.log(
  '\nBuild OK: 1 home + ' + SIN_ORDER.length + ' result pages + 404 + sitemap/robots, ' +
    QUESTION_IDS.length + ' statements validated.'
);
