import './styles.css';
import { assessHour, batteryPlan, daylightStatus, describeWeather, type HourConditions, type Preferences, type Exposure, type Surface, type ScreenUse } from './planner.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
const FORECAST_SOURCE = '<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> forecast data (CC BY 4.0)';
let lastSubmitter: HTMLButtonElement | null = null;

function header() {
  return `<header class="site-header">
    <a class="brand" href="/" data-route aria-label="Winter Ride Window home">
      <span class="brand-mark" aria-hidden="true">⌁</span><span>Winter Ride Window</span>
    </a>
    <nav aria-label="Main navigation"><a href="/#planner">Planner</a><a href="/#method">Method</a><a href="/privacy" data-route>Privacy</a></nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div><a class="brand footer-brand" href="/" data-route><span class="brand-mark" aria-hidden="true">⌁</span><span>Winter Ride Window</span></a>
      <p>A field check for your limits—not a promise of safety.</p></div>
    <div class="footer-links"><a href="/privacy" data-route>Privacy</a><a href="/terms" data-route>Terms</a><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Forecast source ↗</a></div>
    <p class="art-credit">Original field-guide artwork generated for this product · © 2026 Sociobot · MIT</p>
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

function homePage() {
  const saved = readSaved();
  app.innerHTML = `${header()}
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span aria-hidden="true">✣</span> Pre-ride field note · no account</p>
        <h1 id="hero-title">Find the winter hours that fit <em>your</em> limits.</h1>
        <p class="hero-lede">Compare a licensed hourly forecast with your route exposure and personal thresholds. You get conditions to check—not a verdict about whether it is safe to ride.</p>
        <a class="button hero-action" href="#planner">Make a field check <span aria-hidden="true">↓</span></a>
        <ul class="hero-facts" aria-label="Planner characteristics"><li>About 2 minutes</li><li>Broad place only</li><li>Nothing sent to us</li></ul>
      </div>
      <figure class="hero-plate">
        <picture>
          <source type="image/avif" srcset="/assets/winter-field-guide-720.avif 720w, /assets/winter-field-guide-1100.avif 1100w" sizes="(max-width: 760px) 100vw, 52vw">
          <source type="image/webp" srcset="/assets/winter-field-guide-720.webp 720w, /assets/winter-field-guide-1100.webp 1100w" sizes="(max-width: 760px) 100vw, 52vw">
          <img src="/assets/winter-field-guide-1100.jpg" srcset="/assets/winter-field-guide-720.jpg 720w, /assets/winter-field-guide-1100.jpg 1100w" sizes="(max-width: 760px) 100vw, 52vw" width="1100" height="734" alt="Field-guide illustration of a commuter bicycle beside a frosty path between open ground and spruce trees" fetchpriority="high" decoding="async">
        </picture>
        <figcaption><span>Plate 01</span> Open ground, shelter, cold, and light each change a route.</figcaption>
      </figure>
    </section>

    <section id="planner" class="planner-section" aria-labelledby="planner-title">
      <div class="section-intro"><p class="eyebrow">Your field check</p><h2 id="planner-title">Observe the route. Mark your limits.</h2><p>Use a town, district, or postcode—not a street address. Weather is only one part of a ride decision.</p></div>
      <form id="ride-form" novalidate>
        <div id="form-error" class="form-alert" role="alert" hidden></div>
        <fieldset class="form-section"><legend><span>01</span> Place and day</legend>
          <div class="form-grid two">
            <label class="field"><span>Broad place</span><input id="place" name="place" autocomplete="address-level2" required minlength="2" value="" placeholder="e.g. Leeds or 10115"><small>We look it up only when you check the forecast.</small></label>
            <label class="field"><span>Ride day</span><select name="date">${getDates().map(d => `<option value="${d.value}">${d.label}</option>`).join('')}</select><small>Forecasts are available for the next 7 days.</small></label>
          </div>
        </fieldset>

        <fieldset class="form-section"><legend><span>02</span> Route character</legend>
          <div class="choice-group"><span class="group-label">Wind exposure</span><div class="segmented">
            ${choice('exposure', 'sheltered', 'Sheltered', 'Mostly buildings or trees', saved.exposure === 'sheltered')}
            ${choice('exposure', 'mixed', 'Mixed', 'Some open sections', saved.exposure === 'mixed')}
            ${choice('exposure', 'open', 'Open', 'Fields, bridges, waterfront', saved.exposure === 'open')}
          </div></div>
          <div class="form-grid two lower-grid">
            <label class="field"><span>Expected surface treatment</span><select name="surface">
              <option value="cleared" ${saved.surface === 'cleared' ? 'selected' : ''}>Usually cleared or treated</option>
              <option value="variable" ${saved.surface === 'variable' ? 'selected' : ''}>Varies along the route</option>
              <option value="untreated" ${saved.surface === 'untreated' ? 'selected' : ''}>Mostly untreated or unknown</option>
            </select></label>
            <label class="field"><span>Round-trip duration</span><span class="input-unit"><input name="tripMinutes" type="number" min="10" max="360" step="5" value="${saved.tripMinutes}"><span>min</span></span></label>
          </div>
        </fieldset>

        <fieldset class="form-section"><legend><span>03</span> Your forecast limits</legend>
          <p class="legend-note">A slot is flagged when it crosses one of these values. These are planning preferences, not universal safe limits.</p>
          <div class="limits-grid">
            ${numberField('minTemp', 'Minimum air temperature', saved.minTemp, -30, 15, '°C')}
            ${numberField('maxWind', 'Maximum steady wind', saved.maxWind, 5, 80, 'km/h')}
            ${numberField('maxGust', 'Maximum gust', saved.maxGust, 10, 120, 'km/h')}
            ${numberField('maxPrecip', 'Maximum rain/snow chance', saved.maxPrecip, 0, 100, '%')}
            ${numberField('iceTemp', 'Check for ice at or below', saved.iceTemp, -10, 10, '°C')}
          </div>
        </fieldset>

        <fieldset class="form-section compact"><legend><span>04</span> Phone reserve</legend>
          <div class="form-grid three">
            <label class="field"><span>Battery at departure</span><span class="input-unit"><input name="battery" type="number" min="1" max="100" value="${saved.battery}"><span>%</span></span></label>
            <label class="field"><span>Screen use</span><select name="screenUse"><option value="glance" ${saved.screenUse === 'glance' ? 'selected' : ''}>Occasional map glances</option><option value="continuous" ${saved.screenUse === 'continuous' ? 'selected' : ''}>Screen stays on</option></select></label>
            <label class="check-field"><input type="checkbox" name="remember" ${saved.hasSaved ? 'checked' : ''}><span><strong>Remember preferences</strong><small>Limits only, in this browser. Never your place.</small></span></label>
          </div>
        </fieldset>
        <div class="submit-row"><button class="button submit-button" type="submit"><span>Check the ride window</span><span aria-hidden="true">→</span></button><p>Forecast data: Open-Meteo · updated on request</p></div>
      </form>
      <section id="results" class="results-shell empty-results" aria-live="polite" aria-labelledby="results-title">
        <div class="empty-mark" aria-hidden="true">⌁</div><div><p class="eyebrow">Awaiting observations</p><h2 id="results-title">Your hourly field note will appear here.</h2><p>Complete the four short sections above. We will flag crossed limits, daylight edges, battery reserve, and what the forecast cannot know.</p></div>
      </section>
    </section>

    <section id="method" class="method-section" aria-labelledby="method-title">
      <div><p class="eyebrow">How to read the note</p><h2 id="method-title">Transparent by design.</h2></div>
      <ol class="method-list">
        <li><span>01</span><h3>Your limits stay yours</h3><p>We compare numbers you enter. There is no hidden risk score and no universal go/no-go line.</p></li>
        <li><span>02</span><h3>Forecasts have blind spots</h3><p>Black ice, ploughing, shade, path closures, and hyperlocal wind still need a current local check.</p></li>
        <li><span>03</span><h3>Conditions can change</h3><p>Check close to departure and again for the return. If observation and forecast disagree, trust the observation.</p></li>
      </ol>
    </section>
    <aside class="caution-band"><p><strong>Not emergency or safety advice.</strong> You remain responsible for the route, equipment, skills, and local guidance. If conditions are unclear, choose a lower-exposure option.</p></aside>
  </main>${footer()}`;
  wireNavigation();
  document.querySelector('#ride-form')?.addEventListener('submit', handleSubmit);
}

function choice(name: string, value: string, title: string, note: string, checked: boolean) {
  return `<label class="choice"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span><strong>${title}</strong><small>${note}</small></span></label>`;
}

function numberField(name: string, label: string, value: number, min: number, max: number, unit: string) {
  return `<label class="field"><span>${label}</span><span class="input-unit"><input name="${name}" type="number" min="${min}" max="${max}" step="1" value="${value}" required><span>${unit}</span></span></label>`;
}

const defaults = { exposure: 'mixed' as Exposure, surface: 'variable' as Surface, tripMinutes: 50, battery: 70, screenUse: 'glance' as ScreenUse, minTemp: -5, maxWind: 25, maxGust: 40, maxPrecip: 50, iceTemp: 2, hasSaved: false };
function readSaved() {
  try { const data = JSON.parse(localStorage.getItem('ride-window-preferences') || 'null'); return data ? { ...defaults, ...data, hasSaved: true } : defaults; } catch { return defaults; }
}

function infoPage(kind: 'privacy' | 'terms') {
  const privacy = kind === 'privacy';
  app.innerHTML = `${header()}<main id="main" class="text-page"><p class="eyebrow">Field note · ${privacy ? 'Privacy' : 'Terms'}</p><h1>${privacy ? 'Your route is not our record.' : 'A planning aid, not a safety verdict.'}</h1><p class="page-lede">${privacy ? 'Winter Ride Window is designed to work without accounts, analytics, precise routes, or a server of its own.' : 'By using Winter Ride Window, you agree to treat its output as one input to your own pre-ride decision.'}</p>
    ${privacy ? `<section><h2>What leaves your device</h2><p>When you request a check, the broad place text is sent directly from your browser to Open-Meteo’s geocoding service. The selected coordinates and day are then sent to its forecast service. Review <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer">Open-Meteo’s terms and privacy information</a>. We do not receive or proxy those requests.</p></section>
    <section><h2>What stays on your device</h2><p>If you tick “Remember preferences,” route character, thresholds, trip duration, battery percentage, and screen-use setting are stored in your browser’s local storage. Your place and retrieved forecasts are never stored there. Untick the option on your next check to clear saved preferences, or clear this site’s browser data.</p></section>
    <section><h2>No tracking</h2><p>There are no cookies, advertising pixels, analytics, third-party scripts, accounts, or payments. The service worker may cache the public app shell on your device so this explanation remains available offline.</p></section>
    <section><h2>Contact</h2><p>For privacy questions, email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>. Last updated 28 August 2026.</p></section>`
    : `<section><h2>What the planner does</h2><p>The planner compares licensed forecast values with thresholds you choose. Labels such as “within entered limits” describe that comparison only. They do not mean a route is safe, open, treated, lawful, or suitable for you.</p></section>
    <section><h2>Your responsibility</h2><p>Check current observations, official warnings, route status, surface treatment, daylight, equipment, fitness, skills, and local rules. Forecasts can be late, wrong, or too coarse for a route. Do not use this product for emergency decisions or live navigation.</p></section>
    <section><h2>Availability and liability</h2><p>The service is provided free of charge and “as is,” without warranties. To the maximum extent allowed by law, its authors are not liable for decisions, losses, injury, or damage arising from its use. If you do not accept these terms, do not use it.</p></section>
    <section><h2>Data and changes</h2><p>Forecast data is provided by Open-Meteo under CC BY 4.0 and remains subject to its terms. We may update or withdraw this tool. Last updated 28 August 2026.</p></section>`}
    <a class="button text-page-action" href="/" data-route>Return to planner</a></main>${footer()}`;
  wireNavigation();
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Winter Ride Window`;
}

