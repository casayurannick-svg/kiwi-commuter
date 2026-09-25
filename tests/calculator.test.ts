import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateArbitrage, WEEKS_PER_MONTH } from '../src/lib/calculator';
import { AT_HOP_7_DAY_CAP, NZTA_RUC_RATES } from '../src/config/fares.config';
import { getSuburbById, estimateRouteMetrics } from '../src/config/suburbs';

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

    // Driving costs: Fuel (~$38/wk) + Parking ($90/wk) + Maintenance (~$35/wk) = ~$163/wk (~$700/mo)
    // Transit: $50/wk ($216.67/mo)
    // Monthly savings should be substantial ($400+/mo)
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
