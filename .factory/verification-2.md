# Winter Ride Window — independent product verification 2

**Result: FAIL**

- Work order: `winter-ride-window-verify-2`
- Candidate tested: `8e0b13f3777734723d34e4216a6bcbd71bf75a3e`
- Live URL tested: <https://winter-ride-window.sociobot.in>
- Verification date: 2026-08-28 UTC
- Artifact: static Vite + TypeScript PWA

The prior release blockers are repaired and the live deployment matches this
candidate byte-for-byte. The planner works through normal, boundary, invalid,
offline, and provider-error cases. This candidate nevertheless fails the full
acceptance contract: important populated-result and supporting copy remains
10.88–14.08 CSS px at the 390 px mobile viewport, below the supplied 16 px
minimum, and a stalled forecast request has no application timeout or cancel
path and can leave the planner busy indefinitely.

## Clean-checkout quality gates

All install, test, type, build, and browser commands ran in a new detached Git
worktree at the exact candidate commit. The source worktree was clean before
the gates ran.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 96 packages installed; 0 vulnerabilities |
| `npm test` | PASS | Vitest 3.2.7; 7/7 tests in 2 files |
| `npx tsc --noEmit` | PASS | Exit 0; no diagnostics |
| Lint | N/A | No lint script or lint configuration exists |
| `npm run build` | PASS | Exact production command `tsc && vite build`; `dist/` produced |
| `npm run test:e2e` | PASS | Playwright 1.58.2; 14/14 tests across desktop Chromium and iPhone 13 profiles |
| `npm audit --omit=dev` | PASS | 0 vulnerabilities |
| `/opt/fleet/lib/verify-url.sh` | PASS | Live HTTPS 200 in 635 ms; title, `lang`, one h1, main, image alt, button labels, and console checks passed |

Production output is 24,989 B JavaScript (9,271 B gzip), 15,494 B CSS
(4,521 B gzip), no font files, and a 35,148 B 720 px AVIF mobile hero. These
are below the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB mobile-hero
budgets.

## Functional and recovery coverage

- A controlled Leeds forecast and a real live Leeds/Open-Meteo request both
  completed. The result contained nine two-hour samples, each transparent
  comparison, source/time context, daylight and battery plans, route unknowns,
  and explicit non-recommendation language. Focus moved to the result heading.
- Values equal to the allowed minima were accepted without being reported as
  crossed; the battery estimate clamped at 0%. The maxima (360 minutes, 15 °C,
  80 km/h wind, 120 km/h gust, 100% precipitation, 10 °C ice point, and 100%
  battery) were accepted, and equal forecast values produced `0 outside
  limits`.
- Blank and one-character places, a 9-minute trip, 101% battery, and a gust
  limit below the steady-wind limit were rejected before forecast retrieval.
  Native-invalid controls received focus and the inconsistent-limit alert was
  explanatory.
- No geocoding match, geocoder/forecast HTTP 503, and browser-offline states
  rendered actionable recovery copy. Error headings received focus and
  “Return to the form” restored submit focus.
- The former markup-injection case was repeated with an image/onerror canary.
  It created no result image, no handler markup, and no execution marker.

## Keyboard, mobile, and accessibility

- Keyboard traversal reached the skip link, navigation, all form groups,
  remember control, and submit. ArrowRight changed the native exposure radio
  to `open`; Enter opened an hourly disclosure. Result and error focus movement
  worked. The submit focus indicator computed as a 3 px solid berry outline
  with a 3 px offset.
- Desktop 1440×900 and 390×844 mobile layouts were visually inspected in empty,
  populated, and open-detail states. Populated mobile results retained a 390 px
  document width, and the 200% text check had no page-level overflow.
- Steady-state Axe scans of local home, populated results, mobile home, live
  home, live populated results, privacy, and terms found 0 serious/critical
  violations. Six rapid controlled scans of the all-outside populated state
  also found none. Two earlier live scans transiently returned only
  `color-contrast` during the dynamic result transition; subsequent live and
  same-data reruns were clean and no persistent failing node was found.
- Semantics passed: `lang="en"`, descriptive titles, one h1 per route, main and
  navigation landmarks, ordered headings, native labelled controls, meaningful
  hero alt text, live/error regions, and a first-focus skip link.
- With `prefers-reduced-motion: reduce`, transition and animation durations
  computed to 0.01 ms and one iteration; there is no looping motion.
- The supplied mobile typography baseline does not pass; see WRW2-001.

## Privacy, network, policy, and PWA

- Default use created no cookies or local storage. Opt-in storage contained
  route character, duration, thresholds, battery, and screen-use only; place,
  date, and forecasts were absent. Unchecking the option removed the record.
