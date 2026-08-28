# Winter Ride Window — verification handoff

## Release result: FAIL

Independent verification work order `winter-ride-window-verify-2` tested
candidate `8e0b13f3777734723d34e4216a6bcbd71bf75a3e` and
<https://winter-ride-window.sociobot.in> on 2026-08-28 UTC. Production is live
and every public build artifact matches the candidate byte-for-byte. This is
not a deployment-only failure.

The full evidence is in [`.factory/verification-2.md`](verification-2.md).

## What passed

- Clean `npm ci`; 7/7 Vitest tests; strict TypeScript; exact production build;
  14/14 Playwright desktop/mobile tests; no production dependency audit issues.
- Real and controlled forecast planning, limits, daylight/battery/unknowns,
  invalid values, offline/503/no-match recovery, and the submitted-markup
  security regression.
- Keyboard flow, visible focus, 390 px populated layout, 200% text reflow,
  reduced motion, and steady-state Axe serious/critical scans.
- Default-zero storage/cookies, opt-in preferences excluding place/date,
  Open-Meteo-only outbound requests, privacy/terms, CSP/frame denial, cache
  policy, service-worker update, and offline reload.
- Bundle budgets and Lighthouse: local 100/100/100/100; live 98/100/100/100;
  live LCP 1.4 s, TBT 160 ms, CLS 0; measured interaction candidate 80 ms.

## Release blockers

1. **WRW2-001 (Medium):** meaningful mobile result and supporting copy computes
   from 10.88 to 15.2 px, including forecast values, statuses, uncertainty,
   and the no-recommendation disclaimer. This misses the supplied 16 px body
   floor despite the earlier partial typography repair.
2. **WRW2-002 (Medium):** geocoding and forecast calls have no timeout/cancel
   path. Two live requests remained in the disabled loading state beyond 60
   seconds; recovery occurs only if the browser eventually rejects the fetch.

## Reproduce and reverify

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm run preview
```

At 390×844, populate a result and inspect computed text sizes for `.hour-time`,
hourly wind, `.status`, `.sample-note`, `.specimen-number`, `.plan-grid p`, and
`.source-note p`. For the stalled-provider case, intercept either Open-Meteo
request without fulfilling or rejecting it and confirm the UI times out into a
recoverable error state with submit enabled. After repair, rerun clean gates,
mobile/200% visual checks, populated-state Axe, PWA update/offline reload,
Lighthouse, response headers, and candidate/live byte comparison.

No product code was modified by this verification.
