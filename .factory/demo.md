# Winter Ride Window demo

## Open the sample

Open `/demo` or select **Try it with sample data** on the first screen. The
demo immediately opens a populated Leeds ride check with nine two-hour samples,
daylight context, battery reserve, and route unknowns. The sample is shipped in
the app; it makes no geocoding or forecast request.

## Keep it separate

The persistent banner says **Demo — sample data, nothing is saved**. If a
visitor selects **Remember preferences** while trying the sample, only the
`demo:ride-window-preferences` local-storage key can be written. It never reads
or writes `ride-window-preferences`, the key used by a real check. The stored
demo preferences exclude the place, date, and forecast.

Use **Reset demo** to delete the demo key and restore the shipped sample. Use
**Start for real** to discard demo preferences and open a blank real planner.
The demo never copies data into a real check.

## Verify it

Each public promise has a demo-first Playwright command in
`.factory/claims.json`. Run all of them after `npm ci` and `npm run build`.
