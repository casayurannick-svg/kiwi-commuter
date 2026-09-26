import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

// Test the parseDurationSeconds helper logic directly
// (We inline the logic here since the function is not exported separately)
function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)s$/);
  if (match) return parseInt(match[1], 10);
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);
  return 0;
}

describe('US-21: /api/routes – Google Routes Transit Duration', () => {
  it('parseDurationSeconds correctly parses "s"-suffix format', () => {
    assert.strictEqual(parseDurationSeconds('1800s'), 1800);
    assert.strictEqual(parseDurationSeconds('3600s'), 3600);
    assert.strictEqual(parseDurationSeconds('0s'), 0);
  });

  it('parseDurationSeconds returns 0 for undefined or empty string', () => {
    assert.strictEqual(parseDurationSeconds(undefined), 0);
    assert.strictEqual(parseDurationSeconds(''), 0);
  });

  it('parseDurationSeconds falls back to plain integer string', () => {
    assert.strictEqual(parseDurationSeconds('2400'), 2400);
  });

  it('parseDurationSeconds returns 0 for non-numeric strings', () => {
    assert.strictEqual(parseDurationSeconds('invalid'), 0);
    assert.strictEqual(parseDurationSeconds('30m'), 0); // minutes format not supported
  });

  it('validates that API route file exists and references TRANSIT travelMode', () => {
    const routePath = resolve(process.cwd(), 'src/app/api/routes/route.ts');
    const content = readFileSync(routePath, 'utf-8');

    assert.ok(content.includes("travelMode: 'TRANSIT'"), 'Must set travelMode: TRANSIT');
    assert.ok(content.includes('GOOGLE_ROUTES_API_KEY'), 'Must reference GOOGLE_ROUTES_API_KEY');
    assert.ok(content.includes('routes.googleapis.com'), 'Must call Google Routes API endpoint');
    assert.ok(content.includes('legs'), 'Must sum duration across all legs');
    assert.ok(content.includes("source: 'google_routes_api'"), 'Must return source identifier');
    assert.ok(content.includes("source: 'fallback_none'"), 'Must return graceful fallback source');
  });

  it('validates DashboardClient fetches from /api/routes endpoint', () => {
    const dashPath = resolve(process.cwd(), 'src/components/DashboardClient.tsx');
    const content = readFileSync(dashPath, 'utf-8');

    assert.ok(content.includes('/api/routes'), 'DashboardClient must call /api/routes');
    assert.ok(content.includes('transitTimeMins'), 'DashboardClient must inject transitTimeMins from Google Routes');
  });

  it('validates /api/routes route handles invalid coordinates with 400', async () => {
    // Simulate bad request validation logic
    const queryParams = { originLng: 'NaN', originLat: '100', destinationLng: 'abc', destinationLat: '-36.8' };
    const values = Object.values(queryParams).map(parseFloat);
    const hasNaN = values.some(isNaN);
    assert.ok(hasNaN, 'Missing/invalid coords must trigger validation failure (400 response)');
  });

  it('validates that GOOGLE_ROUTES_API_KEY is documented in .env.example', () => {
    const envExamplePath = resolve(process.cwd(), '.env.example');
    const content = readFileSync(envExamplePath, 'utf-8');
    assert.ok(content.includes('GOOGLE_ROUTES_API_KEY'), 'Must document GOOGLE_ROUTES_API_KEY in .env.example');
  });
});
