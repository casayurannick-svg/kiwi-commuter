import assert from 'node:assert';
import { describe, it } from 'node:test';
import handler from '../src/pages/api/geocode/index';
import type { NextApiRequest, NextApiResponse } from 'next';

function createMockReqRes(options: {
  method?: string;
  query?: Record<string, string | string[]>;
}) {
  const req = {
    method: options.method || 'GET',
    query: options.query || {},
  } as unknown as NextApiRequest;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  } as unknown as NextApiResponse & {
    getStatusCode: () => number;
    getData: () => any;
  };

  return { req, res };
}

describe('Geocode API Route (Mapbox to Nominatim fallback adapter)', () => {
  it('rejects non-GET requests with 405 Method Not Allowed', async () => {
    const { req, res } = createMockReqRes({ method: 'POST' });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 405);
    assert.deepStrictEqual(res.getData(), { error: 'Method not allowed' });
  });

  it('rejects missing "q" parameter with 400 Bad Request', async () => {
    const { req, res } = createMockReqRes({ method: 'GET', query: {} });
    await handler(req, res);
    assert.strictEqual(res.getStatusCode(), 400);
    assert.deepStrictEqual(res.getData(), { error: 'Query parameter "q" is required' });
  });

  it('successfully geocodes with Mapbox when valid token is configured', async () => {
    const origKey = process.env.MAPBOX_API_KEY;
    const origFetch = globalThis.fetch;

    process.env.MAPBOX_API_KEY = 'pk.mock_mapbox_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            features: [
              {
                properties: {
                  full_address: '100 Queen Street, Auckland CBD, Auckland 1010, New Zealand',
                },
                geometry: {
                  coordinates: [174.7661, -36.8485],
                },
              },
            ],
          }),
        } as unknown as Response;
      }
      throw new Error('Unexpected URL in Mapbox test: ' + url);
    };

    try {
      const { req, res } = createMockReqRes({
        method: 'GET',
        query: { q: '100 Queen Street' },
      });
      await handler(req, res);
      assert.strictEqual(res.getStatusCode(), 200);
      const data = res.getData();
      assert.strictEqual(data.address, '100 Queen Street, Auckland CBD, Auckland 1010, New Zealand');
      assert.strictEqual(data.latitude, -36.8485);
      assert.strictEqual(data.longitude, 174.7661);
    } finally {
      process.env.MAPBOX_API_KEY = origKey;
      globalThis.fetch = origFetch;
    }
  });

  it('falls back to Nominatim when Mapbox fails', async () => {
    const origKey = process.env.MAPBOX_API_KEY;
    const origFetch = globalThis.fetch;

    process.env.MAPBOX_API_KEY = 'pk.mock_failing_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return {
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as unknown as Response;
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              display_name: 'Queen Street, Auckland, New Zealand',
              lat: '-36.8484',
              lon: '174.7660',
            },
          ],
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + url);
    };

    try {
      const { req, res } = createMockReqRes({
        method: 'GET',
        query: { q: 'Queen Street' },
      });
      await handler(req, res);
      assert.strictEqual(res.getStatusCode(), 200);
      const data = res.getData();
      assert.strictEqual(data.address, 'Queen Street, Auckland, New Zealand');
      assert.strictEqual(data.latitude, -36.8484);
      assert.strictEqual(data.longitude, 174.766);
    } finally {
      process.env.MAPBOX_API_KEY = origKey;
      globalThis.fetch = origFetch;
    }
  });

  it('falls back to Nominatim when Mapbox returns 0 features', async () => {
    const origKey = process.env.MAPBOX_API_KEY;
    const origFetch = globalThis.fetch;

    process.env.MAPBOX_API_KEY = 'pk.mock_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ features: [] }),
        } as unknown as Response;
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              display_name: 'Custom Spot, Auckland',
              lat: '-36.8500',
              lon: '174.7600',
            },
          ],
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + url);
    };

    try {
      const { req, res } = createMockReqRes({
        method: 'GET',
        query: { q: 'Custom Spot' },
      });
      await handler(req, res);
      assert.strictEqual(res.getStatusCode(), 200);
      const data = res.getData();
      assert.strictEqual(data.address, 'Custom Spot, Auckland');
      assert.strictEqual(data.latitude, -36.85);
      assert.strictEqual(data.longitude, 174.76);
    } finally {
      process.env.MAPBOX_API_KEY = origKey;
      globalThis.fetch = origFetch;
    }
  });

  it('returns 200 with { results: [] } when both Mapbox and Nominatim return no results', async () => {
    const origKey = process.env.MAPBOX_API_KEY;
    const origFetch = globalThis.fetch;

    let mapboxUrl = '';
    let nominatimUrl = '';

    process.env.MAPBOX_API_KEY = 'pk.mock_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes('api.mapbox.com')) {
        mapboxUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({ features: [] }),
        } as unknown as Response;
      }
      if (url.includes('nominatim.openstreetmap.org')) {
        nominatimUrl = url;
        return {
          ok: true,
          status: 200,
          json: async () => [],
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + url);
    };

    try {
      const { req, res } = createMockReqRes({
        method: 'GET',
        query: { q: 'Nonexistent Place XYZ' },
      });
      await handler(req, res);
      assert.strictEqual(res.getStatusCode(), 200);
      assert.deepStrictEqual(res.getData(), { results: [] });
      assert.ok(mapboxUrl.includes('country=nz'), 'Mapbox request must include country=nz');
      assert.ok(nominatimUrl.includes('countrycodes=nz'), 'Nominatim request must include countrycodes=nz');
    } finally {
      process.env.MAPBOX_API_KEY = origKey;
      globalThis.fetch = origFetch;
    }
  });
});

