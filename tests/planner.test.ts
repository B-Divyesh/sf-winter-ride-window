import { describe, expect, it } from 'vitest';
import { assessHour, batteryPlan, daylightStatus, type HourConditions, type Preferences } from '../src/planner.ts';

const prefs: Preferences = {
  place: 'Leeds', date: '2026-01-08', exposure: 'mixed', surface: 'variable',
  tripMinutes: 60, battery: 70, screenUse: 'glance', minTemp: -5,
  maxWind: 25, maxGust: 40, maxPrecip: 50, iceTemp: 2
};
const hour: HourConditions = {
  time: '2026-01-08T12:00', temperature: 4, feelsLike: 1, precipitationProbability: 10,
  precipitation: 0, snowfall: 0, wind: 12, gust: 20, visibility: 10000, weatherCode: 2
};

describe('transparent hourly assessment', () => {
  it('marks a sample aligned only when no entered limit or contextual check is crossed', () => {
    expect(assessHour(hour, prefs)).toEqual({ level: 'aligned', flags: [], notes: [] });
  });

  it('lists every crossed limit rather than hiding them in a score', () => {
    const result = assessHour({ ...hour, temperature: -7, wind: 30, gust: 48, precipitationProbability: 70 }, prefs);
    expect(result.level).toBe('outside');
    expect(result.flags).toHaveLength(4);
    expect(result.flags.join(' ')).toContain('below your -5°C limit');
    expect(result.flags.join(' ')).toContain('gusts exceed');
  });

  it('adds an ice check only when moisture and the rider temperature point coincide', () => {
    const result = assessHour({ ...hour, temperature: 1, precipitationProbability: 30 }, prefs);
    expect(result.level).toBe('check');
    expect(result.notes[0]).toContain('Moisture is possible');
  });
});

describe('daylight and battery helpers', () => {
  it('keeps an in-daylight trip distinct from crossing the edge', () => {
    expect(daylightStatus('2026-01-08T12:00', '2026-01-08T08:00', '2026-01-08T16:00', 60)).toContain('inside');
    expect(daylightStatus('2026-01-08T15:30', '2026-01-08T08:00', '2026-01-08T16:00', 60)).toContain('crosses');
  });

  it('estimates a higher drain for continuous screen use and warns below reserve', () => {
    expect(batteryPlan(70, 60, 'continuous').estimatedUse).toBeGreaterThan(batteryPlan(70, 60, 'glance').estimatedUse);
    expect(batteryPlan(30, 60, 'continuous').advice).toContain('power bank');
  });
});
