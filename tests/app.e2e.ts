import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const times = Array.from({ length: 168 }, (_, i) => {
  const date = new Date('2026-08-28T00:00:00Z'); date.setUTCHours(i); return date.toISOString().slice(0, 16);
});
const daily = Array.from({ length: 7 }, (_, i) => {
  const date = new Date('2026-08-28T00:00:00Z'); date.setUTCDate(date.getUTCDate() + i); return date.toISOString().slice(0, 10);
});

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/search?**', route => route.fulfill({ json: { results: [{ name: 'Leeds', country_code: 'GB', admin1: 'England', latitude: 53.8, longitude: -1.55 }] } }));
  await page.route('**/v1/forecast?**', route => route.fulfill({ json: {
    timezone: 'Europe/London', timezone_abbreviation: 'BST',
    hourly: { time: times, temperature_2m: times.map((_, i) => i % 24 < 9 ? -6 : 4), apparent_temperature: times.map(() => 1), precipitation_probability: times.map(() => 20), precipitation: times.map(() => 0), snowfall: times.map(() => 0), weather_code: times.map(() => 2), wind_speed_10m: times.map(() => 12), wind_gusts_10m: times.map(() => 22), visibility: times.map(() => 10000) },
    daily: { time: daily, sunrise: daily.map(d => `${d}T06:10`), sunset: daily.map(d => `${d}T19:55`) }, hourly_units: { temperature_2m: '°C' }
  }}));
});

test('planner completes an hourly field check', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByRole('heading', { name: /Friday, August 28/ })).toBeFocused();
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
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Find the winter hours');
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

test('renders unmatched place text as text, without executable result markup', async ({ page }) => {
  await page.unroute('**/v1/search?**');
  await page.route('**/v1/search?**', route => route.fulfill({ json: { results: [] } }));
  const submitted = '<img src="x" onerror="document.body.dataset.qa=executed">';
  await page.goto('/');
  await page.getByLabel('Broad place').fill(submitted);
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await expect(page.getByRole('heading', { name: 'We could not complete this field check.' })).toBeFocused();
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
