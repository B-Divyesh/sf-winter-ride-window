import './styles.css';
import { assessHour, batteryPlan, daylightStatus, describeWeather, type HourConditions, type Preferences, type Exposure, type Surface, type ScreenUse } from './planner.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const routeAnnouncer = document.querySelector<HTMLElement>('#route-announcer')!;
const FORECAST_SOURCE = '<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> forecast data (CC BY 4.0)';
// A forecast check is useful only while it is current. Keep the whole two-step
// provider exchange bounded so a stalled connection never strands the form.
const REQUEST_TIMEOUT_MS = 15_000;
let lastSubmitter: HTMLButtonElement | null = null;

function header() {
  return `<header class="site-header">
    <a class="brand" href="/" data-route aria-label="Winter Ride Window home">
      <span class="brand-mark" aria-hidden="true">⌁</span><span>Winter Ride Window</span>
    </a>
    <nav aria-label="Main navigation"><a href="/#planner">Planner</a><a href="/demo" data-route>Demo</a><a href="/privacy" data-route>Privacy</a></nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><a class="brand footer-brand" href="/" data-route><span class="brand-mark" aria-hidden="true">⌁</span><span>Winter Ride Window</span></a>
      <p>Check a winter cycling forecast against your own limits.</p></div>
    <div class="footer-links"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Forecast source ↗</a></div>
    <p class="art-credit">Original artwork generated for this product · Built by Param Factory · MIT</p>
  </footer>`;
}

function getDates() {
  const dates: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const day = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en', { weekday: 'long' });
    dates.push({ value, label: `${day}, ${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}` });
  }
  return dates;
}

function demoBanner() {
  return `<aside class="demo-banner" aria-label="Demo controls"><p><strong>Demo — sample data, nothing is saved</strong><span>Leeds forecast sample</span></p><div><button type="button" class="demo-control" data-reset-demo>Reset demo</button><a class="demo-control" href="/" data-route data-start-real>Start for real</a></div></aside>`;
}

