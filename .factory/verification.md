# Winter Ride Window — independent product verification

**Result: FAIL**

- Work order: `winter-ride-window-verify-1`
- Candidate tested: `10eb39a89659aed4d0e5bf506671b8a582c11155`
- Live URL tested: <https://winter-ride-window.sociobot.in>
- Verification date: 2026-08-28 UTC
- Artifact: static Vite + TypeScript web app/PWA

The live deployment is available and byte-for-byte matches the candidate's
production output. The release fails because failed place lookups interpret
submitted markup as page HTML. The live bundle is the same bundle that shows
this behavior locally. Mobile result pages also gain substantial horizontal
overflow, and important mobile text and two brand-link targets fall below the
supplied design/accessibility baseline.

## Clean-checkout quality gates

All commands ran in a separate detached worktree at the exact candidate commit;
the existing working tree and its untracked QA helper were not used as the
build source.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 96 packages installed; 0 vulnerabilities; 3.494 s |
| `npm test` | PASS | Vitest 3.2.7, 5/5 tests, 1/1 file |
| `npx tsc --noEmit` | PASS | Exit 0, no diagnostics |
| Lint | N/A | No lint script or lint configuration is present |
| `npm run build` | PASS | Exact command (`tsc && vite build`), exit 0; `dist/` produced |
| `npm run test:e2e` | PASS | Playwright 1.58.2, 8/8 across desktop Chromium and iPhone 13 profile |
| `/opt/fleet/lib/verify-url.sh` | PASS | HTTPS 200, load 692 ms, no console/page errors, title/lang/one h1/main/alt checks passed |

Build output was 24,913 B JavaScript (9,259 B gzip), 15,195 B CSS
(4,472 B gzip), no fonts, and a 35,148 B 720 px AVIF mobile hero. These are
well inside the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB mobile-hero
budgets.

## Independent end-to-end coverage

### Normal and boundary cases

- A mocked Leeds forecast and a live Leeds/Open-Meteo request both completed.
  Results showed nine two-hour samples, source/age/timezone context, explicit
  crossed-limit reasons, daylight, battery reserve, route unknowns, and the
  non-recommendation language. Result focus moved to the result heading.
- Values exactly on the configured extrema were accepted and not described as
  crossed: -30 °C, 5 km/h wind, 10 km/h gust, 0% precipitation, and a 1%
  battery. The battery estimate stopped at 0%.
- Maximum form values also completed: 360 minutes, 15 °C, 80 km/h wind,
  120 km/h gust, 100% precipitation, 10 °C ice check, and 100% battery.
- Blank and one-character places, a 9-minute trip, 101% battery, and a gust
  limit below the steady-wind limit were rejected before forecast retrieval.
  Focus went to the invalid control or explanatory alert. No Open-Meteo
  request was made for these cases.
- No geocoding match, forecast HTTP 503, and browser-offline submission showed
  actionable recovery text and moved focus to the error heading. “Return to
  the form” restored submit focus.

### Keyboard, responsive behavior, and accessibility

- Keyboard-only traversal reached the skip link, navigation, every form group,
  remember control, and submit button. ArrowRight changed the native radio
  choice, Enter submitted, Enter opened an hourly disclosure, and focus moved
  to results. The submit focus ring measured 3 px solid `rgb(157, 63, 44)`.
- Desktop 1440×900, mobile 390×844, and 200% text-size views were inspected.
  The empty/home mobile page had no horizontal overflow and preserved all
  content. The populated mobile defect is recorded below.
- Axe scans of local home, populated results, and mobile home plus live home,
  populated results, privacy, and terms found 0 serious/critical findings.
  Populated results had one minor `aria-allowed-role` finding.
- Semantics passed: `lang="en"`, descriptive title, exactly one h1 per route,
  main landmark, meaningful hero alt text, labelled native controls, live/error
  regions, and a visible skip link.
- Reduced motion computed to 0.01 ms transitions/animations and one iteration;
  no looping motion remained.

### Privacy, network, and PWA

- Default use set no cookies and no local storage. Opt-in preferences stored
  route character, limits, duration, battery, and screen use only; place and
  date were absent. Unchecking “Remember preferences” removed the record.
- Browser request capture showed only the site origin and the documented
  `geocoding-api.open-meteo.com` and `api.open-meteo.com` hosts. There were no
  analytics, advertising, CDN font, or third-party script requests.
- Direct `/privacy` and `/terms` navigation returned 200 and rendered the
  correct single-h1 pages.
- The service worker activated at the site scope, `registration.update()`
  completed with no waiting worker, cache `winter-ride-window-v1` existed, and
  an offline reload restored the app shell. A new offline forecast correctly
  remained unavailable.

### Performance and response policy

Lighthouse 13.4.1 mobile results:

| Target | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Local production preview | 100 | 100 | 100 | 100 | 0.9 s | 1.7 s | 0 ms | 0 | 103 KiB |
| Live deployment | 99 | 100 | 100 | 100 | 0.9 s | 1.4 s | 110 ms | 0 | 102 KiB |

