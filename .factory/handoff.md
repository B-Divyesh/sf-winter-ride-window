# Winter Ride Window — release handoff

## Release result: PASS

- Implementation SHA: `fb5b20f51fc1563dc51640f9cb3028f07a9ec4c7`
- Deployment: Azure Static Web Apps production resource
  `sf-winter-ride-window`, built from `./dist`
- Live URL: <https://winter-ride-window.sociobot.in>
- Verified: 2026-09-06 UTC

Winter Ride Window is a pre-ride planner for commuter cyclists. A rider enters
a broad place, route exposure, and personal limits; the planner compares those
limits with an hourly forecast and gives daylight, battery, and route-unknown
checks. It does not issue a safety verdict.

## What changed

- Added the one-click `/demo` sandbox. It opens a realistic populated Leeds
  result immediately, keeps a sticky **Demo — sample data, nothing is saved**
  label visible, and provides Reset demo and Start for real actions.
- Demo state uses only `demo:ride-window-preferences`; it neither reads nor
  writes the real preference key. Reset deletes demo state and Start for real
  discards it. The shipped demo makes no provider request.
- Added `.factory/demo.md` and `.factory/claims.json`. Seven public claims each
  map to exactly one outcome-based, demo-first Playwright test.
- Replaced the stale fixed-date browser fixture with a rolling seven-day
  fixture. The full end-to-end command now exercises populated output on the
  current date.
- Added a designed static `404.html`, response override, and known-route
  rewrites. Live unknown URLs now return HTTP 404 with a clear way back.
- Added route titles, canonical updates, heading focus, scroll restoration, and
  a polite route announcement for client-side navigation.
- Strengthened the service worker’s first-visit offline shell behavior. It
  claims the current client and resolves cached shell assets by URL before a
  network request, including browsers that surface offline fetches as 503.
- Updated landing and legal copy to plain words, added a first-screen sample
  action, recorded the copy audit, catalog description, and a 1200×630 social
  crop derived from the original product artwork.
- Fixed the live demo banner’s contrast issue found in final Axe verification.
- Added the required version/build marker to both app and static-404 footers.

## Findings resolved

| Finding | Current disposition | Evidence |
| --- | --- | --- |
| WRW-R1-001: no isolated one-click demo | Resolved | `/demo` renders nine sample slots; banner, reset, Start for real, and isolated storage are covered by `@claim:sample-demo` and `@claim:browser-only-preferences`. |
| WRW-R1-002: no claims inventory | Resolved | `.factory/claims.json` has seven commands; all pass from a final clean checkout. The untestable “About 2 minutes” copy was removed. |
| WRW-R1-003: stale E2E dates | Resolved | Current-date fixture; `npm run test:e2e` passes 38/38 from a clean checkout. |
| WRW-R1-004: no real 404 | Resolved | Live `/does-not-exist` returns HTTP 404, title `Page not found — Winter Ride Window`, and h1 `This page does not exist.` |
| WRW-R1-005: SPA navigation loses focus | Resolved | Live Privacy navigation focuses its h1 and announces `Privacy — Winter Ride Window.` |
| WRW-001 through WRW-005 | Still resolved | Regression coverage retains text-only failed lookup handling, no mobile overflow, CSP/frame protection, 16 px mobile content, 44 px targets, and valid native hourly semantics. |
| WRW2-001 and WRW2-002 | Still resolved | Mobile size checks, bounded request timeout, and cancel recovery remain in the 38 browser checks. |
| Stale independent-helper cache assertion | Resolved | The helper now expects the shipped `winter-ride-window-v7` cache revision. |

## Verification

Final clean checkout: `/tmp/wrw-release-clean-LAEkAS` at implementation SHA.

```sh
npm ci                         # PASS; 0 vulnerabilities
npm test                       # PASS; 8/8
npx tsc --noEmit               # PASS
npm run build                  # PASS; dist/ created
npm run test:e2e               # PASS; 38/38 (desktop + iPhone 13 profile)
npm audit --omit=dev           # PASS; 0 vulnerabilities
```

Every command declared in `.factory/claims.json` passed in that clean checkout:
`sample-demo`, `broad-place-only`, `no-account`,
`browser-only-preferences`, `no-product-proxy`, `offline-explanation`, and
`no-tracking`.

The browser suite covers normal forecast output, invalid and boundary inputs,
offline, provider failure, timeout, cancellation, text-injection safety,
reduced motion, keyboard behavior, mobile 390 px and 200% text, service-worker
reload, route focus, demo isolation, and Axe checks. The final live demo Axe
scan found zero serious/critical issues.

Live HTTPS verification used `verify-url.sh`: HTTP 200, no console/page errors,
one h1, `lang="en"`, main landmark, image alt text, and labelled buttons. Fresh
desktop and phone contexts both identified the job, audience, and sample action
before scrolling; the sample showed nine populated hourly slots and no console
errors. A fresh live Leeds check completed with nine slots and focused its
result heading. Live 404 verification returned HTTP 404.

Local production-preview Lighthouse 13.4.1: Performance 100, Accessibility
100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.8 s, CLS 0. The final build
contains 29,144 B JavaScript (10,580 B gzip), 17,246 B CSS (4,820 B gzip), no
font files, and a 35,148 B mobile AVIF hero.

## Privacy and external dependency

There are no accounts, cookies, analytics, payments, third-party runtime
scripts, or default browser storage. A real forecast sends a broad-place query
directly to Open-Meteo; Winter Ride Window does not receive or proxy it.
Open-Meteo remains the named external dependency for live forecasts. The free
core and demo remain useful if that provider is unavailable, but a new live
forecast cannot be completed offline.

## Run and deploy

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm run preview
```

Deploy `./dist` to the existing `sf-winter-ride-window` Azure Static Web App.
`dist` includes `staticwebapp.config.json`; preserve that deployment
configuration and the single static product deployment.
