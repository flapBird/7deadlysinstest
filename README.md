# 7 Deadly Sins Test

[Take the test at 7deadlysinstest.one](https://7deadlysinstest.one/)

Answer 21 questions about everyday habits in about three minutes. Your result includes a score for each of the seven deadly sins, a reading for your strongest tendency, and a virtue you can practice. If your two highest scores are within one point, both appear in your result.

[Explore the seven illustrated readings](https://7deadlysinstest.one/#seven-sins) · [Read the FAQ](https://7deadlysinstest.one/#faq)

## Taking and sharing the test

- **Answer at your own pace.** Choose from five responses, or use keys 1–5. Use the back arrow to change an answer. When browser storage is available, you can close the tab and resume on the same device.
- **Read your scores.** Three questions contribute to each score out of 12. Each public result page explains the tendency, gives everyday examples, and suggests a balancing habit.
- **Share a result.** Preview a portrait or square PNG, save it, or share it through a supported device. A friend invitation includes your seven totals so you can compare results after your friend finishes.

## Run locally

Use Node.js 18 or later. The site builds with Node's standard library.

```sh
npm start
```

Open [localhost:8090](http://localhost:8090/). After editing, run `npm run build` to refresh the files served from `dist/`. Run `npm test` to check scoring, saved progress, invitations, and analytics host detection.

## Deploy to Cloudflare Workers

Connect the repository to Workers Builds and use these settings.

| Setting | Value |
| --- | --- |
| Worker name | `7deadlysinstest` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

[wrangler.jsonc](./wrangler.jsonc) sets the runtime compatibility date, serves static files from `dist/`, and selects the site's 404 page for unknown paths.

## Maintaining the site

Edit the [English copy](./src/locales/en.json) for questions, readings, and interface text. The [scoring rules](./src/quiz/scoring.mjs) run in the browser. The [analytics configuration](./src/site/analytics.mjs) controls where Google Tag Manager and Microsoft Clarity load.

The [site index for language models](./llms.txt) is published at `/llms.txt` on each build. The [page architecture](./doc/page-architecture.md) describes the quiz, results, and sharing flows.