function homePage(demo = false) {
  const dates = getDates();
  const saved = readSaved(demo);
  const sample = demo ? demoPreferences(dates) : null;
  const initial = sample ? { ...saved, ...sample } : saved;
  app.innerHTML = `${header()}${demo ? demoBanner() : ''}
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span aria-hidden="true">✣</span> Winter commute planner</p>
        <h1 id="hero-title" tabindex="-1">Check winter ride hours against your limits.</h1>
        <p class="hero-lede">For commuter cyclists deciding if a familiar route needs more checks today.</p>
        <div class="hero-actions"><a class="button hero-action" href="/demo" data-route>Try it with sample data <span aria-hidden="true">→</span></a><a class="text-action" href="#planner">Start a ride check <span>Enter a broad place and your limits.</span></a></div>
        <ul class="hero-facts" aria-label="Planner facts"><li>Broad place only</li><li>No account</li><li>Optional preferences stay in this browser</li></ul>
      </div>
      <figure class="hero-plate">
        <picture>
          <source type="image/avif" srcset="/assets/winter-field-guide-720.avif 720w, /assets/winter-field-guide-1100.avif 1100w" sizes="(max-width: 760px) 100vw, 52vw">
          <source type="image/webp" srcset="/assets/winter-field-guide-720.webp 720w, /assets/winter-field-guide-1100.webp 1100w" sizes="(max-width: 760px) 100vw, 52vw">
          <img src="/assets/winter-field-guide-1100.jpg" srcset="/assets/winter-field-guide-720.jpg 720w, /assets/winter-field-guide-1100.jpg 1100w" sizes="(max-width: 760px) 100vw, 52vw" width="1100" height="734" alt="Field-guide illustration of a commuter bicycle beside a frosty path between open ground and spruce trees" fetchpriority="high" decoding="async">
        </picture>
        <figcaption><span>Route factors</span> Open ground, shelter, cold, and light can change a route.</figcaption>
      </figure>
    </section>

    <section id="planner" class="planner-section" aria-labelledby="planner-title">
      <div class="section-intro"><p class="eyebrow">Your ride check</p><h2 id="planner-title">Enter your route and limits.</h2><p>Use a town, district, or postcode. Weather is only one part of a ride decision.</p></div>
      <form id="ride-form" novalidate>
        <div id="form-error" class="form-alert" role="alert" hidden></div>
        <fieldset class="form-section"><legend><span>01</span> Place and day</legend>
          <div class="form-grid two">
            <label class="field"><span>Broad place</span><input id="place" name="place" autocomplete="address-level2" required minlength="2" value="${sample ? sample.place : ''}" placeholder="e.g. Leeds or 10115"><small>We use it only to request a forecast.</small></label>
            <label class="field"><span>Ride day</span><select name="date">${dates.map(d => `<option value="${d.value}" ${d.value === (sample?.date || dates[0].value) ? 'selected' : ''}>${d.label}</option>`).join('')}</select><small>Forecasts are available for the next 7 days.</small></label>
          </div>
        </fieldset>

        <fieldset class="form-section"><legend><span>02</span> Route character</legend>
          <div class="choice-group"><span class="group-label">Wind exposure</span><div class="segmented">
            ${choice('exposure', 'sheltered', 'Sheltered', 'Mostly buildings or trees', initial.exposure === 'sheltered')}
            ${choice('exposure', 'mixed', 'Mixed', 'Some open sections', initial.exposure === 'mixed')}
            ${choice('exposure', 'open', 'Open', 'Fields, bridges, waterfront', initial.exposure === 'open')}
          </div></div>
          <div class="form-grid two lower-grid">
            <label class="field"><span>Expected surface treatment</span><select name="surface">
              <option value="cleared" ${initial.surface === 'cleared' ? 'selected' : ''}>Usually cleared or treated</option>
              <option value="variable" ${initial.surface === 'variable' ? 'selected' : ''}>Varies along the route</option>
              <option value="untreated" ${initial.surface === 'untreated' ? 'selected' : ''}>Mostly untreated or unknown</option>
            </select></label>
            <label class="field"><span>Round-trip duration</span><span class="input-unit"><input name="tripMinutes" type="number" min="10" max="360" step="5" value="${initial.tripMinutes}"><span>min</span></span></label>
          </div>
        </fieldset>

        <fieldset class="form-section"><legend><span>03</span> Your forecast limits</legend>
          <p class="legend-note">A slot is flagged when it crosses one of these values. These are planning preferences, not universal safe limits.</p>
          <div class="limits-grid">
            ${numberField('minTemp', 'Minimum air temperature', initial.minTemp, -30, 15, '°C')}
            ${numberField('maxWind', 'Maximum steady wind', initial.maxWind, 5, 80, 'km/h')}
            ${numberField('maxGust', 'Maximum gust', initial.maxGust, 10, 120, 'km/h')}
            ${numberField('maxPrecip', 'Maximum rain/snow chance', initial.maxPrecip, 0, 100, '%')}
            ${numberField('iceTemp', 'Check for ice at or below', initial.iceTemp, -10, 10, '°C')}
          </div>
        </fieldset>

        <fieldset class="form-section compact"><legend><span>04</span> Phone reserve</legend>
          <div class="form-grid three">
            <label class="field"><span>Battery at departure</span><span class="input-unit"><input name="battery" type="number" min="1" max="100" value="${initial.battery}"><span>%</span></span></label>
            <label class="field"><span>Screen use</span><select name="screenUse"><option value="glance" ${initial.screenUse === 'glance' ? 'selected' : ''}>Occasional map glances</option><option value="continuous" ${initial.screenUse === 'continuous' ? 'selected' : ''}>Screen stays on</option></select></label>
            <label class="check-field"><input type="checkbox" name="remember" ${initial.hasSaved ? 'checked' : ''}><span><strong>Remember preferences</strong><small>Limits only, in this browser. Never your place.</small></span></label>
          </div>
        </fieldset>
        <div class="submit-row"><button class="button submit-button" type="submit"><span>Check the ride window</span><span aria-hidden="true">→</span></button><p>${demo ? 'Demo uses sample forecast data.' : 'Forecast data: Open-Meteo · updated on request'}</p></div>
      </form>
      <section id="results" class="results-shell empty-results" aria-live="polite" aria-labelledby="results-title">
        <div class="empty-mark" aria-hidden="true">⌁</div><div><p class="eyebrow">No ride check yet</p><h2 id="results-title">Your hourly ride check appears here.</h2><p>Complete the four short sections above. We will flag crossed limits, daylight edges, battery reserve, and what the forecast cannot know.</p></div>
      </section>
    </section>

    <section id="method" class="method-section" aria-labelledby="method-title">
      <div><p class="eyebrow">How it works</p><h2 id="method-title">Read each part of your ride check.</h2></div>
      <ol class="method-list">
        <li><span>01</span><h3>Set your limits</h3><p>We compare numbers you enter. There is no hidden score or universal go/no-go line.</p></li>
        <li><span>02</span><h3>Check what forecasts miss</h3><p>Black ice, ploughing, shade, closures, and local wind still need a current local check.</p></li>
        <li><span>03</span><h3>Check again before riding</h3><p>Check close to departure and again for the return. If observation and forecast disagree, trust the observation.</p></li>
      </ol>
    </section>
    <aside class="caution-band"><p><strong>This is not safety advice.</strong> You remain responsible for the route, equipment, skills, and local guidance. If conditions are unclear, choose a lower-exposure option.</p></aside>
  </main>${footer()}`;
  wireNavigation();
  document.querySelector('#ride-form')?.addEventListener('submit', event => handleSubmit(event, demo));
  if (demo) {
    const results = document.querySelector<HTMLElement>('#results')!;
    renderResults(results, sample!, demoPlace(), demoForecast(dates), true);
    document.querySelector<HTMLButtonElement>('[data-reset-demo]')?.addEventListener('click', resetDemo);
  }
}

