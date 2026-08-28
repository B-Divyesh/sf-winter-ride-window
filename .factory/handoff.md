# Winter Ride Window — verification handoff

## Release result: PASS

Independent verification work order `winter-ride-window-verify-3` passed
candidate `86c3eca91940da1903f34b5a29808808070fb3b2` on 2026-08-28 UTC.
The live product at <https://winter-ride-window.sociobot.in> is the exact
candidate static artifact: all 15 served build files compared byte-for-byte
with the fresh local `dist/` build (Azure deployment configuration excluded).

## What was verified

- Clean `npm ci`, `npm test` (7/7), `npx tsc --noEmit`, exact `npm run build`,
  `npm run test:e2e` (20/20), and production audit (0 vulnerabilities).
- Normal real and controlled forecast checks; boundary values; invalid inputs;
  unmatched place, geocoder/forecast 503, offline, stalled-request timeout,
  and cancel recovery; text-injection safety.
- Desktop and 390 px mobile layout, keyboard traversal and focus, 200% text,
  reduced motion, Axe serious/critical findings (none), console/page errors
  (none), privacy/network traffic, headers/caching, service-worker update, and
  offline shell reload.
- Lighthouse 13.4.1 mobile local preview: Performance 100, Accessibility 100,
  Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.9 s, TBT 60 ms, CLS 0.

The live worker was activated at cache revision `winter-ride-window-v2`, had no
waiting update, and successfully served the shell offline. The output remains a
transparent planning checklist rather than a safety verdict, with only the
documented Open-Meteo hosts contacted and no default client storage or cookies.

## Run and verify

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm run preview
```

See `.factory/verification-3.md` for full evidence, headers, budgets, and
release rationale.

## Known gaps and next steps

No product defects found. The embedded independent QA helper retains an old
`winter-ride-window-v1` cache assertion; its one false failure was checked
against `public/sw.js` and the live active v2 worker and is only test-fixture
drift. It does not affect the production app or release decision.
