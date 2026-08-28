# Winter Ride Window — independent verification handoff

## Release result: FAIL

Independent verification for work order `winter-ride-window-verify-1` tested
candidate `10eb39a89659aed4d0e5bf506671b8a582c11155` and
<https://winter-ride-window.sociobot.in> on 2026-08-28 UTC.

The live site is healthy and byte-for-byte matches the candidate production
build, so the previously reported deployment-only concern is resolved. The
candidate is not releasable:

- **High — WRW-001:** failed place lookup text is placed into `innerHTML`
  without encoding. A harmless marker is created as a real result element, and
  a neutral event canary executes in the page origin. The live bundle is the
  same affected bundle and responses have no Content-Security-Policy.
- **Medium — WRW-002:** a populated result at 390 px expands document width to
  841 px because closed hourly detail panels extend outside the scroll strip.
- **Medium — WRW-003:** live responses have no CSP or frame restriction.
- **Medium — WRW-004:** important mobile copy computes at 10.4–15.2 px and the
  header/footer brand link targets are 29 px high, below the supplied baseline.
- **Low — WRW-005:** populated results have one Axe `aria-allowed-role` finding.

Passing evidence: clean `npm ci` (0 vulnerabilities), 5/5 unit tests,
standalone TypeScript check, exact production build, 8/8 repository E2E tests,
0 serious/critical Axe findings, keyboard-only completion, privacy/outbound
request checks, service-worker update/offline reload, and byte equality for the
live shell/assets. Lighthouse mobile was 100/100/100/100 locally and
99/100/100/100 live; live LCP was 1.4 s, TBT 110 ms, CLS 0, and transfer 102 KiB.

Full reproduction steps, hashes, response headers, and severity details are in
`.factory/verification.md`. Fix WRW-001 before release and reverify the full
candidate after deployment.

---

## Original builder handoff (superseded for release decision)

### Builder record: Winter Ride Window build handoff

Work order: `winter-ride-window-build-1`

Completed: 2026-08-28

Artifact: static Vite + TypeScript site; deploy `./dist`

## What was built

- A complete two-minute pre-ride workflow using a broad place, one of the next
  seven days, route wind exposure, expected treatment, trip duration, rider-set
  temperature/wind/gust/precipitation/ice thresholds, and phone reserve.
- Direct browser requests to Open-Meteo geocoding and forecast APIs, with source
  attribution, request time, selected place, timezone, and model limitations.
- An hourly 06:00–22:00 field note sampled every two hours. Every state is
  transparent: within entered limits, contextual check, or crossed limit, with
  all underlying reasons exposed. No safety score or ride/no-ride verdict.
- Daylight-edge checks, a conservative navigation battery estimate, and a
  route-specific “unknowns to observe” checklist.
- First-class empty, loading, no-place/error, and offline states with recovery
  actions and focus management.
- Optional local-only preference storage; place text and forecasts are never
  stored. Dedicated `/privacy` and `/terms` routes, no analytics or cookies.
- A versioned service worker that precaches the generated app shell and serves
  the explanatory interface offline. New forecasts remain intentionally online.
- Azure Static Web Apps routing/security headers, manifest, icons, robots, and
  sitemap.
- A distinctive botanical field-guide system and original generated hero art.
  Source prompt/review/provenance are in `assets/src/`; responsive AVIF, WebP,
  and JPEG files ship from `public/assets/`.

## Verification

Run from a clean clone with Node.js 20+:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Verified locally on 2026-08-28:

- `npm test`: 5/5 Vitest unit tests passed.
- `npm run build`: passed; `dist/index.html` exists at the deploy root.
- Clean-clone reproduction with `npm ci && npm test && npm run build`: passed.
- `npm run test:e2e`: 8/8 Playwright checks passed across desktop Chromium and
  a 390px mobile viewport. These cover the completed planner, offline recovery,
  offline app-shell reload, privacy route, result focus, no serious/critical Axe
  findings, and no console errors.
- Lighthouse 12.8.2 mobile preset against the production preview:
  performance 100, accessibility 100, best practices 100, SEO 100; LCP 1.8 s,
  CLS 0.000, total first-load transfer 103 KiB. INP was not measured because the
  Lighthouse trace contains no interaction; controls are native and browser
  tests complete without delayed handlers.
- Production assets: 24.91 KB JS (9.25 KB gzip), 15.20 KB CSS (4.45 KB gzip),
  35 KB mobile AVIF hero / 67 KB mobile WebP fallback. No bundled fonts.
- Visual review completed at desktop and 390×844. Focus styles, 44px targets,
  single `<h1>`, main landmark, alt text, explicit light background, and reduced
  motion behavior are present.

## Known gaps and honest boundaries

- The first geocoding match is used. Ambiguous place names may need a postcode
  or nearby district; the selected administrative region is shown in results.
- Open-Meteo provides a weather model, not verified route conditions. The app
  cannot know black ice, shade, gritting/ploughing, closures, legal restrictions,
  or street-level wind. These are explicitly presented as unknowns.
- Available dates are limited to the next seven days. A fresh check requires a
  network connection and Open-Meteo availability.
- Battery use is a deliberately rough planning estimate (7%/hour for glances,
  18%/hour for continuous display). Cold battery health and device differences
  remain the rider's check.
- Country-specific winter cycling rules are not inferred.

## Suggested next steps

- During the four-week pilot, ask only whether checks took under two minutes and
  whether completed rides were surprising relative to flagged conditions.
- If place ambiguity appears often, add an accessible choice list while keeping
  exact addresses out of storage.
- Calibrate the battery assumptions from opt-in, aggregate pilot feedback; do
  not add tracking to infer them.