describe('src/lib/mapbox.ts - /api/geocode client adapter', () => {
  it('returns [] when /api/geocode returns { results: [] } (empty results without error)', async () => {
    const origToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const origFetch = globalThis.fetch;

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_valid_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith('/api/geocode')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] }),
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + url);
    };

    try {
      const { searchAucklandAddresses } = await import('../src/lib/mapbox');
      const results = await searchAucklandAddresses('Nonexistent Street 9999');
      assert.deepStrictEqual(results, []);
    } finally {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = origToken;
      globalThis.fetch = origFetch;
    }
  });
  it('calls /api/geocode?q=... and returns [data]', async () => {
    const origToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const origFetch = globalThis.fetch;

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_valid_token';
    const mockData = {
      address: '100 Queen Street, Auckland CBD',
      latitude: -36.8485,
      longitude: 174.7661,
    };

    let requestedUrl = '';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      requestedUrl = String(input);
      if (requestedUrl.startsWith('/api/geocode')) {
        return {
          ok: true,
          status: 200,
          json: async () => mockData,
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + requestedUrl);
    };

    try {
      const { searchAucklandAddresses } = await import('../src/lib/mapbox');
      const results = await searchAucklandAddresses('100 Queen Street');
      assert.strictEqual(requestedUrl, '/api/geocode?q=100%20Queen%20Street');
      assert.deepStrictEqual(results, [mockData]);
    } finally {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = origToken;
      globalThis.fetch = origFetch;
    }
  });

  it('throws when /api/geocode returns !res.ok and Turso is unconfigured', async () => {
    const origToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const origFetch = globalThis.fetch;

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_valid_token';
    globalThis.fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith('/api/geocode')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as unknown as Response;
      }
      throw new Error('Unexpected URL: ' + url);
    };

    try {
      const { searchAucklandAddresses } = await import('../src/lib/mapbox');
      await assert.rejects(
        () => searchAucklandAddresses('Error Query Street'),
        (err: Error) => {
          return err.message.includes('Mapbox and Turso both failed');
        }
      );
    } finally {
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN = origToken;
      globalThis.fetch = origFetch;
    }
  });

  it('verifies Directions API still targets api.mapbox.com/directions/v5', async () => {
    const { readFileSync } = await import('node:fs');
    const content = readFileSync('src/lib/mapbox.ts', 'utf-8');
    assert.ok(
      content.includes('https://api.mapbox.com/directions/v5/mapbox/${profile}/'),
      'Directions API must not be modified and must still target api.mapbox.com'
    );
  });
});

