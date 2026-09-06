# Pre-ride planning checklist review

**VERDICT: FAIL**

- Work order: `winter-ride-window-review-1`
- Reviewed on: 2026-09-06 UTC
- Live URL: <https://winter-ride-window.sociobot.in>
- Implementation candidate: `8937b4456999fe1361a2d08d7d3810105240b2b1` (`fix: bound forecast recovery and mobile type`)
- Documentation head: `087b819cbfce80572eb7341a6443fd841e40f390` (`docs: record independent verification 3`)
- Finding count: **5**
- Untested public-claim count: **6**

The product helps commuter cyclists compare an hourly winter forecast with their own route exposure and limits. It is for a rider deciding whether a familiar commute is reasonably rideable in winter. On fresh desktop and iPhone 13 contexts, before scrolling, the first action is **“Make a field check”**. A live Leeds check completed on a retry and showed nine two-hour samples, crossed-limit explanations, daylight, battery reserve, forecast source and uncertainty, and no ride-safety verdict.

The implementation itself is the live artifact: a fresh `npm run build` and the 15 served files matched production byte-for-byte. `staticwebapp.config.json` correctly returns HTTP 404 because it is deployment configuration, not a served file.

## Findings

### WRW-R1-001 — High — There is no one-click demo sandbox

The landing page has no visible “Try it with sample data” control. Neither `/demo` nor `/?demo=1` enters a sample experience: both return the ordinary blank planner. No persistent “Demo — sample data, nothing is saved” label, Reset demo action, Start for real action, isolated demo storage namespace, or `.factory/demo.md` exists.

This prevents a visitor from seeing a populated, realistic result without entering a location and making a live third-party request. It also makes it impossible to verify that demo activity cannot touch real data. This fails the demo-sandbox contract and the work-order instruction to enter and reset a sample.

### WRW-R1-002 — High — Required claims inventory and claim commands are absent

`.factory/claims.json` does not exist. Therefore there are no declared claim commands to run from a clean checkout and no per-claim demo-sandbox evidence.

Six public claim categories are untested under the required contract:

1. “About 2 minutes.”
2. “Broad place only.”
3. “Nothing sent to us.”
4. “No account.”
5. Optional browser-only remembered preferences that exclude the place and forecast.
6. The service-worker/offline explanation claim in the Privacy page.

Some adjacent unit and browser tests exist, but none are declared by claim ID, are tied to each public statement, or use the required demo entry point. This is an untested-claim failure, not evidence that the statements are false.

### WRW-R1-003 — High — Declared end-to-end quality gate fails on the documented clean setup

After documented `npm ci`, `npm test` passed (7/7) and `npm run build` passed, but `npm run test:e2e` failed. Six failure artifacts were produced: the desktop and mobile instances of:

- `planner completes an hourly field check`;
- `keeps populated mobile results in the viewport and uses valid hourly list semantics`;
- `keeps every meaningful mobile result and supporting label at the 16px floor`.

The test fixture creates forecast dates beginning `2026-08-28`, while the app correctly makes its seven date options from the current day, `2026-09-06`. The fixture therefore reaches “That day is outside this forecast” rather than the intended populated output. The full published command is not green from the documented clean setup, so the quality gate fails even though the product path can work.

### WRW-R1-004 — Medium — Unknown routes render the home page instead of a designed 404

`/does-not-exist` returns HTTP 200, the landing-page title, and the landing h1. There is no `404.html`, route-specific title, or Static Web Apps 404 response override. This is not a deliberate HTTP 404; it is a missing required 404 page and loses the user’s indication that the address is wrong.

### WRW-R1-005 — Medium — Client-side route changes lose keyboard focus and have no route announcement

From the live home page, activating the header Privacy link changes the URL and correct title, but focus becomes `BODY`, not the new page h1. The rendered Privacy page has no `aria-live` route-announcement region. Screen-reader and keyboard users are not placed at, or told about, the new page as required by the routing contract.

## Checks that passed

- Fresh desktop (1440×900) and iPhone 13 (390×844) landing-page loads had the expected title, one h1, main landmark, alt text, no console/page errors, and no page-level horizontal overflow.
- A real Leeds retry completed with current Open-Meteo data. It contacted only the site origin plus `geocoding-api.open-meteo.com` and `api.open-meteo.com`; a fresh default context had no cookies or local storage before or after the check.
- Live mobile populated output had no page-level overflow and sampled meaningful result/supporting text at 16 px. A Playwright Axe scan found zero serious or critical violations on home and populated output. Reduced-motion computed to `0.01 ms` transitions/animations.
- `/privacy` and `/terms` load with their own correct titles and one h1. `robots.txt`, `sitemap.xml`, favicon, manifest, canonical, CSP, frame denial, referrer policy, and permissions policy are present. The CSP restricts connections to the two documented Open-Meteo hosts.
- Service worker `winter-ride-window-v2` was active with no waiting update; after an online visit, a fresh context reloaded the app shell offline.
- `verify-url.sh` passed against live production: HTTP 200, 633 ms load, title/lang/one-h1/main/alt/button checks, and no console/page errors. The requested `npx @axe-core/cli@4.11.0` command was attempted but could not launch because this worker has no Chrome binary for Selenium; the Playwright Axe scan above was completed instead.

## Earlier findings and current disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| WRW-001: submitted markup ran in failed lookup | Repaired | Current focused injection test passed 2/2; dynamic failure message is text-only. |
| WRW-002: populated mobile overflow | Repaired | Live populated result at 390 px: `scrollWidth = clientWidth = 390`. |
| WRW-003: missing CSP/frame restriction | Repaired | Live CSP includes `frame-ancestors 'none'`; `X-Frame-Options: DENY` is present. |
| WRW-004 and WRW2-001: mobile text/brand controls below baseline | Repaired | Live populated result samples computed at 16 px; prior implementation tests target this baseline, though the whole suite currently has the stale-date failure above. |
| WRW-005: invalid ARIA role on native details | Repaired | Current source uses list items around native details and live Axe had no serious/critical issue. |
| WRW2-002: stalled request had no recovery | Repaired | Current source has a 15-second abort and cancel control; focused timeout/cancel tests passed 4/4. |
| Earlier stale v1 helper assertion | Still test-fixture drift, not a product defect | Current service worker and live cache are both `winter-ride-window-v2`. |

## Commands and evidence

```sh
npm ci                         # PASS; 0 vulnerabilities
npm test                       # PASS; 7/7
npm run build                  # PASS; dist/ produced
npm run test:e2e               # FAIL; six stale-date failures described above
/opt/fleet/lib/verify-url.sh https://winter-ride-window.sociobot.in /work/.evidence/review-1-live  # PASS
npx @axe-core/cli@4.11.0 https://winter-ride-window.sociobot.in --exit --timeout 60  # tool blocked: no Chrome binary
```

No `.factory/claims.json` exists, so there were **no declared claim commands** to run. That absence is WRW-R1-002 and accounts for the six untested public claim categories.

## Release decision

**FAIL — do not declare this product PASS.** Add the required isolated sample demo, add a complete claims manifest and passing claim commands, repair the date-independent E2E fixtures, and add an accessible real 404 and route-change focus/announcement behavior. Re-run all declared commands and the demo-only claim checks from a clean checkout.