function wireNavigation() {
  document.querySelectorAll<HTMLAnchorElement>('[data-route]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); history.pushState({}, '', link.pathname); renderRoute(); window.scrollTo(0, 0);
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

async function handleSubmit(event: Event) {
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
  persistPreferences(form, prefs);
  if (!navigator.onLine) { renderFailure(results, 'You appear to be offline.', 'The saved app still opens offline, but a new field check needs a current forecast. Reconnect and try again.'); return; }

  button.disabled = true; button.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Gathering observations…</span>';
  results.className = 'results-shell loading-results';
  results.innerHTML = `<div class="pressed-leaf" aria-hidden="true">❋</div><div><p class="eyebrow">Contacting forecast source</p><h2 id="results-title" tabindex="-1">Gathering hourly observations…</h2><p>Looking up a broad place, then comparing the next hours with your limits.</p></div>`;
  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(prefs.place)}&count=1&language=en&format=json`);
    if (!geoRes.ok) throw new Error('The place lookup did not respond.');
    const geo = await geoRes.json();
    if (!geo.results?.length) throw new Error('No broad place matched. Try a nearby town or postcode.');
    const place = geo.results[0];
    const query = new URLSearchParams({
      latitude: String(place.latitude), longitude: String(place.longitude), timezone: 'auto', forecast_days: '7',
      hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,snowfall,weather_code,wind_speed_10m,wind_gusts_10m,visibility',
      daily: 'sunrise,sunset'
    });
    const forecastRes = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`);
    if (!forecastRes.ok) throw new Error('The forecast source did not respond.');
    const forecast = await forecastRes.json();
    renderResults(results, prefs, place, forecast);
    document.querySelector<HTMLElement>('#results-title')?.focus();
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'The field check could not be completed.';
    renderFailure(results, 'We could not complete this field check.', `${message} Check your connection or place name, then try again.`);
  } finally {
    button.disabled = false; button.innerHTML = '<span>Check the ride window again</span><span aria-hidden="true">↻</span>';
  }
}

