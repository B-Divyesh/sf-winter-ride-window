# Winter Ride Window

Winter Ride Window helps commuter cyclists check winter ride hours against
their own limits. It compares an hourly forecast with temperature, wind, gust,
precipitation, ice-check, route exposure, daylight, and phone-battery limits.
The output is a checklist, not a ride/no-ride score or safety advice.

Live site: <https://winter-ride-window.sociobot.in>

## Who it is for

It is for people deciding whether a familiar commute needs more checks in
winter. The planner asks for a town, district, or postcode. It does not ask
for a street address or exact route.

## Try the sample

Open [the sample ride check](https://winter-ride-window.sociobot.in/demo) to
see a populated Leeds result immediately. The demo is isolated from real use.
It uses shipped sample data and makes no forecast request. Its banner lets you
reset the sample or start a real check.

## How it works

1. Enter a broad place, date, route exposure, and expected surface treatment.
2. Set personal forecast limits and a rough phone-battery plan.
3. Inspect two-hour samples, with every crossed value explained in plain text.
4. Review forecast blind spots before deciding: ice, maintenance, closures,
   crosswind, equipment, and local guidance.

Place lookup and forecast data go directly to
[Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Winter Ride Window does not
receive or proxy those requests. Optional preferences use browser storage; the
place and forecast are not stored. There is no account requirement. The sample
flow sets no cookies and makes no third-party request.

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
- `.factory/claims.json` — public claims and their demo-first regression commands.
- `.factory/demo.md` — sample data, isolated storage, and reset behavior.
- `.factory/design.md` — product-specific visual thesis and asset provenance.
- `.factory/handoff.md` — verification results and implementation handoff.

## Product boundaries

This is not live navigation, emergency advice, a source of legal or road-status
claims, or a promise that a ride is safe. Forecast models cannot confirm black
ice, path treatment, closures, or street-level wind. Check current
observations, official warnings, equipment, skill, and local rules.

## License

Code and hand-authored assets are available under the [MIT License](LICENSE).
The generated illustration is original to this product; its prompt and review
record are included in `assets/src/`.
