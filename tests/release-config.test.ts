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

  it('preserves only known app routes and sends missing URLs to the designed 404', () => {
    expect(config.navigationFallback).toBeUndefined();
    expect(config.routes.map((route: { route: string }) => route.route)).toEqual(expect.arrayContaining(['/privacy', '/terms', '/demo']));
    expect(config.responseOverrides?.['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
    const notFound = readFileSync(join(process.cwd(), 'public/404.html'), 'utf8');
    expect(notFound).toContain('<main id="main">');
    expect(notFound).toContain('<h1>This page does not exist.</h1>');
  });
});
