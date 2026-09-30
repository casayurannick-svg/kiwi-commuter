import assert from 'node:assert';
import { describe, it } from 'node:test';
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
