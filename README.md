# Winter Ride Window

Winter Ride Window is a fast pre-ride field check for commuter cyclists. It
compares an hourly forecast with the rider's own temperature, wind, gust,
precipitation, ice-check, route-exposure, daylight, and phone-battery limits.
The output is an auditable checklist—not a ride/no-ride score or safety advice.

Live site: <https://winter-ride-window.sociobot.in>

## Who it is for

It is for people deciding whether a familiar commute is reasonably rideable in
winter without turning uncertainty into an all-season ban. The planner asks for
only a town, district, or postcode; it never asks for home/work addresses or an
exact route.

## How it works

1. Enter a broad place, date, route exposure, and expected surface treatment.
2. Set personal forecast limits and a rough phone-battery plan.
3. Inspect two-hour samples, with every crossed value explained in plain text.
4. Review forecast blind spots before deciding: ice, maintenance, closures,
   crosswind, equipment, and local guidance.

Place lookup and forecast data come directly from
[Open-Meteo](https://open-meteo.com/) (CC BY 4.0). No request passes through a
Winter Ride Window server. Optional preferences use browser local storage; the
place and forecast are never saved. There are no accounts, cookies, analytics,
payments, or third-party runtime scripts.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

The production command is exactly `npm run build`; deploy `./dist`, where
`index.html` is generated at the root. Playwright 1.58.2 is pinned. In the
factory worker, browsers are read from `$PLAYWRIGHT_BROWSERS_PATH`.

## Project map

- `src/main.ts` — accessible interface, Open-Meteo requests, result rendering,
  local preference handling, and privacy/terms routes.
- `src/planner.ts` — deterministic limit comparison, daylight, and battery
  calculations.
- `src/styles.css` — botanical field-guide visual system and responsive layout.
- `public/sw.js` — small versioned app-shell cache for offline explanations.
- `tests/` — Vitest logic tests and Playwright desktop/mobile/Axe checks.
- `.factory/design.md` — product-specific visual thesis and asset provenance.
- `.factory/handoff.md` — verification results and implementation handoff.

## Product boundaries

This is not live navigation, emergency advice, a source of legal or road-status
claims, or a promise that a ride is safe. Forecast models cannot confirm black
ice, path treatment, closures, or street-level wind. Riders should check current
observations, official warnings, equipment, skill, and local rules.

## License

Code and hand-authored assets are available under the [MIT License](LICENSE).
The generated illustration is original to this product; its prompt and review
record are included in `assets/src/`.