INP is not emitted by a navigation-only Lighthouse run. A local Event Timing
run covering four form/result interactions produced a 48 ms INP candidate
(other interaction durations: 24, 24, and 16 ms), below the 200 ms budget.

Live HTML used `public, must-revalidate, max-age=30`; hashed JS/CSS used
`public, max-age=31536000, immutable`; `/sw.js` used `no-cache`. HTTPS responses
included HSTS, `nosniff`, strict-origin referrer policy, and denied
geolocation/camera/microphone. They did not include Content-Security-Policy or
a frame-embedding restriction; see WRW-001 and WRW-003.

## Candidate/live identity

The fetched live index, generated JS, CSS, service worker, manifest, six hero
derivatives, favicon, robots file, and sitemap all compared byte-for-byte equal
to the clean candidate build. Representative SHA-256 values:

- `index.html`: `d2e7f0d387e2f0886488939a0f7bc198ce6929d7e8976b9a867d80179391a9a4`
- `assets/index-Dcm1a1--.js`: `904e3cd29b31b5fb2e20a385b3218219cb555c6dc5fd7b1229f9834d94cd40f1`
- `assets/index-B2V9Q8FJ.css`: `04de0707c1459dbcb8090c3e139b573974fc31b42a23e8ce92cba822423111ee`
- `sw.js`: `b67bffb4afa89467677823b8c682f65aa18291437cc21dd0a4f02336b96363c7`
- `manifest.webmanifest`: `46d59ff38abf2886ba8e0fc1b1dcf8b54408af58b4229ca471c894b7c76438ab`

This resolves the previously reported deployment-only concern: a current,
matching deployment exists. It does not change the product-quality FAIL.

## Defects

### WRW-001 — High — Failed-lookup place text is interpreted as HTML

1. Open the production build.
2. Submit a syntactically valid place value containing a harmless marker
   element while the geocoder returns no matches.
3. Inspect the failed-check result.

Expected: the submitted value appears only as text in the error message.

Actual: the marker becomes a real descendant of `#results`. A neutral canary
using an image error handler also set `document.body.dataset.qa` to `"1"`,
confirming browser code execution in the page origin. The flow is
`src/main.ts:195` (message includes `prefs.place`) → `src/main.ts:209` →
`src/main.ts:225` (`innerHTML`). The live JavaScript is byte-identical to this
build and no Content-Security-Policy limits inline handlers.

Impact: malformed or pasted place text can change the result DOM and run code
in a safety-adjacent planning page. Encode the dynamic message or construct it
with text nodes, and add a restrictive CSP as defense in depth.

### WRW-002 — Medium — Populated 390 px results create page-level horizontal overflow

Expected: the nine hourly samples scroll only inside their labelled horizontal
strip; the document remains 390 CSS px wide.

Actual: after a successful result, `document.documentElement.scrollWidth` is
841 while `clientWidth` is 390. Closed `.hour-detail` descendants retain
350 px boxes positioned as far as x=808–1158 inside the horizontally laid-out
cards, expanding the document beyond the viewport. The whole page can pan into
blank space. A direct touchscreen tap and keyboard Enter still opened the first
sample, but Playwright's ordinary pointer action could not stabilize because
the page shifted horizontally.

Contain the closed detail panels within the strip/viewport and repeat the
populated-result check at 390 px and 200% text size.

### WRW-003 — Medium — Browser policy lacks CSP and frame restriction

Expected: a static product that renders dynamic forecast/error content sends a
restrictive Content-Security-Policy and prevents unauthorized framing.

Actual: root and asset responses have useful HSTS, referrer, permissions, and
MIME-sniffing policies but no `Content-Security-Policy`, no CSP
`frame-ancestors`, and no `X-Frame-Options`. This materially increases the
impact of WRW-001.

### WRW-004 — Medium — Mobile text and brand targets miss the supplied baseline

At 390 px, meaningful labels/help copy compute between 10.4 and 15.2 px:
form labels are 14.4 px, form help is 12.16 px, route-choice help is 13.33 px,
and the plate label is 10.4 px. The supplied design principles require body
text of at least 16 px on web and 17 pt on mobile. Header and footer brand links
also measure 29 px high rather than the required 44 px target. Other primary
buttons, controls, navigation, radio-label surfaces, and footer links meet or
exceed 44 px.

### WRW-005 — Low — Populated hourly details have a minor ARIA role finding

Axe reports `aria-allowed-role` on populated results because each native
`details` element is assigned `role="listitem"`. Serious/critical Axe findings
remain zero. Use list semantics that are valid for the chosen native elements.

## Release decision

**FAIL. Do not promote candidate `10eb39a89659aed4d0e5bf506671b8a582c11155`.**

Reverify WRW-001 first, then the populated 390 px layout and response policy.
Rerun the clean install, unit/type/build/e2e gates, live identity comparison,
Axe populated-state scan, offline/update flow, and Lighthouse after a corrected
candidate is deployed.
