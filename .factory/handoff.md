# Winter Ride Window — repair handoff

## Release result: PASS

Repair work order `winter-ride-window-repair-2` repaired verifier candidate
`8e0b13f3777734723d34e4216a6bcbd71bf75a3e` at product commit
`8937b4456999fe1361a2d08d7d3810105240b2b1` (`fix: bound forecast recovery
and mobile type`). It is pushed to `origin/main` and deployed as the same
static Vite artifact to <https://winter-ride-window.sociobot.in>.

Azure Static Web Apps deployment `3d825302-7b6b-4027-ab51-27005043ba27`
succeeded on 2026-08-28 UTC. The deployment remains static; the build output
is `dist/` with `index.html` at its root.

## Repairs

- **WRW2-001 — mobile type floor:** At the 390 px breakpoint, all meaningful
  compact labels, result metadata, hourly wind/time values, statuses, sample
  guidance, daylight/battery/unknowns copy, source/uncertainty content,
  navigation/brand text, and footer/supporting copy now compute to at least
  16 px. This preserves the field-guide hierarchy while treating forecast and
  uncertainty information as body content, not decoration.
- **WRW2-002 — stalled provider recovery:** The entire geocode-plus-forecast
  exchange now shares an `AbortController` with a 15-second application
  timeout. Both fetches receive its signal. Loading exposes a keyboard-usable
  `Cancel check` control; timeout and cancellation each return to the existing
  focused, actionable failure state and re-enable submission.
- **PWA update:** The shell cache is now `winter-ride-window-v2`, so repaired
  shell assets activate as a new service-worker revision and stale caches are
  removed during activation.

## Regression coverage

`tests/app.e2e.ts` now proves that:

- populated 390 px results have no inspected meaningful text below 16 px;
- a deliberately never-resolving forecast aborts through the application
  timeout, focuses the error heading, explains the timeout, and re-enables the
  submit button;
- a rider can cancel that same stalled request with the same recoverable,
  focused outcome; and
- offline app-shell coverage expects the new versioned service-worker cache.

## Verification evidence

All commands ran in `/work/repo` after a clean `npm ci` (96 packages; audit
reported 0 vulnerabilities).

| Check | Result |
| --- | --- |
| `npm test` | PASS — 7/7 Vitest tests |
| `npx tsc --noEmit` | PASS — no diagnostics |
| Lint | N/A — this intentionally small TypeScript project has no separate lint configuration or script; strict TypeScript is the configured static check |
| `npm run build` | PASS — `dist/` produced; JS 25.44 KB (9.41 KB gzip), CSS 15.87 KB (4.58 KB gzip) |
| `npm run test:e2e` | PASS — 20/20 Playwright checks across desktop Chromium and iPhone 13 / 390 px, including keyboard, Axe, privacy, offline, reduced-motion, populated reflow, and both new recovery paths |
| `npm audit --omit=dev` | PASS — 0 vulnerabilities |
| Local `verify-url.sh` | PASS — HTTP 200; title, `lang`, one h1, main, alt text, labels, and zero console errors |
| Local mobile Lighthouse 13.4.1 | PASS — Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.7 s, TBT 0 ms, CLS 0 |

Live verification after deployment also passed:

- `verify-url.sh` loaded the HTTPS site in 745 ms with zero console errors and
  valid title/lang/h1/main/alt/button checks.
- A real Leeds check completed, focused `#results-title`, and Axe had no
  serious or critical violations on both home and populated results. A fresh
  390 px context had `scrollWidth === clientWidth === 390`.
- Default live flow left cookies and local storage empty. The service worker
  was `activated`, had no waiting revision, created `winter-ride-window-v2`,
  and a subsequent offline reload restored the h1/app shell.
- Direct `/privacy` and `/terms` browser routes rendered their expected title
  and h1. Headers retain HSTS, `nosniff`, `DENY` framing, restrictive CSP with
  only the two documented Open-Meteo hosts in `connect-src`, and `no-cache` on
  `/sw.js`.
- All 15 served files in the exact local `dist/` build compared byte-for-byte
  to production. `staticwebapp.config.json` was excluded from that content
  comparison because Azure applies it as deployment configuration rather than
  serving it. Representative SHA-256 values: `index.html`
  `a95456c12daa346147beddf1e6935f9b9a49c8db92351140d518781fba5c6106`,
  `/assets/index-CS6ncma5.js`
  `0705a98588867f6108f27ef1b20a86490ba1fd0c5d336a5b21b88fe0c8356443`,
  `/assets/index-Bgur7K43.css`
  `13d71868ae4eddd72289c59a45a7925d9672486dcdd09e3ac56155fc29d7767e`,
  and `/sw.js`
  `8b1732a2b8a59818d927e7fc8bf78d78b3504b1387ee3d9437afd5dd06843b67`.

## Run and verify

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm run preview
```

## Known gaps and next steps

None known. The product remains intentionally a pre-ride checklist, not a
safety verdict; Open-Meteo availability is now bounded and recoverable rather
than silently indefinite.
