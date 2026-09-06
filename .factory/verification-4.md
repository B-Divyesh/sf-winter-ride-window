# Check winter ride hours against limits — verification 4

**Verdict: FAIL**

- Work order: `winter-ride-window-verify-4`
- Implementation reviewed: `fb5b20f51fc1563dc51640f9cb3028f07a9ec4c7`
- Documentation reviewed: `f319629fc124ba5fcb6bfe7f3aa577eb69dd7263`
- Live URL: <https://winter-ride-window.sociobot.in>
- Verified: 2026-09-06 UTC
- Finding count: **1**
- Untested public-claim count: **0**

Winter Ride Window helps commuter cyclists compare winter forecast hours with
their own limits. It is for people deciding whether a familiar commute needs
more checks. In fresh desktop and iPhone 13 browser contexts, before scrolling,
the page states that job and audience and makes **Try it with sample data** the
first action. The action opens a realistic nine-sample Leeds check.

## Finding

### WRW4-001 — Medium — A warm browser changes an unknown URL from HTTP 404 to HTTP 200

The production origin returns the designed static 404 with HTTP 404 in a new
browser context. After a visitor has opened `/demo`, waited for the service
worker to control the page, and then opens `/does-not-exist`, the service worker
returns the cached app shell for the failed navigation. The page still has the
right title and heading, but Playwright observes response status **200**.

This fails the required real-404 behavior for an established visitor. It also
makes an unknown URL indistinguishable from a successful application route to
tools that use the browser response. The cause is the non-OK navigation branch
in `public/sw.js`, which substitutes the cached `/` response.

Evidence:

| Browser state | Response | Rendered title and h1 |
| --- | ---: | --- |
| Fresh context, direct `/does-not-exist` | 404 | `Page not found — Winter Ride Window`; `This page does not exist.` |
| Service-worker-controlled context, then `/does-not-exist` | 200 | Same correct title and h1 |

Expected: retain the designed 404 page **and** status 404 after the service
worker is active. This is a product defect, not the deliberate fresh HTTP 404.

## Clean checkout and claim commands

A detached clean worktree at documentation SHA `f319629` received `npm ci`
before the checks. All commands completed successfully.

| Check | Result |
| --- | --- |
| `npm ci` | PASS; 0 vulnerabilities |
| `npm test` | PASS; 8/8 |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS; `dist/` produced |
| `npm run test:e2e` | PASS; 38/38 |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |

All seven commands declared in `.factory/claims.json` passed independently
from the clean checkout (two browser profiles each): `sample-demo`,
`broad-place-only`, `no-account`, `browser-only-preferences`,
`no-product-proxy`, `offline-explanation`, and `no-tracking`.

There are no missing, false, incomplete, or untested public claims. The
privacy, demo, account, broad-place, direct-provider, offline-explanation, and
no-tracking promises on the landing page, Privacy page, and README are covered
by that manifest and its outcome tests.

## Live use and accessibility

- Fresh desktop (1440×900) and iPhone 13 (390 CSS px) contexts showed the h1,
  audience sentence, and sample action before scrolling. The phone page had no
  page-level horizontal overflow. Visual inspection of both renders found the
  stated field-guide layout legible and intact.
- `/demo` opened the already populated Leeds sample with nine hourly slots.
  Its visible sticky label said **Demo — sample data, nothing is saved**. It
  remained visible after scrolling. Enabling remembered preferences wrote only
  the `demo:` key; a pre-seeded real preference was unchanged. Reset cleared
  the demo key and restored the sample. Start for real removed demo state and
  opened an empty broad-place field.
- A fresh live Leeds check completed with nine samples, moved focus to
  `#results-title`, made no console/page errors, and contacted only the site,
  `geocoding-api.open-meteo.com`, and `api.open-meteo.com`.
- Axe on the live populated demo found zero serious or critical issues.
  `verify-url.sh` passed live home: HTTP 200, no console/page errors, title,
  `lang="en"`, one h1, main landmark, image alt text, and labelled buttons.
- Client-side Privacy navigation set `Privacy — Winter Ride Window`, focused
  its h1, and announced the route. Privacy, Terms, Demo, home, and both
  documented Open-Meteo links returned 200. `mailto:` is an explicit contact
  link. Reduced-motion transition and animation durations were `0.01 ms`.
- Local browser tests independently exercised normal output, invalid place and
  limits, equality boundaries, offline/provider failure, timeout, cancellation,
  injection safety, keyboard controls, 200% text, mobile layout, service-worker
  offline reload, focus, and route announcement.

## Live build and previous findings

The local production build matched 18/18 publicly served output files,
including HTML, hashed JS/CSS, map, service worker, static 404, manifest,
images, robots, sitemap, and favicon. `staticwebapp.config.json` deliberately
returned 404 because Azure consumes it as deployment configuration.

All earlier findings are otherwise resolved: the one-click isolated demo,
claims inventory, rolling fixtures, failed-lookup text handling, mobile width
and 16 px floor, valid hourly semantics, response CSP/frame policy, bounded
timeout/cancellation, focus restoration, and fresh network 404 are present and
covered by the passing checks. WRW-R1-004 is only partially resolved: a fresh
unknown URL is a true 404, but the service-worker-controlled path in WRW4-001
regresses that response status.

## Result

**FAIL.** Do not mark implementation `fb5b20f` as accepted until WRW4-001 is
repaired and both fresh and service-worker-controlled unknown-route navigations
return HTTP 404 while retaining the designed 404 page. All declared claims were
tested; the failure is the one medium-severity route-status defect.
