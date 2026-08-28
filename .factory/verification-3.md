# Winter Ride Window — independent product verification 3

**Result: PASS**

- Work order: `winter-ride-window-verify-3`
- Candidate tested: `86c3eca91940da1903f34b5a29808808070fb3b2`
- Live URL: <https://winter-ride-window.sociobot.in>
- Verification date: 2026-08-28 UTC
- Artifact: static Vite + TypeScript PWA

This is a fresh verification of the candidate, not a reuse of the preceding
repair report. The live deployment is the exact candidate build (15/15 public
files byte-identical, excluding `staticwebapp.config.json`, which Azure applies
as deployment configuration rather than serving). The product fulfils the
brief as a transparent, non-authoritative pre-ride checklist: a broad location,
route character, personal limits, daylight/battery plan, cited Open-Meteo
forecast data, and route unknowns; it never returns a safety verdict.

## Clean-checkout gates

The initially clean `main` checkout was at the specified SHA. `npm ci` installed
96 packages and reported 0 vulnerabilities.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm test` | PASS | Vitest 3.2.7: 7/7 tests in 2 files |
| `npx tsc --noEmit` | PASS | Exit 0; no diagnostics |
| Lint | N/A | No lint script or lint configuration is present; strict TypeScript is the configured static check |
| `npm run build` | PASS | Exact production command `tsc && vite build`; generated `dist/` |
| `npm run test:e2e` | PASS | Playwright 1.58.2: 20/20 checks on desktop Chromium and iPhone 13 / 390 px profiles |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |

The build contains 25,436 B JavaScript (9,410 B gzip), 15,865 B CSS (4,580 B
gzip), no bundled fonts, and a 35,148 B 720 px AVIF hero. All are inside the
200 KB JS, 50 KB CSS, 120 KB font, and 300 KB mobile-image budgets.

## Product and recovery exercise

- A mocked normal Leeds check and a real production Leeds/Open-Meteo check both
  rendered nine two-hour samples, crossed-limit explanations, daylight,
  battery, forecast source/age context, route unknowns, and the explicit “not
  a recommendation to ride” disclaimer. Result focus moved to `#results-title`.
- Equality boundaries were exercised at the entered temperature/wind/gust/
  precipitation limits: they produced `0 outside limits`; a depleted battery
  estimate clamped to 0%.
- Invalid blank and one-character locations, 9-minute duration, and maximum
  gust below maximum steady wind were rejected before network activity, with
  native focus or an explanatory alert.
- No-place, geocoder 503, forecast 503, offline, cancellation, and a truly
  stalled forecast were exercised. Every error focused its heading, explained
  the next action, and re-enabled the submit action. The production 15-second
  forecast timeout recovered in 17.4 s observed wall time; user cancellation
  recovered in 2.9 s.
- An image/onerror place-string canary remained plain text: no injected result
  image, event-handler markup, or execution marker appeared.

## Accessibility, responsive behaviour, and browser health

- Independent Axe scans found **0 serious or critical violations** on local
  desktop home, local populated results, local 390 px home, live home, live
  populated results, `/privacy`, and `/terms`.
- Keyboard-only traversal reached the first-focus skip link, navigation, each
  form group, remember control, submit, and native hourly disclosure; Enter
  opened the disclosure. The visible focus style is a 3 px berry outline with
  a 3 px offset. Error/result focus restoration was verified above.
- Desktop and 390×844 mobile empty, populated, and open-detail screenshots
  were visually inspected. No page-level overflow occurred at 390 px or at
  200% text size. The committed mobile test confirms all sampled
  result/supporting content and branding controls retain the 16 px floor and
  44 px targets where applicable.
- With `prefers-reduced-motion: reduce`, computed transition and animation
  durations were 0.01 ms and iteration count was 1. No looping animation is
  present.
- The worker `verify-url.sh` passed live HTTPS in 680 ms with no console or
  page errors; it confirmed title, `lang="en"`, one h1, main landmark, image
  alt text, and labelled buttons. Independent local and live browser captures
  likewise had no console or uncaught page errors.

## Privacy, policy, PWA, and deployment identity

- Default production use created no cookies or local storage. Opt-in preference
  storage excludes place, date, and forecast values; unchecking clears it.
- Captured outbound browser traffic was limited to the site and the documented
  `api.open-meteo.com` and `geocoding-api.open-meteo.com` hosts. There are no
  analytics, ads, accounts, payments, CDN fonts, or third-party scripts.
- Direct `/privacy` and `/terms` routes rendered their own title and one h1.
  README, MIT LICENSE, privacy/terms pages, and the visual-thesis/provenance
  documentation are present.
- Live response policy was verified: HSTS, `nosniff`, `DENY` framing,
  `strict-origin-when-cross-origin`, disabled geolocation/camera/microphone,
  and a restrictive CSP whose only external `connect-src` entries are the two
  documented Open-Meteo origins. HTML is `public, must-revalidate, max-age=30`;
  hashed assets are `public, max-age=31536000, immutable`; `/sw.js` is
  `no-cache`.
- The live PWA service worker was `activated`, `registration.update()` left no
  waiting revision, and cache `winter-ride-window-v2` existed. An online then
  offline reload restored the app shell. The v2 cache agrees with both
  `public/sw.js` and the committed E2E test. An older independent helper had a
  stale v1 expectation; its sole failed assertion was therefore test-fixture
  drift, not a product failure.
- Every served output file from the exact local build matched production
  byte-for-byte: `index.html`, hashed JS/CSS/maps, service worker, manifest,
  hero variants, favicon, robots, and sitemap (15 files). Representative
  artifacts: `index.html` 1,311 B; `assets/index-CS6ncma5.js` 25,436 B;
  `assets/index-Bgur7K43.css` 15,865 B; `sw.js` 1,196 B.

## Performance

Local production-preview mobile Lighthouse 13.4.1:

| Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 100 | 100 | 100 | 1.0 s | 1.9 s | 60 ms | 0 | 103 KiB |

This meets the supplied Lighthouse, LCP, CLS, and bundle budgets. Browser
interactions used in functional verification remained responsive; no page
errors occurred.

## Defects

None found. No release-blocking, high, medium, or low product defects are open.

## Release decision

**PASS — candidate `86c3eca91940da1903f34b5a29808808070fb3b2` is fit to
promote.** The live deployment is present and exactly matches the candidate,
resolving the earlier deployment-only uncertainty with fresh evidence.
