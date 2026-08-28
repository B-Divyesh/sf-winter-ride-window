export type Exposure = 'sheltered' | 'mixed' | 'open';
export type Surface = 'cleared' | 'variable' | 'untreated';
export type ScreenUse = 'glance' | 'continuous';

export interface Preferences {
  place: string;
  date: string;
  exposure: Exposure;
  surface: Surface;
  tripMinutes: number;
  battery: number;
  screenUse: ScreenUse;
  minTemp: number;
  maxWind: number;
  maxGust: number;
  maxPrecip: number;
  iceTemp: number;
}

export interface HourConditions {
  time: string;
  temperature: number;
  feelsLike: number;
  precipitationProbability: number;
  precipitation: number;
  snowfall: number;
  wind: number;
  gust: number;
  visibility: number;
  weatherCode: number;
}

export type FlagLevel = 'aligned' | 'check' | 'outside';
export interface Assessment { level: FlagLevel; flags: string[]; notes: string[] }

export function assessHour(hour: HourConditions, prefs: Preferences): Assessment {
  const flags: string[] = [];
  const notes: string[] = [];

  if (hour.temperature < prefs.minTemp) flags.push(`${formatNumber(hour.temperature)}°C is below your ${prefs.minTemp}°C limit`);
  if (hour.wind > prefs.maxWind) flags.push(`${Math.round(hour.wind)} km/h wind exceeds your ${prefs.maxWind} km/h limit`);
  if (hour.gust > prefs.maxGust) flags.push(`${Math.round(hour.gust)} km/h gusts exceed your ${prefs.maxGust} km/h limit`);
  if (hour.precipitationProbability > prefs.maxPrecip) flags.push(`${Math.round(hour.precipitationProbability)}% precipitation chance exceeds your ${prefs.maxPrecip}% limit`);

  const moisturePossible = hour.precipitationProbability >= 20 || hour.precipitation > 0 || hour.snowfall > 0;
  if (hour.temperature <= prefs.iceTemp && moisturePossible) notes.push(`Moisture is possible at or below your ${prefs.iceTemp}°C ice-check point`);
  if (hour.snowfall > 0) notes.push(`${formatNumber(hour.snowfall)} cm forecast snowfall this hour`);
  if (hour.visibility < 5000) notes.push(`Forecast visibility is ${formatDistance(hour.visibility)}`);
  if (prefs.exposure === 'open' && hour.wind >= prefs.maxWind * 0.8 && hour.wind <= prefs.maxWind) notes.push('Open route may make this near-limit wind more noticeable');
  if (hour.feelsLike < prefs.minTemp && hour.temperature >= prefs.minTemp) notes.push(`Feels-like ${formatNumber(hour.feelsLike)}°C is below your temperature limit`);
  if (prefs.surface !== 'cleared' && hour.temperature <= prefs.iceTemp + 1) notes.push('Surface treatment is uncertain near your ice-check point');

  return { level: flags.length ? 'outside' : notes.length ? 'check' : 'aligned', flags, notes };
}

export function batteryPlan(battery: number, tripMinutes: number, screenUse: ScreenUse) {
  const hourlyDrain = screenUse === 'continuous' ? 18 : 7;
  const estimatedUse = Math.ceil((tripMinutes / 60) * hourlyDrain);
  const remaining = Math.max(0, battery - estimatedUse);
  return {
    estimatedUse,
    remaining,
    advice: remaining < 25
      ? 'A charged power bank or paper backup would protect your reserve.'
      : 'Your estimate leaves at least a 25% reserve; recheck battery health in cold weather.'
  };
}

export function daylightStatus(time: string, sunrise: string, sunset: string, tripMinutes: number) {
  const depart = new Date(time).getTime();
  const arrive = depart + tripMinutes * 60_000;
  const rise = new Date(sunrise).getTime();
  const set = new Date(sunset).getTime();
  if (arrive < rise || depart > set) return 'Trip falls outside forecast daylight';
  if (depart < rise || arrive > set) return 'Trip crosses the daylight edge';
  const edge = 30 * 60_000;
  if (depart - rise < edge || set - arrive < edge) return 'Trip is within 30 minutes of the daylight edge';
  return 'Trip fits inside forecast daylight';
}

export function describeWeather(code: number) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if ([45, 48].includes(code)) return 'Fog';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 51 && code <= 67) return 'Rain or drizzle';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed conditions';
}

export function formatNumber(value: number) { return Number.isInteger(value) ? `${value}` : value.toFixed(1); }
export function formatDistance(metres: number) { return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`; }
