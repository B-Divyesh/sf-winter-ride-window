import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixtureStart = new Date();
fixtureStart.setHours(0, 0, 0, 0);
const daily = Array.from({ length: 7 }, (_, i) => {
  const date = new Date(fixtureStart); date.setDate(fixtureStart.getDate() + i); return date.toISOString().slice(0, 10);
});
const times = daily.flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`));

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/search?**', route => route.fulfill({ json: { results: [{ name: 'Leeds', country_code: 'GB', admin1: 'England', latitude: 53.8, longitude: -1.55 }] } }));
  await page.route('**/v1/forecast?**', route => route.fulfill({ json: {
    timezone: 'Europe/London', timezone_abbreviation: 'BST',
    hourly: { time: times, temperature_2m: times.map((_, i) => i % 24 < 9 ? -6 : 4), apparent_temperature: times.map(() => 1), precipitation_probability: times.map(() => 20), precipitation: times.map(() => 0), snowfall: times.map(() => 0), weather_code: times.map(() => 2), wind_speed_10m: times.map(() => 12), wind_gusts_10m: times.map(() => 22), visibility: times.map(() => 10000) },
    daily: { time: daily, sunrise: daily.map(d => `${d}T06:10`), sunset: daily.map(d => `${d}T19:55`) }, hourly_units: { temperature_2m: '°C' }
  }}));
});

test('planner completes an hourly ride check', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.locator('#results-title')).toBeFocused();
  await expect(page.getByText('The forecast cannot see the path.')).toBeVisible();
  await expect(page.getByText(/Open-Meteo forecast data/)).toBeVisible();
  const results = await new AxeBuilder({ page: page as any }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('explains why a new check is unavailable offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByLabel('Broad place').fill('Leeds');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByRole('heading', { name: 'You appear to be offline.' })).toBeFocused();
  await expect(page.getByText(/Reconnect and try again/)).toBeVisible();
});

test('keeps the explanatory app shell available after losing connection', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(await page.evaluate(() => caches.keys())).toContain('winter-ride-window-v7');
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Check winter ride hours');
  await expect(page.getByRole('main')).toBeVisible();
});

test('home and privacy page have no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  let results = await new AxeBuilder({ page: page as any }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  await page.goto('/privacy');
  results = await new AxeBuilder({ page: page as any }).analyze();
  expect(results.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
});

test('moves focus to the new page heading and announces client-side navigation', async ({ page }) => {
  await page.goto('/');
  await page.locator('header').getByRole('link', { name: 'Privacy' }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page).toHaveTitle('Privacy — Winter Ride Window');
  await expect(page.getByRole('heading', { name: 'See what this planner stores.' })).toBeFocused();
  await expect(page.locator('#route-announcer')).toContainText('Privacy — Winter Ride Window');
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Check winter ride hours against your limits.' })).toBeFocused();
  await expect(page.locator('#route-announcer')).toContainText('Winter Ride Window — check winter rides');
});

test('renders a designed not-found view in the app fallback used by local development', async ({ page }) => {
  await page.goto('/not-a-product-route');
  await expect(page).toHaveTitle('Page not found — Winter Ride Window');
  await expect(page.getByRole('heading', { name: 'This page does not exist.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to the ride planner' })).toHaveAttribute('href', '/');
});

test('renders unmatched place text as text, without executable result markup', async ({ page }) => {
  await page.unroute('**/v1/search?**');
  await page.route('**/v1/search?**', route => route.fulfill({ json: { results: [] } }));
  const submitted = '<img src="x" onerror="document.body.dataset.qa=executed">';
  await page.goto('/');
  await page.getByLabel('Broad place').fill(submitted);
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByRole('heading', { name: 'We could not complete this ride check.' })).toBeFocused();
  await expect(page.locator('#results')).toContainText('No broad place matched. Try a nearby town or postcode.');
  await expect(page.locator('#results img')).toHaveCount(0);
  expect(await page.evaluate(() => ({
    marker: document.body.dataset.qa,
    hasHandlerMarkup: document.querySelector('#results')?.innerHTML.includes('onerror')
  }))).toEqual({ marker: undefined, hasHandlerMarkup: false });
});

test('keeps populated mobile results in the viewport and uses valid hourly list semantics', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByText('The forecast cannot see the path.')).toBeVisible();
  await expect(page.locator('.hour-strip')).toHaveCount(1);
  await expect(page.locator('.hour-strip > li > details.hour-card')).toHaveCount(9);
  expect(await page.locator('.hour-card').evaluateAll(cards => cards.every(card => !card.hasAttribute('role')))).toBe(true);
  expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const scan = await new AxeBuilder({ page: page as any }).analyze();
  expect(scan.violations.filter(v => v.id === 'aria-allowed-role')).toEqual([]);
});

test('keeps every meaningful mobile result and supporting label at the 16px floor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByText('The forecast cannot see the path.')).toBeVisible();
  const sizes = await page.locator([
    '.site-header .brand', '.result-head .eyebrow', '.result-head p:last-child',
    '.least-flags span', '.least-flags small', '.status', '.hour-time',
    '.hour-card summary > span:nth-of-type(3)', '.sample-note', '.plan-grid p',
    '.plan-grid li', '.specimen-number', '.source-note p', '.source-note a'
  ].join(', ')).evaluateAll(elements => elements.map(element => ({
    text: element.textContent?.trim(), size: Number.parseFloat(getComputedStyle(element).fontSize)
  })));
  expect(sizes).not.toEqual([]);
  expect(sizes.filter(({ size }) => size < 16)).toEqual([]);
});

test('gives mobile supporting copy and brand links 44px-or-larger targets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const sizes = await page.locator('.field, .field small, .choice small, .hero-plate figcaption, .hero-plate figcaption span').evaluateAll(elements =>
    elements.map(element => Number.parseFloat(getComputedStyle(element).fontSize))
  );
  expect(sizes.every(size => size >= 16)).toBe(true);
  const targets = await page.locator('.site-header .brand, .footer-brand').evaluateAll(elements =>
    elements.map(element => element.getBoundingClientRect().height)
  );
  expect(targets.every(height => height >= 44)).toBe(true);
});

test('recovers from a stalled forecast request within the application timeout', async ({ page }) => {
  // Keep the regression fast while exercising the production abort path rather
  // than relying on a browser/network timeout.
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout;
    (window as any).setTimeout = (handler: TimerHandler, delay?: number, ...args: any[]) =>
      originalSetTimeout(handler, delay && delay >= 15_000 ? 10 : delay, ...args);
  });
  await page.unroute('**/v1/forecast?**');
  await page.route('**/v1/forecast?**', () => new Promise<void>(() => {}));
  await page.goto('/');
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByRole('heading', { name: 'We could not complete this ride check.' })).toBeFocused();
  await expect(page.getByText(/forecast request took too long/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check the ride window again' })).toBeEnabled();
});

test('lets the rider cancel a stalled forecast request', async ({ page }) => {
  await page.unroute('**/v1/forecast?**');
  await page.route('**/v1/forecast?**', () => new Promise<void>(() => {}));
  await page.goto('/');
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await page.getByRole('button', { name: 'Cancel check' }).click();
  await expect(page.getByRole('heading', { name: 'We could not complete this ride check.' })).toBeFocused();
  await expect(page.getByText(/You cancelled this ride check/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check the ride window again' })).toBeEnabled();
});

test('@claim:sample-demo loads a populated ride check in one click', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Sample data.')).toBeVisible();
  await expect(page.locator('.hour-strip > li > details.hour-card')).toHaveCount(9);
  const scan = await new AxeBuilder({ page: page as any }).analyze();
  expect(scan.violations.filter(v => ['serious', 'critical'].includes(v.impact || ''))).toEqual([]);
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});

test('@claim:broad-place-only accepts a town without asking for a street address', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByLabel('Broad place')).toHaveValue('Leeds');
  await expect(page.locator('input[name="place"]')).toHaveCount(1);
  await expect(page.locator('input[autocomplete="street-address"], input[name*="address" i], input[name*="route" i]')).toHaveCount(0);
  await page.getByLabel('Broad place').fill('York');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByText('Sample data.')).toBeVisible();
});

test('@claim:no-account starts a sample ride check without sign-in or registration', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('input[type="password"], [name*="password" i], [name*="account" i], [name*="login" i]')).toHaveCount(0);
  await expect(page.locator('.hour-card')).toHaveCount(9);
});

test('@claim:browser-only-preferences stores demo preferences separately and excludes place and forecast', async ({ page }) => {
  await page.goto('/demo');
  await page.getByLabel('Remember preferences').check();
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  const storage = await page.evaluate(() => ({
    demo: localStorage.getItem('demo:ride-window-preferences'),
    real: localStorage.getItem('ride-window-preferences')
  }));
  expect(storage.real).toBeNull();
  expect(storage.demo).not.toBeNull();
  const demo = JSON.parse(storage.demo!);
  expect(demo).not.toHaveProperty('place');
  expect(demo).not.toHaveProperty('date');
  expect(JSON.stringify(demo)).not.toContain('forecast');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('demo:ride-window-preferences'))).toBeNull();
  await expect(page.getByText('Sample data.')).toBeVisible();
});

test('@claim:no-product-proxy sends a real forecast directly to the documented provider', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('link', { name: 'Start for real' }).click();
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByText('The forecast cannot see the path.')).toBeVisible();
  const origins = [...new Set(requests.map(url => new URL(url).origin))];
  expect(origins).toEqual(expect.arrayContaining([
    new URL(page.url()).origin,
    'https://geocoding-api.open-meteo.com',
    'https://api.open-meteo.com'
  ]));
  expect(origins).toHaveLength(3);
});

test('@claim:offline-explanation opens from the cached demo shell after a first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/demo');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.locator('header').getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { name: 'See what this planner stores.' })).toBeVisible();
  await expect(page.getByText(/cache the public app shell so this explanation opens offline/i)).toBeVisible();
  await context.close();
});

test('@claim:no-tracking leaves the sample flow without cookies or third-party requests', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/demo');
  await expect(page.locator('.hour-card')).toHaveCount(9);
  expect(await context.cookies()).toEqual([]);
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
});