function choice(name: string, value: string, title: string, note: string, checked: boolean) {
  return `<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span><strong>${title}</strong><small>${note}</small></span></label>`;
}

function numberField(name: string, label: string, value: number, min: number, max: number, unit: string) {
  return `<label class="field"><span>${label}</span><span class="input-unit"><input name="${name}" type="number" min="${min}" max="${max}" step="1" value="${value}" required><span>${unit}</span></span></label>`;
}

const defaults = { exposure: 'mixed' as Exposure, surface: 'variable' as Surface, tripMinutes: 50, battery: 70, screenUse: 'glance' as ScreenUse, minTemp: -5, maxWind: 25, maxGust: 40, maxPrecip: 50, iceTemp: 2, hasSaved: false };
const REAL_PREFERENCES_KEY = 'ride-window-preferences';
const DEMO_PREFERENCES_KEY = 'demo:ride-window-preferences';

function readSaved(demo = false) {
  try {
    const data = JSON.parse(localStorage.getItem(demo ? DEMO_PREFERENCES_KEY : REAL_PREFERENCES_KEY) || 'null');
    return data ? { ...defaults, ...data, hasSaved: true } : defaults;
  } catch { return defaults; }
}

function demoPreferences(dates: ReturnType<typeof getDates>): Preferences {
  return {
    place: 'Leeds', date: dates[Math.min(1, dates.length - 1)].value,
    exposure: 'mixed', surface: 'variable', tripMinutes: 45, battery: 68,
    screenUse: 'glance', minTemp: -4, maxWind: 28, maxGust: 42,
    maxPrecip: 45, iceTemp: 2
  };
}

function demoPlace() {
  return { name: 'Leeds', country_code: 'GB', admin1: 'England', latitude: 53.8, longitude: -1.55 };
}

