import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const qaRoot = process.env.QA_ROOT;
if (!qaRoot) throw new Error('QA_ROOT is required');
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [qaRoot] }));
const AxeBuilder = require(require.resolve('@axe-core/playwright', { paths: [qaRoot] })).default;

const localURL = 'http://127.0.0.1:4173';
const liveURL = 'https://winter-ride-window.sociobot.in';
const results = { checks: [], observations: {}, errors: [] };
const check = (condition, label, detail = '') => {
  results.checks.push({ label, pass: Boolean(condition), detail });
  if (!condition) results.errors.push(`${label}${detail ? `: ${detail}` : ''}`);
};

function forecastFor(dates, overrides = {}) {
  const times = dates.flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`));
  const value = (key, fallback) => times.map((_, index) => typeof overrides[key] === 'function' ? overrides[key](index) : (overrides[key] ?? fallback));
  return {
    timezone: 'Europe/London', timezone_abbreviation: 'GMT',
    hourly: {
      time: times,
      temperature_2m: value('temperature', 4), apparent_temperature: value('feelsLike', 1),
      precipitation_probability: value('precipitationProbability', 10), precipitation: value('precipitation', 0),
      snowfall: value('snowfall', 0), weather_code: value('weatherCode', 2),
      wind_speed_10m: value('wind', 12), wind_gusts_10m: value('gust', 22), visibility: value('visibility', 10000)
    },
    daily: { time: dates, sunrise: dates.map(d => `${d}T08:00`), sunset: dates.map(d => `${d}T16:00`) },
    hourly_units: { temperature_2m: '°C' }
  };
}

async function axe(page, label) {
  const scan = await new AxeBuilder({ page }).analyze();
  const severe = scan.violations.filter(v => ['serious', 'critical'].includes(v.impact));
  results.observations[`axe:${label}`] = { severe: severe.map(v => v.id), all: scan.violations.map(v => `${v.impact}:${v.id}`) };
  check(severe.length === 0, `${label}: no serious/critical axe violations`, severe.map(v => v.id).join(', '));
}

async function mockWeather(page, state) {
  await page.route('https://geocoding-api.open-meteo.com/**', route => {
    if (state.geo === 'none') return route.fulfill({ json: { results: [] } });
    if (state.geo === 'error') return route.fulfill({ status: 503, body: 'unavailable' });
    return route.fulfill({ json: { results: [{ name: 'Leeds', country_code: 'GB', admin1: 'England', latitude: 53.8, longitude: -1.55 }] } });
  });
  await page.route('https://api.open-meteo.com/**', route => {
    if (state.forecast === 'error') return route.fulfill({ status: 503, body: 'unavailable' });
    return route.fulfill({ json: forecastFor(state.dates, state.overrides || {}) });
  });
}

async function desktopLocal(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const state = { dates: [], overrides: {} };
  await mockWeather(page, state);
  await page.goto(localURL, { waitUntil: 'networkidle' });
  state.dates = await page.locator('select[name=date] option').evaluateAll(options => options.map(option => option.value));
  check(await page.locator('html').getAttribute('lang') === 'en', 'local desktop: html language');
  check((await page.locator('h1').count()) === 1, 'local desktop: exactly one h1');
  check((await page.locator('main').count()) === 1, 'local desktop: main landmark');
  check((await page.title()).includes('Winter Ride Window'), 'local desktop: descriptive title');
  const image = page.locator('.hero-plate img');
  check((await image.getAttribute('alt')).length > 20, 'local desktop: meaningful hero alt');
  check(await image.evaluate(img => img.complete && img.naturalWidth > 0), 'local desktop: hero image decodes');
  results.observations.localHeroCurrentSrc = await image.evaluate(img => img.currentSrc);
  await axe(page, 'local home desktop');
  await page.screenshot({ path: '/tmp/wrw-local-desktop.png', fullPage: true });

  await page.keyboard.press('Tab');
  check(await page.locator('.skip-link').evaluate(el => el === document.activeElement), 'keyboard: skip link is first focus target');
  const focusStyle = await page.locator('.skip-link').evaluate(el => { const s = getComputedStyle(el); return { outlineWidth: s.outlineWidth, outlineStyle: s.outlineStyle, top: el.getBoundingClientRect().top }; });
  check(focusStyle.outlineStyle !== 'none' && parseFloat(focusStyle.outlineWidth) >= 3 && focusStyle.top >= 0, 'keyboard: focus indicator is visible', JSON.stringify(focusStyle));
  await page.keyboard.press('Enter');
  const skipLanding = await page.evaluate(() => ({ active: document.activeElement?.tagName, scrollY, targetTop: document.querySelector('main')?.getBoundingClientRect().top }));
  await page.keyboard.press('Tab');
  const skipNextInsideMain = await page.evaluate(() => document.querySelector('main')?.contains(document.activeElement));
  results.observations.skipLinkLanding = { ...skipLanding, nextFocusInsideMain: skipNextInsideMain };
  check(Boolean(skipNextInsideMain), 'keyboard: skip link bypasses header and places next focus in main', JSON.stringify(results.observations.skipLinkLanding));
  const focusChain = [];
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const item = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, id: el?.id, name: el?.getAttribute('name'), text: el?.textContent?.trim().slice(0, 45) };
    });
    focusChain.push(item);
    if (item.tag === 'BUTTON' && item.text?.includes('Check the ride window')) break;
  }
  results.observations.keyboardFocusChain = focusChain;
  check(focusChain.some(item => item.name === 'place') && focusChain.some(item => item.name === 'remember') && focusChain.some(item => item.tag === 'BUTTON'), 'keyboard: sequential focus reaches all form groups and submit');

  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByLabel('Remember preferences').check();
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await page.getByRole('heading', { name: new RegExp('August|September') }).waitFor();
  check(await page.locator('#results-title').evaluate(el => el === document.activeElement), 'result: heading receives focus');
  check((await page.locator('.hour-card').count()) === 9, 'result: nine two-hour samples rendered');
  check(await page.getByText('The forecast cannot see the path.').isVisible(), 'result: route unknowns shown');
  check(await page.getByText(/This is not a recommendation to ride/).isVisible(), 'result: no safety verdict disclaimer');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ride-window-preferences')));
  check(stored && !('place' in stored) && !('date' in stored), 'privacy: remembered preferences omit place and date', JSON.stringify(stored));
  await page.locator('.hour-card summary').first().focus();
  await page.keyboard.press('Enter');
  check(await page.locator('.hour-card').first().getAttribute('open') !== null, 'keyboard: native hourly disclosure opens with Enter');
  await axe(page, 'local populated result desktop');
  await page.locator('#results').screenshot({ path: '/tmp/wrw-local-result.png' });
  await page.getByLabel('Remember preferences').uncheck();
  await page.getByRole('button', { name: /Check the ride window again/ }).click();
  await page.getByText('The forecast cannot see the path.').waitFor();
  check(await page.evaluate(() => localStorage.getItem('ride-window-preferences')) === null, 'privacy: unchecking remember clears preferences');

  const externalHosts = [...new Set(requests.map(url => new URL(url).hostname).filter(host => host !== '127.0.0.1'))].sort();
  results.observations.localExternalHosts = externalHosts;
  check(externalHosts.join(',') === 'api.open-meteo.com,geocoding-api.open-meteo.com', 'privacy: only documented Open-Meteo hosts contacted', externalHosts.join(','));
  check(consoleErrors.length === 0, 'local desktop: no console errors', consoleErrors.join(' | '));
  check(pageErrors.length === 0, 'local desktop: no uncaught page errors', pageErrors.join(' | '));
  await context.close();
}

async function invalidAndBoundaries(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const external = [];
  page.on('request', request => { if (!request.url().startsWith(localURL)) external.push(request.url()); });
  const state = { dates: [], geo: 'ok', overrides: {} };
  await mockWeather(page, state);
  await page.goto(localURL);
  state.dates = await page.locator('select[name=date] option').evaluateAll(options => options.map(option => option.value));
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  check(await page.getByLabel('Broad place').evaluate(el => el === document.activeElement), 'invalid: blank place receives focus');
  await page.getByLabel('Broad place').fill('x');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  check(await page.getByLabel('Broad place').evaluate(el => el === document.activeElement), 'invalid: one-character place rejected');
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByLabel('Round-trip duration').fill('9');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  check(await page.getByLabel('Round-trip duration').evaluate(el => el === document.activeElement), 'invalid: below-minimum trip rejected');
  await page.getByLabel('Round-trip duration').fill('10');
  await page.getByLabel('Maximum steady wind').fill('30');
  await page.getByLabel('Maximum gust').fill('20');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  check(await page.getByRole('alert').getByText(/maximum gust equal to or higher/).isVisible(), 'invalid: inconsistent wind limits explained');
  check(external.length === 0, 'invalid: no forecast request before valid submission', `${external.length} requests`);
  await page.getByLabel('Maximum gust').fill('30');
  state.geo = 'none';
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  check(await page.getByRole('heading', { name: 'We could not complete this field check.' }).evaluate(el => el === document.activeElement), 'recovery: no-match error heading receives focus');
  check(await page.getByText(/Try a nearby town or postcode/).isVisible(), 'recovery: no-match gives actionable guidance');
  await page.getByRole('button', { name: 'Return to the form' }).click();
  check(await page.getByRole('button', { name: /Check the ride window again/ }).evaluate(el => el === document.activeElement), 'recovery: return action restores submit focus');

  await page.getByLabel('Broad place').fill('<img src="x" onerror="document.body.dataset.xss=executed">');
  await page.getByRole('button', { name: /Check the ride window again/ }).click();
  await page.waitForTimeout(500);
  const xss = await page.evaluate(() => ({ marker: document.body.dataset.xss || '', injectedImages: document.querySelectorAll('#results img').length, containsHandlerMarkup: document.querySelector('#results')?.innerHTML.includes('onerror') }));
  results.observations.untrustedPlaceMarkup = xss;
  check(xss.marker !== 'executed' && xss.injectedImages === 0 && !xss.containsHandlerMarkup, 'security: unmatched place is rendered as text, not executable markup', JSON.stringify(xss));

  state.geo = 'ok';
  state.overrides = { temperature: -30, feelsLike: -30, wind: 5, gust: 10, precipitationProbability: 0 };
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByLabel('Minimum air temperature').fill('-30');
  await page.getByLabel('Maximum steady wind').fill('5');
  await page.getByLabel('Maximum gust').fill('10');
  await page.getByLabel('Maximum rain/snow chance').fill('0');
  await page.getByLabel('Check for ice at or below').fill('-10');
  await page.getByLabel('Battery at departure').fill('1');
  await page.getByRole('button', { name: /Check the ride window again/ }).click();
  await page.getByText('The forecast cannot see the path.').waitFor();
  check(await page.getByText(/0 outside limits/).isVisible(), 'boundary: values equal to entered extrema are not treated as crossed');
  check(await page.getByText(/About 0% after the trip/).isVisible(), 'boundary: battery estimate clamps at zero');
  await context.close();
}

async function mobileAndMotion(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto(localURL, { waitUntil: 'networkidle' });
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(widths.scroll <= widths.client, 'mobile 390px: no page-level horizontal overflow', JSON.stringify(widths));
  const targets = await page.locator('a, button, input, select, summary').evaluateAll(elements => elements.filter(el => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
  }).map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName, name: el.getAttribute('aria-label') || el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 50) || el.getAttribute('name'), width: r.width, height: r.height, inline: getComputedStyle(el).display === 'inline' }; }));
  results.observations.mobileTargetsUnder44 = targets.filter(t => !t.inline && (t.width < 44 || t.height < 44));
  await page.screenshot({ path: '/tmp/wrw-local-mobile.png', fullPage: true });
  await axe(page, 'local home mobile 390');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  const resized = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(resized.scroll <= resized.client, 'mobile 390px at 200% text: no page-level overflow', JSON.stringify(resized));
  await page.screenshot({ path: '/tmp/wrw-local-mobile-200-text.png', fullPage: true });
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const rp = await reduced.newPage();
  const state = { dates: [], overrides: {} };
  await mockWeather(rp, state);
  await rp.goto(localURL);
  state.dates = await rp.locator('select[name=date] option').evaluateAll(options => options.map(option => option.value));
  const motion = await rp.locator('.button').first().evaluate(el => { const s = getComputedStyle(el); return { transitionDuration: s.transitionDuration, animationDuration: s.animationDuration, iterations: s.animationIterationCount }; });
  results.observations.reducedMotion = motion;
  check(parseFloat(motion.transitionDuration) <= 0.001, 'reduced motion: transitions effectively disabled', JSON.stringify(motion));
  await reduced.close();
}

async function live(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.goto(liveURL, { waitUntil: 'networkidle' });
  await axe(page, 'live home desktop');
  const liveImage = page.locator('.hero-plate img');
  check(await liveImage.evaluate(img => img.complete && img.naturalWidth > 0), 'live: responsive hero decodes');
  results.observations.liveHeroCurrentSrc = await liveImage.evaluate(img => img.currentSrc);
  await page.getByLabel('Broad place').fill('Leeds');
  await page.getByRole('button', { name: 'Check the ride window' }).click();
  await page.getByText('The forecast cannot see the path.').waitFor({ timeout: 60000 });
  check(await page.locator('#results-title').evaluate(el => el === document.activeElement), 'live: real forecast completes and result receives focus');
  await axe(page, 'live populated result');
  const cookies = await context.cookies();
  check(cookies.length === 0, 'privacy: live sets no cookies', JSON.stringify(cookies));
  check(await page.evaluate(() => localStorage.length) === 0, 'privacy: live default flow stores no localStorage');
  const externalHosts = [...new Set(requests.map(url => new URL(url).hostname).filter(host => host !== 'winter-ride-window.sociobot.in'))].sort();
  results.observations.liveExternalHosts = externalHosts;
  check(externalHosts.every(host => ['api.open-meteo.com', 'geocoding-api.open-meteo.com'].includes(host)), 'privacy: live outbound requests limited to documented provider', externalHosts.join(','));

  await page.goto(`${liveURL}/privacy`, { waitUntil: 'networkidle' });
  check((await page.locator('h1').count()) === 1 && await page.getByRole('heading', { name: 'Your route is not our record.' }).isVisible(), 'live: direct /privacy route works');
  await axe(page, 'live privacy');
  await page.goto(`${liveURL}/terms`, { waitUntil: 'networkidle' });
  check((await page.locator('h1').count()) === 1 && await page.getByRole('heading', { name: 'A planning aid, not a safety verdict.' }).isVisible(), 'live: direct /terms route works');
  await axe(page, 'live terms');

  await page.goto(liveURL, { waitUntil: 'networkidle' });
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    await reg.update();
    const keys = await caches.keys();
    return { scope: reg.scope, active: reg.active?.state, waiting: reg.waiting?.state || null, installing: reg.installing?.state || null, keys };
  });
  results.observations.serviceWorker = sw;
  check(sw.active === 'activated' && sw.keys.includes('winter-ride-window-v1'), 'PWA: service worker is active and versioned cache exists', JSON.stringify(sw));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  check(await page.getByRole('heading', { level: 1 }).isVisible(), 'PWA: offline shell reload succeeds');
  await context.setOffline(false);
  check(consoleErrors.length === 0, 'live: no console errors', consoleErrors.join(' | '));
  check(pageErrors.length === 0, 'live: no uncaught page errors', pageErrors.join(' | '));
  await context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mobile.newPage();
  await mp.goto(liveURL, { waitUntil: 'networkidle' });
  const widths = await mp.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  check(widths.scroll <= widths.client, 'live mobile 390px: no horizontal overflow', JSON.stringify(widths));
  await mp.screenshot({ path: '/tmp/wrw-live-mobile.png', fullPage: true });
  await mobile.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await desktopLocal(browser);
  await invalidAndBoundaries(browser);
  await mobileAndMotion(browser);
  await live(browser);
} finally {
  await browser.close();
}
await writeFile('/tmp/wrw-independent-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({ passed: results.checks.filter(c => c.pass).length, failed: results.errors.length, errors: results.errors, observations: results.observations }, null, 2));
if (results.errors.length) process.exitCode = 2;