- Browser capture and a source audit found only the site origin and the
  documented `geocoding-api.open-meteo.com` and `api.open-meteo.com` hosts.
  There are no analytics, ad pixels, CDN fonts, external scripts, accounts, or
  payments.
- Direct `/privacy` and `/terms` requests returned 200 and rendered their own
  correctly titled, single-h1 pages. README and MIT LICENSE satisfy the
  repository documentation contract; the visual thesis records palette,
  typography, spacing, motion, single-theme rationale, and asset provenance.
- The live service worker activated at site scope, `registration.update()`
  completed with no waiting worker, versioned cache `winter-ride-window-v1`
  existed, and online-then-offline reload restored the app shell and hero in a
  fresh persistent browser profile. A new offline forecast correctly remained
  unavailable.
- Live HTML sends `public, must-revalidate, max-age=30`; hashed JS/CSS send
  `public, max-age=31536000, immutable`; `/sw.js` sends `no-cache`. Responses
  include HSTS, `nosniff`, `strict-origin-when-cross-origin`, denied
  geolocation/camera/microphone, `X-Frame-Options: DENY`, and a restrictive CSP
  with `frame-ancestors 'none'` and only the two documented forecast hosts in
  `connect-src`.

## Performance

Lighthouse 13.4.1 mobile results:

| Target | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local production preview | 100 | 100 | 100 | 100 | 0.9 s | 1.7 s | 0 ms | 0 | 103 KiB |
| Live deployment | 98 | 100 | 100 | 100 | 0.9 s | 1.4 s | 160 ms | 0 | 103 KiB |

A local Event Timing run across navigation, form controls, submit/result, and
hour-detail interactions produced an 80 ms worst interaction candidate, below
the 200 ms INP budget. Lighthouse navigation does not emit field INP.

## Candidate/live identity

Every public file from the exact clean build—index, hashed JS/CSS and source
map, service worker, manifest, hero derivatives, favicon, robots, and sitemap—
returned HTTP 200 and compared byte-for-byte equal to production.
Representative SHA-256 values:

- `index.html`: `5cafbad3a3bee2773ab69138fcb1f742122096f8f7d00a555cb567700fad1827`
- `assets/index-CZ-4fAoT.js`: `ebf10ca6fa5c9936ae14af434d63f18a2fb36a8dc05b0403d19e0ac51f7e581a`
- `assets/index-D2FEOrgi.css`: `51a04a0a2b487ccd8f5ac2c656dff5074f642b417f8894644d959481e07214ac`
- `sw.js`: `b67bffb4afa89467677823b8c682f65aa18291437cc21dd0a4f02336b96363c7`
- `manifest.webmanifest`: `46d59ff38abf2886ba8e0fc1b1dcf8b54408af58b4229ca471c894b7c76438ab`

This resolves the earlier deployment-only uncertainty: production is present
and is the candidate under test.

## Defects

### WRW2-001 — Medium — Essential mobile copy remains below the supplied type floor

At 390×844, computed sizes for visible, meaningful content include:

- hourly wind values: 10.88 px;
- hourly times, result disclaimer, and specimen labels: 11.2 px;
- result status badges: 11.84 px;
- sample guidance: 12 px;
- forecast source/uncertainty text and link: 12.48 px;
- result request time: 13.6 px;
- daylight, battery, and unknowns body copy: 14.08 px;
- header product name: 15.2 px.

The supplied design/accessibility baseline requires body text of at least 16 px
on web (and a still larger mobile treatment). These are not decorative marks:
they communicate forecast values, status, uncertainty, and the safety
disclaimer. Prior WRW-004 repairs raised selected form/help/plate text, but did
not cover the result and supporting-copy selectors above.

### WRW2-002 — Medium — A stalled forecast request has no bounded recovery

Two fresh live runs remained on “Gathering hourly observations…” for more than
60 seconds when an Open-Meteo request stalled. The submit button stayed disabled
and the page exposed no cancel or retry action. Later runs succeeded, so this is
not a missing deployment. Both requests in `src/main.ts` use bare `fetch(...)`
without an `AbortSignal` or application timeout; the existing `catch` recovery
only runs after the browser/network stack rejects.

Expected: after a bounded wait comfortably inside the two-minute task target,
abort the request, re-enable submit, and show the existing actionable error
state. A user should never need to close or reload the page to recover from a
dependency that neither responds nor rejects.

## Release decision

**FAIL. Do not promote candidate `8e0b13f3777734723d34e4216a6bcbd71bf75a3e`.**

The deployment and all previous security/layout/policy regressions are fixed.
Raise all meaningful mobile result/supporting text to the contract floor and
add bounded request cancellation/recovery, then repeat populated mobile visual
and Axe checks, stalled-provider recovery, clean gates, PWA update/offline, and
live identity comparison.
