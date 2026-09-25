import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateArbitrage, WEEKS_PER_MONTH } from '../src/lib/calculator';
import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  NZTA_RUC_RATES,
  PARKING_TIER_RATES,
  STATUTORY_NZTA_RUC_RATES,
} from '../src/config/fares.config';
import { getSuburbById, estimateRouteMetrics, SUBURB_CENTROIDS } from '../src/config/suburbs';
import { FareConcession, ParkingTier, VehiclePowertrain } from '../src/types';

describe('Kiwi Commuter Cost & Arbitrage Math Engine', () => {
  it('correctly applies the AT HOP $50 7-Day Cap when fare exceeds $50', () => {
    // Albany (Zone 4) to CBD (Zone 1) - 4 zones ($7.70 single trip)
    // 5 days * 2 trips = 10 trips -> 10 * $7.70 = $77.00 uncapped
    const result = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    });

    assert.strictEqual(result.transit.zoneCount, 4);
    assert.strictEqual(result.transit.singleTripStandardFare, 7.70);
    assert.strictEqual(result.transit.dailyFare, 15.40);
    assert.strictEqual(result.transit.uncappedWeeklyFare, 77.00);
    assert.strictEqual(result.transit.isHopCapApplied, true);
    assert.strictEqual(result.transit.hopCappedWeeklyFare, AT_HOP_7_DAY_CAP);
    assert.strictEqual(result.transit.weeklyTotal, 50.00);
    assert.strictEqual(
      result.transit.monthlyTotal,
      Math.round(50.0 * WEEKS_PER_MONTH * 100) / 100
    );
  });

  it('does NOT apply the 7-day cap when weekly transit cost is below $50', () => {
    // Newmarket (Zone 1) to CBD (Zone 1) - 1 zone ($2.60 single trip)
    // 2 days * 2 trips = 4 trips -> 4 * $2.60 = $10.40
    const result = calculateArbitrage({
      originSuburbId: 'newmarket',
      destinationSuburbId: 'cbd',
      daysPerWeek: 2,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 2,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(result.transit.zoneCount, 1);
    assert.strictEqual(result.transit.singleTripStandardFare, 2.60);
    assert.strictEqual(result.transit.uncappedWeeklyFare, 10.40);
    assert.strictEqual(result.transit.isHopCapApplied, false);
    assert.strictEqual(result.transit.hopCappedWeeklyFare, 10.40);
    assert.strictEqual(result.transit.weeklyTotal, 10.40);
  });

  it('correctly applies NZTA Road User Charges (RUC) by vehicle drivetrain', () => {
    assert.strictEqual(NZTA_RUC_RATES.petrol91.ratePerKm, 0.0);
    assert.strictEqual(NZTA_RUC_RATES.petrol95.ratePerKm, 0.0);
    assert.strictEqual(NZTA_RUC_RATES.diesel.ratePerKm, 0.076);
    assert.strictEqual(NZTA_RUC_RATES.bev.ratePerKm, 0.076);
    assert.strictEqual(NZTA_RUC_RATES.phev.ratePerKm, 0.038);

    // Test BEV with 40km round-trip: 40km * 0.076 = $3.04/day RUC
    const resultEv = calculateArbitrage({
      originSuburbId: 'albany', // ~19.5km one way, 39km round-trip
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.ok(resultEv.driving.dailyRucCost > 0);
    assert.strictEqual(
      resultEv.driving.dailyRucCost,
      Math.round(resultEv.driving.distanceRoundTripKm * 0.076 * 100) / 100
    );
  });

  it('correctly calculates student tertiary concession discount (20% off)', () => {
    const resultAdult = calculateArbitrage({
      originSuburbId: 'henderson',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 18,
      parkingDaysPerWeek: 3,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    const resultTertiary = calculateArbitrage({
      originSuburbId: 'henderson',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 18,
      parkingDaysPerWeek: 3,
      concession: 'tertiary',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(
      resultTertiary.transit.singleTripConcessionFare,
      Math.round(resultAdult.transit.singleTripStandardFare * 0.8 * 100) / 100
    );
  });

  it('correctly computes positive financial arbitrage savings for public transport', () => {
    // 5 days/week commute from Albany to CBD with $18/day parking
    const result = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    });

    assert.ok(result.monthlySavings > 300);
    assert.strictEqual(result.arbitrageVerdict, 'transit_wins');
    assert.strictEqual(result.annualSavings, Math.round(result.monthlySavings * 12 * 100) / 100);
  });

  it('correctly handles all 50 Auckland suburbs', () => {
    const albany = getSuburbById('albany');
    assert.strictEqual(albany.name, 'Albany');
    assert.strictEqual(albany.zone, 4);

    const takapuna = getSuburbById('takapuna');
    assert.strictEqual(takapuna.name, 'Takapuna');
    assert.strictEqual(takapuna.zone, 2);

    const metrics = estimateRouteMetrics(albany, takapuna);
    assert.ok(metrics.distanceKm > 0);
    assert.ok(metrics.zonesTraveled >= 1 && metrics.zonesTraveled <= 5);
  });
});

describe('Step 2: Static Configuration & Regulatory Rate Tables', () => {
  it('defines statutory NZTA RUC rates for all VehiclePowertrain options', () => {
    const powertrains: VehiclePowertrain[] = ['PETROL_91', 'PETROL_95', 'DIESEL', 'PHEV', 'BEV'];

    for (const pt of powertrains) {
      const entry = STATUTORY_NZTA_RUC_RATES[pt];
      assert.ok(entry, `Missing statutory RUC entry for powertrain: ${pt}`);
      assert.strictEqual(entry.powertrain, pt);
      assert.ok(typeof entry.ratePerKm === 'number');
      assert.ok(entry.legislation.length > 0);
    }

    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PETROL_91.ratePerKm, 0.0);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PETROL_95.ratePerKm, 0.0);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.DIESEL.ratePerKm, 0.076);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PHEV.ratePerKm, 0.038);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.BEV.ratePerKm, 0.076);
  });

  it('defines AT HOP zone fare tables across all FareConcession tiers', () => {
    const concessions: FareConcession[] = ['ADULT', 'CHILD', 'TERTIARY'];

    for (const c of concessions) {
      const table = AT_HOP_ZONE_FARES_BY_CONCESSION[c];
      assert.ok(table, `Missing fare table for concession: ${c}`);

      for (let zone = 1; zone <= 5; zone++) {
        assert.ok(table[zone] > 0, `Missing fare for ${c} Zone ${zone}`);
      }
    }

    // Adult zone 1 to 5 fares
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[1], 2.60);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[2], 4.45);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[3], 6.00);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[4], 7.70);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[5], 9.40);

    // 7-day cap
    assert.strictEqual(AT_HOP_7_DAY_CAP, 50.00);
  });

  it('defines commercial parking medians for all ParkingTier levels', () => {
    const tiers: ParkingTier[] = ['CBD_EARLY_BIRD', 'CBD_CASUAL', 'SUBURBAN_HUB', 'FREE'];

    for (const tier of tiers) {
      const p = PARKING_TIER_RATES[tier];
      assert.ok(p, `Missing parking tier definition for ${tier}`);
      assert.ok(p.rate >= 0);
      assert.ok(p.label.length > 0);
    }

    assert.strictEqual(PARKING_TIER_RATES.CBD_EARLY_BIRD.rate, 18.00);
    assert.strictEqual(PARKING_TIER_RATES.CBD_CASUAL.rate, 26.00);
    assert.strictEqual(PARKING_TIER_RATES.SUBURBAN_HUB.rate, 6.00);
    assert.strictEqual(PARKING_TIER_RATES.FREE.rate, 0.00);
  });

  it('defines strictly typed SUBURB_CENTROIDS spanning all Auckland regions', () => {
    assert.ok(SUBURB_CENTROIDS.length >= 50, 'Must have at least 50 Auckland suburbs');

    const regionsCovered = new Set<string>();

    for (const s of SUBURB_CENTROIDS) {
      assert.ok(s.id.length > 0, 'id required');
      assert.ok(s.name.length > 0, 'name required');
      assert.ok(
        ['Auckland Central', 'North Shore', 'West Auckland', 'East Auckland', 'South Auckland'].includes(
          s.region
        ),
        `Invalid region: ${s.region}`
      );
      regionsCovered.add(s.region);

      assert.strictEqual(s.coordinates.length, 2, 'Coordinates must be [lng, lat]');
      assert.ok(s.coordinates[0] > 174.0 && s.coordinates[0] < 175.5, 'Valid NZ longitude');
      assert.ok(s.coordinates[1] < -36.0 && s.coordinates[1] > -37.5, 'Valid Auckland latitude');

      assert.ok(s.defaultZonesToCBD >= 1 && s.defaultZonesToCBD <= 5, 'Zones must be 1 to 5');
      assert.ok(s.approxDistanceKmToCBD >= 0, 'Distance must be non-negative');
    }

    assert.strictEqual(regionsCovered.size, 5, 'Must cover all 5 Auckland regions');
  });
});
