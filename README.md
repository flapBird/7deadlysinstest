# 7 Deadly Sins Test

Static quiz site for **7deadlysinstest.one**: 21 statements → seven 0–12 scores →
your dominant deadly sin. Everything is scored and stored on the visitor's device —
no backend, no cookies, no answer ever leaves the browser.

Implements `doc/page-architecture.md` (workorders A–F).

## Commands

```bash
npm run build   # render dist/ (zero dependencies, Node >= 18)
npm run serve   # serve dist/ at http://localhost:8090
npm test        # scoring / tie-break / invite / archive validation (node --test)
```

Deploy anywhere static: build command `npm run build`, output directory `dist/`.
Cloudflare Pages works as-is (trailing-slash directories + `404.html` are standard).

## Structure

```
src/
  site/       config (domain injection) + pathFor(locale, page, sin?)
  quiz/       question bank (stable ids) + pure scoring/ranking/invite codec
  locales/    en.json — every string: statements, options, readings, buttons,
              a11y labels, share templates, canvas text, page metadata
  pages/      layout / home / result / 404 templates
  client/     quiz engine, personal result hydration, canvas cards (worker),
              invite compare, copy actions, events
  styles/     single stylesheet (minified at build)
  assets/     favicon, og.png
build.mjs     static build + content/link/question-constraint validation
```

Key behaviors (spec cross-refs in `doc/page-architecture.md`):

- `/` — one question at a time, keyboard 1–5 / ←, 180 ms transition, draft
  persisted after every selection; closing mid-transition restores the next question.
- `/result/{sin}/` — seven static, no-JS-readable readings; personal state
  hydrates only when the visitor's own first dominant matches the slug.
- Dual dominant when top1 − top2 ≤ 1; ties break by fixed slug order
  `pride greed lust envy gluttony wrath sloth`.
- Share: copy text (clipboard + fallback box), 1080×1920 and 1080×1080 PNG cards
  drawn in a module worker (main-thread fallback), native share with download fallback.
- Invite: `/?vs={first}#s={totals}` carries the seven totals in the hash; invalid
  fragments degrade to a normal quiz; compare rows render only with real scores.
- Events (`window` CustomEvent `sdst:track` + `window.__sdstEvents`): `start`,
  `complete`, `share_click`, `share_success` (method), `compare`. No answers,
  scores, invite URLs or identifiers in event params. Wire a real collector later
  without touching the call sites.

## Language expansion

Add `src/locales/{locale}.json`, register the locale in `build.mjs`, and extend
`pathFor` prefixing (`/{locale}/…`). Add hreflang alternates when the second
language ships.

## Verified

- `node --test`: 13/13 (boundaries, tie-breaks, invite contract, archive sanitization).
- Browser walkthrough (390×844): full completion path, refresh-restore, back/
  re-select, public vs personal result states, notyours hint, 404, both share
  cards (PNG output inspected), copy + invite + compare round-trip between two
  simulated friends, broken/vs-only invites, retake.
- Lighthouse (mobile emulation, headless Chromium): median of runs — home
  Performance 100, result page Performance 100; Accessibility / Best Practices /
  SEO 100 on both. Runs were done against the local dev server (no compression),
  so production CDN scores should be equal or better.