function demoForecast(dates: ReturnType<typeof getDates>) {
  const daily = dates.map(date => date.value);
  const times = daily.flatMap(date => Array.from({ length: 24 }, (_, hour) => `${date}T${String(hour).padStart(2, '0')}:00`));
  const hour = (index: number) => index % 24;
  return {
    timezone: 'Europe/London', timezone_abbreviation: 'GMT',
    hourly: {
      time: times,
      temperature_2m: times.map((_, index) => hour(index) < 8 ? -5 : hour(index) < 16 ? 2 : -1),
      apparent_temperature: times.map((_, index) => hour(index) < 9 ? -8 : hour(index) < 16 ? -1 : -4),
      precipitation_probability: times.map((_, index) => hour(index) === 8 || hour(index) === 18 ? 55 : 20),
      precipitation: times.map((_, index) => hour(index) === 8 ? 0.2 : 0),
      snowfall: times.map(() => 0), weather_code: times.map((_, index) => hour(index) === 8 ? 51 : 2),
      wind_speed_10m: times.map((_, index) => hour(index) >= 12 && hour(index) <= 18 ? 30 : 16),
      wind_gusts_10m: times.map((_, index) => hour(index) >= 12 && hour(index) <= 18 ? 46 : 25),
      visibility: times.map(() => 10000)
    },
    daily: { time: daily, sunrise: daily.map(date => `${date}T07:10`), sunset: daily.map(date => `${date}T16:50`) },
    hourly_units: { temperature_2m: '°C' }
  };
}

function infoPage(kind: 'privacy' | 'terms') {
  const privacy = kind === 'privacy';
  app.innerHTML = `${header()}<main id="main" class="text-page"><p class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</p><h1 tabindex="-1">${privacy ? 'See what this planner stores.' : 'Use this planner as one input.'}</h1><p class="page-lede">${privacy ? 'A real ride check sends your broad place directly to the forecast provider.' : 'The result compares a forecast with limits you choose. It does not decide whether a ride is safe.'}</p>
    ${privacy ? `<section><h2>What leaves your device</h2><p>When you request a check, the broad place text goes directly from your browser to Open-Meteo’s geocoding service. The selected coordinates and day then go to its forecast service. Review <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">Open-Meteo’s terms and privacy information</a>. Winter Ride Window does not receive or proxy these requests.</p></section>
    <section><h2>What stays on your device</h2><p>If you select “Remember preferences,” route character, limits, trip duration, battery percentage, and screen-use setting stay in browser storage. Your place and forecast are not stored. Clear the option on your next check, or clear this site’s browser data.</p></section>
    <section><h2>Accounts and tracking</h2><p>You do not need an account. This product has no cookies, advertising pixels, analytics, third-party scripts, or payments.</p></section>
    <section><h2>Offline explanation</h2><p>After a visit, the service worker can cache the public app shell so this explanation opens offline. A new ride check still needs a current forecast connection.</p></section>
    <section><h2>Contact</h2><p>For privacy questions, email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>. Last updated 28 August 2026.</p></section>`
    : `<section><h2>What the planner does</h2><p>The planner compares licensed forecast values with limits you choose. Labels such as “within entered limits” describe that comparison only. They do not mean a route is safe, open, treated, lawful, or suitable for you.</p></section>
    <section><h2>Your responsibility</h2><p>Check current observations, official warnings, route status, surface treatment, daylight, equipment, fitness, skills, and local rules. Forecasts can be late, wrong, or too coarse for a route. Do not use this product for emergency decisions or live navigation.</p></section>
    <section><h2>Availability and liability</h2><p>The service is provided free of charge and “as is,” without warranties. To the maximum extent allowed by law, its authors are not liable for decisions, losses, injury, or damage arising from its use. If you do not accept these terms, do not use it.</p></section>
    <section><h2>Data and changes</h2><p>Forecast data is provided by Open-Meteo under CC BY 4.0 and remains subject to its terms. We may update or withdraw this tool. Last updated 28 August 2026.</p></section>`}
    <a class="button text-page-action" href="/" data-route>Return to planner</a></main>${footer()}`;
  wireNavigation();
  setRouteMetadata(privacy ? 'Privacy — Winter Ride Window' : 'Terms — Winter Ride Window', location.pathname);
}

