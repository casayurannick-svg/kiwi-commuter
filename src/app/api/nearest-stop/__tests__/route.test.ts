import assert from 'node:assert';
import { describe, it } from 'node:test';
import { GET } from '../route';

describe('src/app/api/nearest-stop/route.ts - AT GTFS API Local Stop Integration', () => {
  it('returns 400 when lng or lat query parameter is missing', async () => {
    const req = new Request('http://localhost/api/nearest-stop?lat=-36.8485');
    const res = await GET(req);
    assert.strictEqual(res.status, 400);

    const json = await res.json();
    assert.ok(json.error.includes('Missing lng or lat'));
  });

  it('returns nearest local stop for valid coordinates in Auckland', async () => {
    // CBD coordinates: Queen St / Britomart area
    const req = new Request('http://localhost/api/nearest-stop?lng=174.7645&lat=-36.8485');
    const res = await GET(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.stop, 'Must return a stop object');
    assert.ok(typeof json.stop.name === 'string' && json.stop.name.length > 0);
    assert.ok(Array.isArray(json.stop.coordinates) && json.stop.coordinates.length === 2);
    assert.ok(typeof json.stop.distanceKm === 'number');
    assert.ok(json.stop.distanceKm >= 0);
    assert.ok(json.stop.source === 'at_gtfs_api' || json.stop.source === 'local_fallback');
    assert.ok(json.source === 'at_gtfs_api' || json.source === 'local_fallback');
  });

  it('handles invalid coordinate strings gracefully with 400 error', async () => {
    const req = new Request('http://localhost/api/nearest-stop?lng=invalid&lat=invalid');
    const res = await GET(req);
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.ok(json.error.includes('Invalid lng or lat'));
  });
});