function persistPreferences(form: HTMLFormElement, prefs: Preferences) {
  const remember = (form.elements.namedItem('remember') as HTMLInputElement).checked;
  if (!remember) { localStorage.removeItem('ride-window-preferences'); return; }
  const { place: _place, date: _date, ...safe } = prefs;
  localStorage.setItem('ride-window-preferences', JSON.stringify(safe));
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

function renderResults(node: HTMLElement, prefs: Preferences, place: any, forecast: any) {
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
      <div><p class="eyebrow">Field note · ${escapeHtml(place.name)}, ${escapeHtml(place.country_code || place.country || '')}</p><h2 id="results-title" tabindex="-1">${new Date(`${prefs.date}T12:00`).toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric' })}</h2><p>Last requested ${new Date().toLocaleTimeString('en', {hour:'2-digit',minute:'2-digit'})} · ${escapeHtml(forecast.timezone_abbreviation || forecast.timezone)}</p></div>
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
      <section class="unknowns"><p class="specimen-number">C · Unknowns to observe</p><h3>The forecast cannot see the path.</h3><ul>${unknowns.map(item => `<li>${item}</li>`).join('')}</ul></section>
    </div>
    <div class="source-note"><span aria-hidden="true">✣</span><p><strong>Source and uncertainty.</strong> ${FORECAST_SOURCE}, modelled at approximately ${forecast.hourly_units?.temperature_2m ? 'hourly' : 'available'} intervals. Place lookup selected ${escapeHtml(place.name)}${place.admin1 ? `, ${escapeHtml(place.admin1)}` : ''}. Weather models cannot confirm ice, maintenance, closures, or street-level wind.</p></div>`;
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

function renderRoute() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (path === '/privacy') infoPage('privacy'); else if (path === '/terms') infoPage('terms'); else homePage();
  if (path === '/') document.title = 'Winter Ride Window — a pre-ride field check';
}

window.addEventListener('popstate', renderRoute);
window.addEventListener('online', () => document.body.dataset.network = 'online');
window.addEventListener('offline', () => document.body.dataset.network = 'offline');
renderRoute();

if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
