import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const config = JSON.parse(readFileSync(join(process.cwd(), 'public/staticwebapp.config.json'), 'utf8'));
const headers = config.globalHeaders as Record<string, string>;

describe('production response policy', () => {
  it('ships a restrictive CSP while allowing the documented forecast requests', () => {
    expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("script-src 'self'");
    expect(headers['Content-Security-Policy']).toContain("connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('denies framing for clients that still use X-Frame-Options', () => {
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
