# Winter Ride Window — build handoff

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
