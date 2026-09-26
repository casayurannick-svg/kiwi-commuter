import assert from 'node:assert';
import { describe, it } from 'node:test';
import { findNearestTransitStation, getAllStations } from '../stations';

describe('src/lib/stations.ts - Spatial Transit Station Search', () => {
  it('loads all 45 Auckland transit stations', () => {
    const stations = getAllStations();
    assert.ok(stations.length >= 40, `Expected at least 40 stations, found ${stations.length}`);

    // Verify presence of major hubs across rail, busway, and ferry
    const names = stations.map((s) => s.name);
    assert.ok(names.includes('Waitematā (Britomart)'), 'Must include Britomart');
    assert.ok(names.includes('Albany Busway Station'), 'Must include Albany');
    assert.ok(names.includes('Newmarket Station'), 'Must include Newmarket');
    assert.ok(names.includes('Downtown Ferry Terminal'), 'Must include Downtown Ferry');
  });

  it('finds closest transit station using Turf spatial nearest-point calculation', () => {
    // Coordinate near Albany Mall: [174.706, -36.731]
    const albanyStation = findNearestTransitStation([174.706, -36.731]);
    assert.strictEqual(albanyStation.name, 'Albany Busway Station');
    assert.strictEqual(albanyStation.mode, 'Northern Busway');
    assert.strictEqual(albanyStation.hasParkAndRide, true);
    assert.ok(albanyStation.distanceKm <= 1.0, 'Distance should be under or equal to 1 km');

    // Coordinate near Epsom/Remuera: [174.780, -36.883]
    const remueraStation = findNearestTransitStation([174.780, -36.883]);
    assert.strictEqual(remueraStation.name, 'Remuera Station');
    assert.strictEqual(remueraStation.mode, 'Train');

    // Coordinate near Devonport: [174.795, -36.832]
    const devonportStation = findNearestTransitStation([174.795, -36.832]);
    assert.strictEqual(devonportStation.name, 'Devonport Ferry Terminal');
    assert.strictEqual(devonportStation.mode, 'Ferry');
  });

  it('gracefully handles missing or invalid coordinates with default fallback', () => {
    const fallback = findNearestTransitStation([NaN, NaN] as unknown as [number, number]);
    assert.strictEqual(fallback.name, 'Waitematā (Britomart)');
    assert.strictEqual(fallback.distanceKm, 0);
  });
});