function wireNavigation() {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    history.replaceState({ ...history.state, scrollX: window.scrollX, scrollY: window.scrollY }, '', location.href);
    history.pushState({ scrollX: 0, scrollY: 0 }, '', `${link.pathname}${link.hash}`);
    if (link.hasAttribute('data-start-real')) localStorage.removeItem(DEMO_PREFERENCES_KEY);
    renderRoute({ focus: true, announce: true, scroll: 'top' });
  }));
}

function parsePreferences(form: HTMLFormElement): Preferences {
  const d = new FormData(form);
  return {
    place: String(d.get('place') || '').trim(), date: String(d.get('date')),
    exposure: d.get('exposure') as Exposure, surface: d.get('surface') as Surface,
    tripMinutes: Number(d.get('tripMinutes')), battery: Number(d.get('battery')), screenUse: d.get('screenUse') as ScreenUse,
    minTemp: Number(d.get('minTemp')), maxWind: Number(d.get('maxWind')), maxGust: Number(d.get('maxGust')),
    maxPrecip: Number(d.get('maxPrecip')), iceTemp: Number(d.get('iceTemp'))
  };
}

async function handleSubmit(event: Event, demo = false) {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const error = document.querySelector<HTMLDivElement>('#form-error')!;
  const results = document.querySelector<HTMLElement>('#results')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  lastSubmitter = button;
  error.hidden = true;
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const prefs = parsePreferences(form);
  if (prefs.place.length < 2) { showError(error, 'Enter a town, district, or postcode with at least 2 characters.'); return; }
  if (prefs.maxGust < prefs.maxWind) { showError(error, 'Set maximum gust equal to or higher than maximum steady wind.'); return; }
  persistPreferences(form, prefs, demo);
  if (demo) {
    renderResults(results, prefs, demoPlace(), demoForecast(getDates()), true);
    document.querySelector<HTMLElement>('#results-title')?.focus();
    return;
  }
  if (!navigator.onLine) { renderFailure(results, 'You appear to be offline.', 'The saved app still opens offline, but a new ride check needs a current forecast. Reconnect and try again.'); return; }

  const controller = new AbortController();
  let cancelledByRider = false;
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  button.disabled = true; button.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Checking the forecast…</span>';
  results.className = 'results-shell loading-results';
  results.innerHTML = `<div class="pressed-leaf" aria-hidden="true">❋</div><div><p class="eyebrow">Forecast request</p><h2 id="results-title" tabindex="-1">Checking the forecast…</h2><p>Looking up a broad place, then comparing the next hours with your limits.</p><button class="button secondary cancel-button" type="button">Cancel check</button></div>`;
  results.querySelector<HTMLButtonElement>('.cancel-button')?.addEventListener('click', () => {
    cancelledByRider = true;
    controller.abort();
  });
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(prefs.place)}&count=1&language=en&format=json`, { signal: controller.signal });
    if (!geoRes.ok) throw new Error('The place lookup did not respond.');
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error('No broad place matched. Try a nearby town or postcode.');
    const place = geo.results[0];
    const query = new URLSearchParams({
      latitude: String(place.latitude), longitude: String(place.longitude), timezone: 'auto', forecast_days: '7',
      hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,wind_speed_10m,wind_gusts_10m,visibility',
      daily: 'sunrise,sunset'
    });
    const forecastRes = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: controller.signal });
    if (!forecastRes.ok) throw new Error('The forecast source did not respond.');
    const forecast = await forecastRes.json();
    renderResults(results, prefs, place, forecast);
    document.querySelector<HTMLElement>('#results-title')?.focus();
  } catch (caught) {
    const message = controller.signal.aborted
      ? cancelledByRider
        ? 'You cancelled this ride check before the forecast arrived.'
        : 'The forecast request took too long. Please try again.'
      : caught instanceof Error ? caught.message : 'The ride check could not be completed.';
    renderFailure(results, 'We could not complete this ride check.', `${message} Check your connection or place name, then try again.`);
  } finally {
    window.clearTimeout(timeout);
    button.disabled = false; button.innerHTML = '<span>Check the ride window again</span><span aria-hidden="true">↻</span>';
  }
}

function persistPreferences(form: HTMLFormElement, prefs: Preferences, demo = false) {
  const remember = (form.elements.namedItem('remember') as HTMLInputElement).checked;
  const key = demo ? DEMO_PREFERENCES_KEY : REAL_PREFERENCES_KEY;
  if (!remember) { localStorage.removeItem(key); return; }
  const { place: _place, date: _date, ...safe } = prefs;
  localStorage.setItem(key, JSON.stringify(safe));
}

function resetDemo() {
  localStorage.removeItem(DEMO_PREFERENCES_KEY);
  renderRoute({ focus: true, announce: true, scroll: 'top' });
}

function showError(node: HTMLElement, message: string) { node.textContent = message; node.hidden = false; node.focus(); }
function renderFailure(node: HTMLElement, title: string, message: string) {
  node.className = 'results-shell error-results';
  // Messages may contain submitted place text or provider responses. Keep all
  // dynamic values out of HTML templates so they can only ever become text.
  node.innerHTML = '<div class="error-mark" aria-hidden="true">!</div><div><p class="eyebrow">Forecast unavailable</p><h2 id="results-title" tabindex="-1"></h2><p class="failure-message"></p><button class="button secondary retry-button" type="button">Return to the form</button></div>';
  node.querySelector<HTMLElement>('#results-title')!.textContent = title;
  node.querySelector<HTMLElement>('.failure-message')!.textContent = message;
  node.querySelector('button')?.addEventListener('click', () => { lastSubmitter?.focus(); document.querySelector('#planner')?.scrollIntoView(); });
  node.querySelector<HTMLElement>('#results-title')?.focus();
}

function renderResults(node: HTMLElement, prefs: Preferences, place: any, forecast: any, demo = false) {
  const hourly: HourConditions[] = forecast.hourly.time.map((time: string, i: number) => ({
    time, temperature: forecast.hourly.temperature_2m[i], feelsLike: forecast.hourly.apparent_temperature[i],
    precipitationProbability: forecast.hourly.precipitation_probability[i] ?? 0, precipitation: forecast.hourly.precipitation[i] ?? 0,
    snowfall: forecast.hourly.snowfall[i] ?? 0, weatherCode: forecast.hourly.weather_code[i], wind: forecast.hourly.wind_speed_10m[i],
    gust: forecast.hourly.wind_gusts_10m[i], visibility: forecast.hourly.visibility[i] ?? 10000
  })).filter((h: HourConditions) => h.time.startsWith(prefs.date) && Number(h.time.slice(11, 13)) >= 6 && Number(h.time.slice(11, 13)) <= 22 && Number(h.time.slice(11, 13)) % 2 === 0);
  if (!hourly.length) { renderFailure(node, 'That day is outside this forecast.', 'Choose another available day and try again.'); return; }
  const dayIndex = forecast.daily.time.indexOf(prefs.date);
  const sunrise = forecast.daily.sunrise[dayIndex]; const sunset = forecast.daily.sunset[dayIndex];
  const assessed = hourly.map(hour => ({ hour, assessment: assessHour(hour, prefs) }));
  const counts = assessed.reduce((a, x) => ({ ...a, [x.assessment.level]: a[x.assessment.level] + 1 }), { aligned: 0, check: 0, outside: 0 });
  const best = assessed.filter(x => x.assessment.level === 'aligned');
  const leastFlags = best.length ? `${formatHour(best[0].hour.time)}${best.length > 1 ? ` and ${best.length - 1} other slot${best.length > 2 ? 's' : ''}` : ''}` : 'No sampled slot is unflagged';
  const battery = batteryPlan(prefs.battery, prefs.tripMinutes, prefs.screenUse);
  const unknowns = [
    prefs.surface === 'cleared' ? 'Confirm today’s path treatment and refreeze' : 'Check the surface for treatment, packed snow, and black ice',
    prefs.exposure === 'open' ? 'Look for crosswind on the most exposed section' : 'Compare sheltered streets with any exposed connectors',
    'Check official warnings, closures, and observations close to departure',
    'Confirm lights, braking, tyre grip, clothing, and a lower-exposure alternative'
  ];
  node.className = 'results-shell populated-results';
  node.innerHTML = `<div class="result-head">
      <div><p class="eyebrow">${demo ? 'Sample ride check' : 'Ride check'} · ${escapeHtml(place.name)}, ${escapeHtml(place.country_code || place.country || '')}</p><h2 id="results-title" tabindex="-1">${new Date(`${prefs.date}T12:00`).toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}</h2><p>${demo ? 'Prepared sample' : `Last requested ${new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit'})}`} · ${escapeHtml(forecast.timezone_abbreviation || forecast.timezone)}</p></div>
      <div class="least-flags"><span>First unflagged sample</span><strong>${leastFlags}</strong><small>This is not a recommendation to ride.</small></div>
    </div>
    <div class="result-legend" aria-label="Hourly comparison summary"><span class="status aligned">✓ ${counts.aligned} within limits</span><span class="status check">◇ ${counts.check} check closer</span><span class="status outside">↑ ${counts.outside} outside limits</span></div>
    <ul class="hour-strip" aria-label="Two-hour forecast samples">
      ${assessed.map(x => hourCard(x.hour, x.assessment, sunrise, sunset, prefs.tripMinutes)).join('')}
    </ul>
    <p class="sample-note">Samples shown every 2 hours from 06:00–22:00. Open a slot for the comparison. Forecast values can change between samples.</p>
    <div class="plan-grid">
      <section><p class="specimen-number">A · Daylight</p><h3>${formatHour(sunrise)} sunrise<br>${formatHour(sunset)} sunset</h3><p>Each slot notes whether a ${prefs.tripMinutes}-minute trip sits inside forecast daylight. Civil twilight and local shade are not included.</p></section>
      <section><p class="specimen-number">B · Phone reserve</p><h3>About ${battery.remaining}% after the trip</h3><p>Roughly ${battery.estimatedUse}% estimated use for ${prefs.screenUse === 'continuous' ? 'continuous display' : 'occasional glances'}. ${battery.advice}</p></section>
      <section class="unknowns"><p class="specimen-number">C · Unknowns to check</p><h3>The forecast cannot see the path.</h3><ul>${unknowns.map(item => `<li>${item}</li>`).join('')}</ul></section>
    </div>
    <div class="source-note"><span aria-hidden="true">✣</span><p><strong>${demo ? 'Sample data.' : 'Source and uncertainty.'}</strong> ${demo ? 'This shipped Leeds example lets you try the planner. It does not make a forecast request.' : `${FORECAST_SOURCE}, modelled at approximately ${forecast.hourly_units?.temperature_2m ? 'hourly' : 'available'} intervals. Place lookup selected ${escapeHtml(place.name)}${place.admin1 ? `, ${escapeHtml(place.admin1)}` : ''}.`} Weather models cannot confirm ice, maintenance, closures, or street-level wind.</p></div>`;
}

function hourCard(hour: HourConditions, assessment: ReturnType<typeof assessHour>, sunrise: string, sunset: string, minutes: number) {
  const label = assessment.level === 'aligned' ? 'Within entered limits' : assessment.level === 'check' ? 'Check closer' : 'Outside a limit';
  const reasons = [...assessment.flags, ...assessment.notes];
  return `<li><details class="hour-card ${assessment.level}"><summary><span class="hour-time">${formatHour(hour.time)}</span><span class="weather-glyph" aria-hidden="true">${weatherGlyph(hour.weatherCode)}</span><strong>${Math.round(hour.temperature)}°</strong><span>${Math.round(hour.wind)} km/h</span><span class="slot-state">${assessment.level === 'aligned' ? '✓' : assessment.level === 'check' ? '◇' : '↑'} <span class="sr-only">${label}</span></span></summary>
    <div class="hour-detail"><h3>${label}</h3><p>${describeWeather(hour.weatherCode)} · feels like ${Math.round(hour.feelsLike)}°C · gusts ${Math.round(hour.gust)} km/h · precipitation ${Math.round(hour.precipitationProbability)}%</p>
    ${reasons.length ? `<ul>${reasons.map(reason => `<li>${reason}</li>`).join('')}</ul>` : '<p>No sampled forecast value crosses an entered limit or contextual check.</p>'}
    <p class="daylight-line">☼ ${daylightStatus(hour.time, sunrise, sunset, minutes)}</p></div></details></li>`;
}

function weatherGlyph(code: number) { if (code === 0) return '☼'; if (code <= 3) return '◒'; if (code >= 71 && code <= 86) return '✣'; if (code >= 51) return '╱'; return '≋'; }
function formatHour(iso: string) {
  const localClock = iso.match(/T(\d{2}:\d{2})/);
  return localClock ? localClock[1] : new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function escapeHtml(value: unknown) { const d = document.createElement('div'); d.textContent = String(value); return d.innerHTML; }

type RenderOptions = { focus?: boolean; announce?: boolean; scroll?: 'top' | 'restore'; state?: { scrollX?: number; scrollY?: number } | null };

function setRouteMetadata(title: string, path: string) {
  document.title = title;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `https://winter-ride-window.sociobot.in${path === '/' ? '/' : path}`;
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!.content = title;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')!.content = title;
}

