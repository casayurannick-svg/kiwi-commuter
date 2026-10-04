import assert from 'node:assert';
import { describe, it, afterEach } from 'node:test';
import {
  searchAucklandAddresses,
  HOBSONVILLE_FERRY_TERMINAL,
  HOBSONVILLE_TOWN_CENTRE,
} from '../mapbox';

describe('src/lib/mapbox.ts - BUG-54: Hobsonville Terminal Snapping', () => {
  it('prioritizes and snaps to Hobsonville Point Ferry Terminal when transitMode is FERRY', async () => {
    const results = await searchAucklandAddresses('Hobsonville', { transitMode: 'FERRY' });
    assert.ok(results.length > 0, 'Must return results for Hobsonville');
    const firstResult = results[0];
    assert.strictEqual(
      firstResult.id,
      HOBSONVILLE_FERRY_TERMINAL.id,
      'First result must be Hobsonville Point Ferry Terminal'
    );
    assert.deepStrictEqual(
      firstResult.coordinates,
      [174.6680, -36.7980],
      'Coordinates must be waterfront ferry terminal [174.6680, -36.7980]'
    );
    assert.ok(
      firstResult.placeName.includes('Hobsonville Point Ferry Terminal'),
      'placeName must mention Hobsonville Point Ferry Terminal'
    );
  });

  it('prioritizes inland Hobsonville Town Centre when transitMode is BUS or undefined', async () => {
    const busResults = await searchAucklandAddresses('Hobsonville', { transitMode: 'BUS' });
    assert.ok(busResults.length > 0);
    assert.strictEqual(
      busResults[0].id,
      HOBSONVILLE_TOWN_CENTRE.id,
      'First result for bus query must be Hobsonville Town Centre'
    );
    assert.deepStrictEqual(
      busResults[0].coordinates,
      [174.6590, -36.7920],
      'Coordinates must be inland town centre [174.6590, -36.7920]'
    );

    const defaultResults = await searchAucklandAddresses('Hobsonville');
    assert.ok(defaultResults.length > 0);
    assert.strictEqual(
      defaultResults[0].id,
      HOBSONVILLE_TOWN_CENTRE.id,
      'First result for default query must be Hobsonville Town Centre'
    );
  });
});

// ---------------------------------------------------------------------------
// Fallback and timeout integration tests for searchAucklandAddresses
// ---------------------------------------------------------------------------

describe('searchAucklandAddresses – timeout, fallback, and suburb centroid paths', () => {
  const ORIG_ENV = { ...process.env };

  afterEach(() => {
    // Restore env after each test
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIG_ENV.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
    process.env.MAPBOX_TIMEOUT_MS = ORIG_ENV.MAPBOX_TIMEOUT_MS ?? '';
  });

  it('falls back to suburb centroids when no Mapbox token is configured', async () => {
    // Ensure no token so Mapbox branch is skipped entirely
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = '';
    const { searchAucklandAddresses } = await import('../mapbox');
    const results = await searchAucklandAddresses('Hobsonville');
    assert.ok(results.length > 0, 'Should return suburb centroid fallback results');
    assert.ok(
      results.some((r) => r.placeName.toLowerCase().includes('hobsonville')),
      'Results should contain Hobsonville'
    );
  });

  it('returns empty array for very short query (< 2 chars)', async () => {
    const { searchAucklandAddresses } = await import('../mapbox');
    const results = await searchAucklandAddresses('a');
    assert.deepStrictEqual(results, [], 'Queries < 2 chars must return []');
  });

  it('throws when Mapbox token is set but fetch times out and Turso has no client configured', async () => {
    // Set a fake pk. token and short timeout so AbortController fires quickly
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.fakeforfallbacktest';
    process.env.MAPBOX_TIMEOUT_MS = '10';

    const origFetch = globalThis.fetch;
    // Mock fetch to reject representing an API failure
    (globalThis as unknown as Record<string, unknown>).fetch = async (): Promise<Response> => {
      throw new Error('Geocoding fetch failed');
    };

    try {
      const { searchAucklandAddresses } = await import('../mapbox');
      // Turso is not configured (no TURSO_DATABASE_URL) → returns [] → mapboxFailed → throws
      await assert.rejects(
        () => searchAucklandAddresses('unique-address-xyz-fallback-test'),
        (err: Error) => err instanceof Error,
        'Should reject when Mapbox times out and Turso is unconfigured'
      );
    } finally {
      (globalThis as unknown as Record<string, unknown>).fetch = origFetch;
    }
  });

  it('searchAddressesInTurso returns empty array when client not configured', async () => {
    // No TURSO_DATABASE_URL set → client is null → returns []
    const { searchAddressesInTurso } = await import('../turso');
    const results = await searchAddressesInTurso('Queen Street');
    assert.deepStrictEqual(results, [], 'Should return [] when Turso client is not configured');
  });
});
