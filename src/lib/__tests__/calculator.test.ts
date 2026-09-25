import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCommuteArbitrage, WEEKS_PER_MONTH } from '../calculator';
import { AT_HOP_7_DAY_CAP, PARKING_TIER_RATES } from '../../config/fares.config';

describe('src/lib/calculator.ts - calculateCommuteArbitrage', () => {
  it('computes exact daily, weekly, monthly, and annual financial figures', () => {
    const input = {
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91' as const,
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult' as const,
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    };

    const result = calculateCommuteArbitrage(input);

    // Driving relationships
    assert.strictEqual(
      result.driving.distanceRoundTripKm,
      Math.round(result.driving.distanceOneWayKm * 2 * 10) / 10
    );
    assert.strictEqual(
      result.driving.weeklyFuelCost,
      Math.round(result.driving.dailyFuelCost * 5 * 100) / 100
    );
    assert.strictEqual(
      result.driving.weeklyParkingCost,
      Math.round(18.0 * 5 * 100) / 100
    );
    assert.strictEqual(
      result.driving.monthlyTotal,
      Math.round(result.driving.weeklyTotal * WEEKS_PER_MONTH * 100) / 100
    );
    assert.strictEqual(
      result.driving.annualTotal,
      Math.round(result.driving.monthlyTotal * 12 * 100) / 100
    );

    // Transit relationships
    assert.strictEqual(result.transit.uncappedWeeklyFare, 77.00);
    assert.strictEqual(result.transit.isHopCapApplied, true);
    assert.strictEqual(result.transit.weeklyTotal, 50.00);
    assert.strictEqual(
      result.transit.monthlyTotal,
      Math.round(50.00 * WEEKS_PER_MONTH * 100) / 100
    );
    assert.strictEqual(
      result.transit.annualTotal,
      Math.round(result.transit.monthlyTotal * 12 * 100) / 100
    );

    // Savings relationships
    assert.strictEqual(
      result.monthlySavings,
      Math.round((result.driving.monthlyTotal - result.transit.monthlyTotal) * 100) / 100
    );
    assert.strictEqual(
      result.annualSavings,
      Math.round(result.monthlySavings * 12 * 100) / 100
    );
  });

  describe('Auckland Transport $50 7-Day Fare Cap', () => {
    it('applies the $50 cap when weekly transit cost exceeds $50', () => {
      // 5-day commute across 4 zones: daily return = $15.40, 5 days = $77.00
      const result = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(result.transit.uncappedWeeklyFare, 77.00);
      assert.strictEqual(result.transit.isHopCapApplied, true);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, AT_HOP_7_DAY_CAP);
      assert.strictEqual(result.transit.weeklyTotal, 50.00);
    });

    it('does not apply the cap when weekly transit cost is under $50', () => {
      // 2-day commute in Zone 1: daily return = $5.20, 2 days = $10.40
      const result = calculateCommuteArbitrage({
        originSuburbId: 'newmarket',
        destinationSuburbId: 'cbd',
        daysPerWeek: 2,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(result.transit.uncappedWeeklyFare, 10.40);
      assert.strictEqual(result.transit.isHopCapApplied, false);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, 10.40);
      assert.strictEqual(result.transit.weeklyTotal, 10.40);
    });
  });

  describe('Statutory NZTA Road User Charges (RUC)', () => {
    it('applies $0.076/km RUC to pure electric BEVs', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna', // ~9.1km one way, 18.2km round trip
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'bev',
        powertrain: 'BEV',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedDailyRuc = Math.round(18.2 * 0.076 * 100) / 100;
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
      assert.strictEqual(result.driving.weeklyRucCost, Math.round(expectedDailyRuc * 5 * 100) / 100);
    });

    it('applies $0.038/km reduced RUC to PHEVs', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'phev',
        powertrain: 'PHEV',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedDailyRuc = Math.round(18.2 * 0.038 * 100) / 100;
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
    });

    it('exempts petrol vehicles from RUC ($0/km)', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(result.driving.dailyRucCost, 0.0);
      assert.strictEqual(result.driving.weeklyRucCost, 0.0);
    });
  });

  describe('Commercial Parking Tiers & Presets', () => {
    it('factors in parking tier rates accurately', () => {
      const resultEarlyBird = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 5,
        parkingTier: 'CBD_EARLY_BIRD',
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(resultEarlyBird.driving.dailyParkingCost, PARKING_TIER_RATES.CBD_EARLY_BIRD.rate);
      assert.strictEqual(
        resultEarlyBird.driving.weeklyParkingCost,
        PARKING_TIER_RATES.CBD_EARLY_BIRD.rate * 5
      );

      const resultFree = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 5,
        parkingTier: 'FREE',
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(resultFree.driving.dailyParkingCost, 0.0);
      assert.strictEqual(resultFree.driving.weeklyParkingCost, 0.0);
    });
  });

  describe('Carpool & Cost Splitting', () => {
    it('splits fuel, RUC, and parking evenly across carpool passengers', () => {
      const solo = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel',
        parkingDailyRate: 20.0,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
      });

      const carpool2 = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel',
        parkingDailyRate: 20.0,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 2,
      });

      assert.strictEqual(
        carpool2.driving.dailyFuelCost,
        Math.round((solo.driving.dailyFuelCost / 2) * 100) / 100
      );
      assert.strictEqual(
        carpool2.driving.dailyRucCost,
        Math.round((solo.driving.dailyRucCost / 2) * 100) / 100
      );
      assert.strictEqual(
        carpool2.driving.dailyParkingCost,
        Math.round((solo.driving.dailyParkingCost / 2) * 100) / 100
      );
    });
  });

  describe('Concession Fare Handling', () => {
    it('applies tertiary student 20% discount correctly', () => {
      const adult = calculateCommuteArbitrage({
        originSuburbId: 'henderson',
        destinationSuburbId: 'cbd',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        fareConcession: 'ADULT',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const tertiary = calculateCommuteArbitrage({
        originSuburbId: 'henderson',
        destinationSuburbId: 'cbd',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'tertiary',
        fareConcession: 'TERTIARY',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(adult.transit.singleTripStandardFare, 6.00); // 3 zones
      assert.strictEqual(tertiary.transit.singleTripConcessionFare, 4.80); // 20% off
    });
  });

  describe('Time Metrics & Opportunity Cost (US-13)', () => {
    it('computes timeMetrics with zero hourlyTimeValue by default', () => {
      const result = calculateCommuteArbitrage({
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

      assert.ok(result.timeMetrics, 'timeMetrics object must be present');
      assert.strictEqual(typeof result.timeMetrics.oneWayDriveMinutes, 'number');
      assert.strictEqual(typeof result.timeMetrics.oneWayTransitMinutes, 'number');
      assert.strictEqual(typeof result.timeMetrics.monthlyTimeDeltaHours, 'number');
      assert.strictEqual(result.timeMetrics.monetizedMonthlyTimeCost, 0);
      assert.strictEqual(result.timeMetrics.generalizedMonthlySavings, result.monthlySavings);
    });

    it('computes monetizedMonthlyTimeCost and generalizedMonthlySavings with hourlyTimeValue', () => {
      const hourlyValue = 35; // $35/hour
      const daysPerWeek = 5;
      const result = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek,
        vehicleType: 'petrol91',
        parkingDailyRate: 18.0,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
        hourlyTimeValue: hourlyValue,
      });

      assert.ok(result.timeMetrics);
      const { oneWayDriveMinutes, oneWayTransitMinutes, monthlyTimeDeltaHours, monetizedMonthlyTimeCost, generalizedMonthlySavings } = result.timeMetrics;
      
      const expectedTimeDeltaHours = Math.round((((oneWayTransitMinutes - oneWayDriveMinutes) * 2 * daysPerWeek * 4.33) / 60) * 100) / 100;
      assert.strictEqual(monthlyTimeDeltaHours, expectedTimeDeltaHours);

      const expectedMonetized = Math.round(monthlyTimeDeltaHours * hourlyValue * 100) / 100;
      assert.strictEqual(monetizedMonthlyTimeCost, expectedMonetized);

      const expectedGeneralizedSavings = Math.round((result.monthlySavings - monetizedMonthlyTimeCost) * 100) / 100;
      assert.strictEqual(generalizedMonthlySavings, expectedGeneralizedSavings);
    });
  });
});