function notFoundPage() {
  app.innerHTML = `${header()}<main id="main" class="text-page not-found"><p class="eyebrow">Page not found</p><h1 tabindex="-1">This page does not exist.</h1><p class="page-lede">The address may be wrong, or the page may have moved. Return to the ride planner to start a check.</p><a class="button text-page-action" href="/" data-route>Go to the ride planner</a></main>${footer()}`;
  wireNavigation();
  setRouteMetadata('Page not found — Winter Ride Window', location.pathname);
}

function renderRoute(options: RenderOptions = {}) {
  const path = location.pathname.replace(/\/$/, '') || '/';
  document.documentElement.classList.toggle('demo-route', path === '/demo');
  if (path === '/privacy') infoPage('privacy');
  else if (path === '/terms') infoPage('terms');
  else if (path === '/demo') {
    homePage(true);
    setRouteMetadata('Demo — Winter Ride Window', '/demo');
  }
  else if (path === '/') {
    homePage();
    setRouteMetadata('Winter Ride Window — check winter rides', '/');
  } else notFoundPage();

  if (path === '/demo' && options.scroll !== 'restore') {
    document.querySelector<HTMLElement>('#results')?.scrollIntoView({ block: 'start' });
  } else if (options.scroll === 'top') window.scrollTo(0, 0);
  if (options.focus) {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: options.scroll === 'restore' || path === '/demo' });
      if (options.scroll === 'restore') window.scrollTo(options.state?.scrollX || 0, options.state?.scrollY || 0);
    });
  }
  if (options.announce) {
    window.setTimeout(() => { routeAnnouncer.textContent = `${document.title}.`; }, 0);
  }
}

window.addEventListener('popstate', event => renderRoute({ focus: true, announce: true, scroll: 'restore', state: event.state }));
window.addEventListener('online', () => document.body.dataset.network = 'online');
window.addEventListener('offline', () => document.body.dataset.network = 'offline');
renderRoute();

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
