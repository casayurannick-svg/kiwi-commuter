import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCommuteArbitrage, calculateDrivingCost, IRD_MILEAGE_RATE_PER_KM, WEEKS_PER_MONTH } from '../calculator';
import { AT_HOP_7_DAY_CAP, PARKING_TIER_RATES } from '../../config/fares.config';
import { CommuteInput } from '@/types';

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
    assert.strictEqual(result.transit.uncappedWeeklyFare, 85.00);
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
      // 5-day commute across 4 zones: daily return = $17.00, 5 days = $85.00
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

      assert.strictEqual(result.transit.uncappedWeeklyFare, 85.00);
      assert.strictEqual(result.transit.isHopCapApplied, true);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, AT_HOP_7_DAY_CAP);
      assert.strictEqual(result.transit.weeklyTotal, 50.00);
    });

    it('does not apply the cap when weekly transit cost is under $50', () => {
      // 2-day commute in Zone 1: daily return = $6.00, 2 days = $12.00
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

      assert.strictEqual(result.transit.uncappedWeeklyFare, 12.00);
      assert.strictEqual(result.transit.isHopCapApplied, false);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, 12.00);
      assert.strictEqual(result.transit.weeklyTotal, 12.00);
    });

    it('US-20 & US-10: Devonport ferry respects the AT $50 7-day cap at $7.80 inner harbour rate', () => {
      // Devonport to CBD: Inner Harbour Ferry ($7.80 adult one-way, $15.60 daily return)
      // 6 days per week: 6 * $15.60 = $93.60 uncapped -> capped at $50.00
      const result = calculateCommuteArbitrage({
        originSuburbId: 'devonport',
        destinationSuburbId: 'cbd',
        daysPerWeek: 6,
        vehicleType: 'petrol91',
        transitMode: 'FERRY',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(result.transit.singleTripStandardFare, 7.80);
      assert.strictEqual(result.transit.dailyFare, 15.60);
      assert.strictEqual(result.transit.uncappedWeeklyFare, 93.60);
      assert.strictEqual(result.transit.isHopCapApplied, true);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, AT_HOP_7_DAY_CAP);
      assert.strictEqual(result.transit.weeklyTotal, 50.00);
      assert.strictEqual(result.transit.primaryMode, 'Ferry');
    });

    it('US-20: Waiheke route bypasses the $50 cap and applies Fullers rates exceeding the cap', () => {
      // Waiheke to CBD: Fullers360 commercial rate ($32.00 adult one-way, $64.00 daily return)
      // 3 days per week: 3 * $64.00 = $192.00/wk (bypasses $50 cap)
      const result = calculateCommuteArbitrage({
        originSuburbId: 'waiheke',
        destinationSuburbId: 'cbd',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        transitMode: 'FERRY',
        isWaihekeRoute: true,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      assert.strictEqual(result.transit.singleTripStandardFare, 32.00);
      assert.strictEqual(result.transit.dailyFare, 64.00);
      assert.strictEqual(result.transit.uncappedWeeklyFare, 192.00);
      assert.strictEqual(result.transit.isHopCapApplied, false);
      assert.strictEqual(result.transit.weeklyTotal, 192.00);
      assert.ok(result.transit.weeklyTotal > AT_HOP_7_DAY_CAP, 'Waiheke weekly fare must exceed $50 cap');
      assert.strictEqual(result.transit.primaryMode, 'Ferry');
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

    it('FEAT-73 & FEAT-74: correctly synthesizes $0.076/km RUC + energy cost (distance * (efficiency / 100) * kwhRate) for Light EV', () => {
      const distanceRoundTripKm = 18.2;
      const efficiency = 15.0; // kWh/100km
      const kwhRate = 0.28; // $/kWh

      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna', // 9.1km one way, 18.2km round trip
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'EV',
        efficiency,
        kwhRate,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedDailyRuc = Math.round(distanceRoundTripKm * 0.076 * 100) / 100; // 18.2 * 0.076 = 1.38
      const expectedDailyEnergy = Math.round((distanceRoundTripKm * (efficiency / 100) * kwhRate) * 100) / 100; // 18.2 * 0.15 * 0.28 = 0.76
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
      assert.strictEqual(result.driving.dailyFuelCost, expectedDailyEnergy);
      const runningCost = Math.round((result.driving.dailyRucCost + result.driving.dailyFuelCost) * 100) / 100;
      assert.strictEqual(runningCost, Math.round((expectedDailyRuc + expectedDailyEnergy) * 100) / 100);
    });

    it('FEAT-73 & FEAT-74: calculates EV energy math and RUC for Park & Ride First-Mile legs', () => {
      const firstMileDistanceKm = 4.0;
      const firstMileRoundTripKm = 8.0;
      const efficiency = 18.0; // kWh/100km
      const kwhRate = 0.20; // $/kWh

      const result = calculateCommuteArbitrage({
        originCoordinates: [174.7000, -36.8000],
        originAddress: '123 Test St',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        transitMode: 'TRAIN',
        firstMileMode: 'DRIVE',
        firstMileDistanceKm,
        vehicleType: 'EV',
        efficiency,
        kwhRate,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedFirstMileFuel = Math.round(((firstMileRoundTripKm * efficiency / 100) * kwhRate) * 100) / 100; // 8 * 0.18 * 0.20 = 0.288 -> 0.29
      const expectedFirstMileRuc = Math.round((firstMileRoundTripKm * 0.076) * 100) / 100; // 8 * 0.076 = 0.608 -> 0.61
      const expectedDailyCost = Math.round((expectedFirstMileFuel + expectedFirstMileRuc) * 100) / 100; // 0.90

      assert.strictEqual(result.transit.firstMileDailyCost, expectedDailyCost);
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

    it('FEAT-73 & FEAT-74: applies $0.038/km reduced RUC to PHEV with custom propulsion profile', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'PHEV',
        efficiency: 16.5,
        kwhRate: 0.22,
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
      assert.strictEqual(result.driving.monthlyRucCost, 0.0);
    });

    it('BUG-40: applies $0.076/km ($76.00/1,000 km) statutory RUC to DIESEL vehicles', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna', // ~9.1km one way, 18.2km round trip
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel',
        powertrain: 'DIESEL',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedDailyRuc = Math.round(18.2 * 0.076 * 100) / 100; // 1.3832 -> 1.38
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
      assert.strictEqual(result.driving.weeklyRucCost, Math.round(expectedDailyRuc * 5 * 100) / 100); // 6.90
      assert.ok(result.driving.monthlyRucCost > 0, 'Monthly RUC must be greater than 0 for diesel');
      assert.strictEqual(
        result.driving.monthlyRucCost,
        Math.round(6.90 * (52 / 12) * 100) / 100 // 29.90
      );
    });

    it('BUG-40: correctly parses and applies RUC when power=DIESEL alias parameter is supplied', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'albany', // ~19.5km one way, 39.0km round trip
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91', // Mismatched vehicleType to test power override
        power: 'DIESEL',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      } as CommuteInput);

      const expectedDailyRuc = Math.round(39.0 * 0.076 * 100) / 100; // 2.964 -> 2.96
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
      assert.strictEqual(result.driving.weeklyRucCost, Math.round(2.96 * 5 * 100) / 100); // 14.80
      assert.strictEqual(
        result.driving.monthlyRucCost,
        Math.round(14.80 * (52 / 12) * 100) / 100 // 64.13
      );
    });

    it('BUG-40: applies $0.076/km RUC when vehicleType is diesel even if powertrain is omitted', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const expectedDailyRuc = Math.round(18.2 * 0.076 * 100) / 100;
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
    });

    it('BUG-40: normalizes lowercase power/powertrain strings ("diesel") and applies RUC', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        power: 'diesel',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      } as CommuteInput);

      const expectedDailyRuc = Math.round(18.2 * 0.076 * 100) / 100;
      assert.strictEqual(result.driving.dailyRucCost, expectedDailyRuc);
    });

    it('US-09: electric fuel cost scales correctly between HOME_OFFPEAK and PUBLIC_DC while RUC remains identical', () => {
      const offpeakResult = calculateCommuteArbitrage({
        originSuburbId: 'takapuna', // 9.1 km one-way, 18.2 km round trip
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'bev',
        powertrain: 'BEV',
        evChargingSource: 'HOME_OFFPEAK',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      const publicDcResult = calculateCommuteArbitrage({
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'bev',
        powertrain: 'BEV',
        evChargingSource: 'PUBLIC_DC',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      // BEV default economy: 16.5 kWh/100km -> 18.2 km consumes 3.003 kWh
      // HOME_OFFPEAK rate: $0.18/kWh -> 3.003 * 0.18 = $0.54054 -> $0.54
      // PUBLIC_DC rate: $0.85/kWh -> 3.003 * 0.85 = $2.55255 -> $2.55
      assert.strictEqual(offpeakResult.driving.dailyFuelCost, 0.54);
      assert.strictEqual(publicDcResult.driving.dailyFuelCost, 2.55);

      // Verify statutory RUC is identical ($0.076/km * 18.2 = $1.3832 -> $1.38) and decoupled from charging source
      assert.strictEqual(offpeakResult.driving.dailyRucCost, 1.38);
      assert.strictEqual(publicDcResult.driving.dailyRucCost, 1.38);
      assert.strictEqual(offpeakResult.driving.dailyRucCost, publicDcResult.driving.dailyRucCost);
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

      assert.strictEqual(adult.transit.singleTripStandardFare, 6.60); // 3 zones
      assert.strictEqual(tertiary.transit.singleTripConcessionFare, 5.28); // 20% off
    });
  });

  describe('US-13: Monetized Travel Time & Opportunity Cost', () => {
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

    it('returns 0 for monetized time cost when hourlyTimeValue = 0', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 4,
        vehicleType: 'petrol91',
        parkingDailyRate: 18.0,
        parkingDaysPerWeek: 4,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
        hourlyTimeValue: 0,
      });

      assert.ok(result.timeMetrics, 'timeMetrics object must be present');
      assert.strictEqual(result.timeMetrics.monetizedMonthlyTimeCost, 0);
    });

    it('evaluates a 15-minute one-way drive time advantage at 4 days/week with a $20/hr time value', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 4,
        vehicleType: 'petrol91',
        parkingDailyRate: 18.0,
        parkingDaysPerWeek: 4,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
        hourlyTimeValue: 20,
        drivingTimeMins: 20,
        transitTimeMins: 35, // 15-minute one-way drive time advantage (transit takes 15 min longer)
      });

      assert.ok(result.timeMetrics);
      assert.strictEqual(result.timeMetrics.oneWayDriveMinutes, 20);
      assert.strictEqual(result.timeMetrics.oneWayTransitMinutes, 35);

      // Assert monthly hours saved is roughly 8.66 (((35 - 20) * 2 * 4 * 4.33) / 60 = 8.66)
      assert.strictEqual(result.timeMetrics.monthlyTimeDeltaHours, 8.66);
      assert.ok(
        Math.abs(result.timeMetrics.monthlyTimeDeltaHours - 8.66) < 0.05,
        `Expected monthly hours saved roughly 8.66, got ${result.timeMetrics.monthlyTimeDeltaHours}`
      );

      // Assert monetized time cost is roughly $173.20 (8.66 * 20 = 173.20)
      assert.strictEqual(result.timeMetrics.monetizedMonthlyTimeCost, 173.2);
      assert.ok(
        Math.abs(result.timeMetrics.monetizedMonthlyTimeCost - 173.2) < 0.1,
        `Expected monetized time cost roughly $173.20, got ${result.timeMetrics.monetizedMonthlyTimeCost}`
      );
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

  describe('US-11: E-Bike Mode and Payback Timeline', () => {
    it('asserts that an EBIKE commute correctly zeros out parking/RUC and accurately calculates the payback period', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'bev', // EV normally incurs RUC
        parkingDailyRate: 20, // normally incurs parking
        parkingDaysPerWeek: 5,
        transitMode: 'EBIKE',
        upfrontSetupCost: 2000,
        ebikeCostPerKm: 0.0027,
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
        concession: 'adult',
      };

      const result = calculateCommuteArbitrage(input);

      // BUG-44: Assert that the private vehicle baseline retains parking and RUC
      assert.strictEqual(result.driving.dailyParkingCost, 20, 'Parking cost must be retained in private vehicle baseline');
      assert.strictEqual(result.driving.dailyRucCost, 2.96, 'BEV RUC cost must be retained in private vehicle baseline');
      assert.ok(result.driving.monthlyParkingCost > 0, 'Monthly parking must be retained in private vehicle baseline');
      assert.ok(result.driving.monthlyRucCost > 0, 'Monthly RUC must be retained in private vehicle baseline');

      // Assert energy cost based on distance * ebikeCostPerKm
      const distanceRoundTripKm = result.driving.distanceRoundTripKm;
      const expectedDailyEnergy = Math.round(distanceRoundTripKm * 0.0027 * 100) / 100;
      assert.strictEqual(result.transit.dailyFare, expectedDailyEnergy, 'Daily transit fare should equal e-bike energy cost');
      assert.strictEqual(result.transit.primaryMode, 'E-Bike', 'Transit primaryMode should be E-Bike');

      // Assert paybackMonths calculation (upfrontSetupCost / monthly car savings)
      const monthlyCarSavings = result.driving.monthlyTotal - result.transit.monthlyTotal;
      const expectedPaybackMonths = Math.round((2000 / monthlyCarSavings) * 10) / 10;
      assert.ok(result.paybackMonths !== null && result.paybackMonths !== undefined && result.paybackMonths > 0, 'paybackMonths must be computed and positive');
      assert.strictEqual(result.paybackMonths, expectedPaybackMonths, 'paybackMonths must equal upfrontSetupCost / monthlyCarSavings');
    });
  });

  describe('US-23: Micro-Mobility First/Last Mile (Scooter & Ride)', () => {
    it('accurately applies 15 km/h scooter speed override to recalculate transit duration', () => {
      // Baseline without scooter (pure transit)
      const baseResult = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 15,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      });

      // Micromobility with default 2.0 km walk distance
      const scooterResult = calculateCommuteArbitrage({
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 15,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'MICROMOBILITY_TRANSIT',
        scooterOwnership: 'RENTAL',
        walkDistanceKm: 2.0,
      });

      // 2.0 km walking at 5 km/h = 24 mins.
      // 2.0 km scooting at 15 km/h = 8 mins.
      // Saved time per leg = 16 mins.
      // Scooter transit time should be base transit time - 16 mins.
      const expectedDuration = Math.round(baseResult.transit.estimatedTransitTimeMins - 16);
      assert.strictEqual(scooterResult.transit.estimatedTransitTimeMins, expectedDuration);
      assert.strictEqual(scooterResult.transit.scooterDurationMins, 8);
    });

    it('accurately computes rental scooter fees ($1 unlock + $0.45/min) and adds them to AT HOP fare', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 20,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'MICROMOBILITY_TRANSIT',
        scooterOwnership: 'RENTAL',
        walkDistanceKm: 2.0, // 8 mins per leg
      };

      const result = calculateCommuteArbitrage(input);

      // Per leg: $1.00 + (8 mins * $0.45) = $1.00 + $3.60 = $4.60
      // Daily return (2 legs): $4.60 * 2 = $9.20
      assert.strictEqual(result.transit.scooterRentalFeesDaily, 9.20);

      // Weekly rental fees: $9.20 * 5 days = $46.00
      // Monthly rental fees: $46.00 * (52 / 12) = $199.33
      assert.strictEqual(result.transit.scooterRentalFeesMonthly, 199.33);

      // Albany to CBD is capped at AT HOP $50/week ($216.67/month)
      // Combined monthly transit = $216.67 + $199.33 = $416.00
      assert.strictEqual(result.transit.hopFareMonthly, 216.67);
      assert.strictEqual(result.transit.monthlyTotal, 416.00);
      assert.strictEqual(result.transit.primaryMode, 'Scooter & Ride');
    });

    it('accurately computes owned scooter payback timeline against car commute', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 20,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
        transitMode: 'MICROMOBILITY_TRANSIT',
        scooterOwnership: 'OWNED',
        scooterCapitalCost: 900,
        walkDistanceKm: 2.0,
      };

      const result = calculateCommuteArbitrage(input);

      // Owned scooter incurs $0 in rental fees
      assert.strictEqual(result.transit.scooterRentalFeesDaily, undefined);
      assert.strictEqual(result.transit.scooterRentalFeesMonthly, undefined);
      // Monthly transit is purely the AT HOP transit fare
      assert.strictEqual(result.transit.monthlyTotal, 216.67);

      // Payback period = 900 / monthlyCarSavings
      const monthlyCarSavings = result.driving.monthlyTotal - result.transit.monthlyTotal;
      const expectedPayback = Math.round((900 / monthlyCarSavings) * 10) / 10;
      assert.ok(result.paybackMonths !== null && result.paybackMonths !== undefined && result.paybackMonths > 0);
      assert.strictEqual(result.paybackMonths, expectedPayback);
      assert.strictEqual(result.scooterOwnership, 'OWNED');
    });
  });

  describe('US-24: Empty String & Fallback Fuel Price Handling', () => {
    it('applies DEFAULT_FUEL_RATE when fuelPriceOverride is undefined or NaN during calculation execution', () => {
      // Input with fuelPriceOverride set to undefined (as when a user empties the text field)
      const emptyInput: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
        fuelPriceOverride: undefined,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(emptyInput);

      // Takapuna to CBD: 9.1 km one-way, 18.2 km round trip
      // Petrol 91: 7.2 L/100km * 18.2 km = 1.3104 L
      // DEFAULT_FUEL_RATE: 2.72 -> 1.3104 * 2.72 = $3.564288 -> round2 = $3.56
      assert.strictEqual(result.driving.dailyFuelCost, 3.56);

      // Input with NaN override
      const nanInput: CommuteInput = {
        ...emptyInput,
        fuelPriceOverride: NaN,
      };
      const nanResult = calculateCommuteArbitrage(nanInput);
      assert.strictEqual(nanResult.driving.dailyFuelCost, 3.56);
    });
  });

  describe('US-26: Conventional Hybrid (HEV) Powertrain Option', () => {
    it('asserts that an HEV commute calculates fuel correctly with exactly zero RUC', () => {
      const hevInput: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'hev',
        powertrain: 'HEV',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(hevInput);

      // Takapuna to CBD: 9.1 km one-way, 18.2 km round trip
      // HEV default: 4.5 L/100km * 18.2 km = 0.819 L
      // Standard petrol price: $2.72/L -> 0.819 * 2.72 = $2.22768 -> round2 = $2.23
      assert.strictEqual(result.driving.dailyFuelCost, 2.23);
      assert.strictEqual(result.driving.weeklyFuelCost, 11.15);
      assert.strictEqual(result.driving.monthlyFuelCost, 48.32);

      // Zero RUC assertions
      assert.strictEqual(result.driving.dailyRucCost, 0);
      assert.strictEqual(result.driving.weeklyRucCost, 0);
      assert.strictEqual(result.driving.monthlyRucCost, 0);

      // Also verify when powertrain: 'HEV' is specified with fallback vehicleType
      const powertrainOnlyInput: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        powertrain: 'HEV',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const ptResult = calculateCommuteArbitrage(powertrainOnlyInput);
      assert.strictEqual(ptResult.driving.dailyFuelCost, 2.23);
      assert.strictEqual(ptResult.driving.dailyRucCost, 0);
      assert.strictEqual(ptResult.driving.weeklyRucCost, 0);
      assert.strictEqual(ptResult.driving.monthlyRucCost, 0);

      // Also verify with custom fuel price
      const customPriceInput: CommuteInput = {
        ...hevInput,
        fuelPriceOverride: 2.80,
      };
      const customResult = calculateCommuteArbitrage(customPriceInput);
      assert.strictEqual(customResult.driving.dailyFuelCost, 2.29);
      assert.strictEqual(customResult.driving.dailyRucCost, 0);
    });

    it('prioritizes custom L/100km override when provided and falls back to baseline average', () => {
      // 1. HEV with custom 3.5 L/100km override (vs default 4.5 L/100km)
      // Takapuna to CBD: 18.2 km round trip.
      // 18.2 km * 0.035 * $2.72/L = $1.73264 -> $1.73
      const hevCustomInput: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'hev',
        powertrain: 'HEV',
        consumptionOverride: 3.5,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const hevCustomRes = calculateCommuteArbitrage(hevCustomInput);
      assert.strictEqual(hevCustomRes.driving.dailyFuelCost, 1.73);

      // Fallback when consumptionOverride is undefined:
      const hevFallbackRes = calculateCommuteArbitrage({ ...hevCustomInput, consumptionOverride: undefined });
      assert.strictEqual(hevFallbackRes.driving.dailyFuelCost, 2.23);

      // 2. Petrol 91 with custom 6.0 L/100km override (vs default 7.2 L/100km)
      // 18.2 km * 0.06 * $2.72/L = $2.97024 -> $2.97
      const petrolCustomInput: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
        consumptionOverride: 6.0,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const petrolCustomRes = calculateCommuteArbitrage(petrolCustomInput);
      assert.strictEqual(petrolCustomRes.driving.dailyFuelCost, 2.97);

      // Fallback when consumptionOverride is undefined:
      const petrolFallbackRes = calculateCommuteArbitrage({ ...petrolCustomInput, consumptionOverride: undefined });
      assert.strictEqual(petrolFallbackRes.driving.dailyFuelCost, 3.56);

      // 3. PHEV with custom 4.0 L/100km petrol efficiency override (vs default 6.0 L/100km)
      // Takapuna round trip is 18.2 km (< 35 km electric), so use Albany (18.3 km one way * 2 = 36.6 km round trip)
      // Albany round trip = 39.0 km -> 35 km electric, 4.0 km petrol
      // Default PHEV (6.0 L/100km): 4.0 km * 0.06 * 2.72 = $0.6528 petrol + 35 * 0.165 * 0.18 = $1.0395 -> $1.69
      // Custom PHEV (4.0 L/100km): 4.0 km * 0.04 * 2.72 = $0.4352 petrol + 35 * 0.165 * 0.18 = $1.0395 -> $1.47
      const phevCustomInput: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'phev',
        powertrain: 'PHEV',
        consumptionOverride: 4.0,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const phevCustomRes = calculateCommuteArbitrage(phevCustomInput);
      assert.strictEqual(phevCustomRes.driving.dailyFuelCost, 1.47);

      // Fallback when consumptionOverride is undefined:
      const phevFallbackRes = calculateCommuteArbitrage({ ...phevCustomInput, consumptionOverride: undefined });
      assert.strictEqual(phevFallbackRes.driving.dailyFuelCost, 1.69);
    });
  });

  describe('US-28: Address Geocoding & Nearest Station Spatial Search with First-Mile Running Costs', () => {
    it('finds the closest transit station to origin coordinates and computes first-mile driving costs separately', () => {
      // Albany coordinates: [174.7082, -36.7295]
      // Albany Busway Station is right there
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        originAddress: '120 Dairy Flat Highway, Albany',
        destinationAddress: '188 Quay St, CBD',
        originCoordinates: [174.7082, -36.7295],
        destinationCoordinates: [174.7645, -36.8485],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        firstMileMode: 'DRIVE',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);

      // Verify nearest station was resolved
      assert.ok(result.nearestStation, 'Nearest station must be resolved');
      assert.strictEqual(result.nearestStation.name, 'Albany Busway Station');
      assert.strictEqual(result.nearestStation.mode, 'Northern Busway');
      assert.strictEqual(result.nearestStation.hasParkAndRide, true);

      // Verify first-mile running cost is calculated separately and present
      assert.ok(result.transit.firstMileDailyCost !== undefined, 'First mile daily cost must be present');
      assert.strictEqual(result.transit.firstMileMode, 'DRIVE');
      assert.strictEqual(result.transit.nearestStationName, 'Albany Busway Station');

      // Verify transit total aggregates AT HOP fare and first-mile driving cost
      // Base AT HOP fare for Albany (Z3) is $6.00 one-way -> $12.00/day uncapped, capped at $50/week ($216.67/mo)
      // First-mile driving cost is added on top of the AT HOP fare
      assert.ok(result.transit.firstMileMonthlyCost! > 0, 'First-mile monthly cost should be positive');
      assert.strictEqual(
        result.transit.monthlyTotal,
        Math.round((result.transit.hopFareMonthly! + result.transit.firstMileMonthlyCost!) * 100) / 100
      );

      // Verify journey legs array is constructed with 3 legs
      assert.ok(Array.isArray(result.journeyLegs), 'Journey legs must be an array');
      assert.strictEqual(result.journeyLegs.length, 3, 'Must have First-Mile, Transit, and Last-Mile legs');

      const [firstLeg, transitLeg, lastLeg] = result.journeyLegs;
      assert.strictEqual(firstLeg.type, 'FIRST_MILE');
      assert.strictEqual(firstLeg.mode, 'DRIVE');
      assert.strictEqual(firstLeg.destinationName, 'Albany Busway Station');

      assert.strictEqual(transitLeg.type, 'TRANSIT');
      assert.strictEqual(transitLeg.originName, 'Albany Busway Station');
      assert.strictEqual(transitLeg.cost, 8.50); // 4-zone standard adult fare ($8.50)

      assert.strictEqual(lastLeg.type, 'LAST_MILE');
      assert.strictEqual(lastLeg.mode, 'WALK');
      assert.strictEqual(lastLeg.title, 'Walk to Desk');
      assert.strictEqual(lastLeg.cost, 0);
    });

    it('handles walk mode for first mile with zero first-mile cost', () => {
      const input: CommuteInput = {
        originSuburbId: 'remuera',
        destinationSuburbId: 'cbd',
        originCoordinates: [174.795, -36.885],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        firstMileMode: 'WALK',
        firstMileDistanceKm: 0.8,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);
      assert.strictEqual(result.transit.firstMileDailyCost, undefined);
      assert.strictEqual(result.transit.firstMileMonthlyCost, undefined);
      assert.ok(result.journeyLegs);
      assert.strictEqual(result.journeyLegs[0].mode, 'WALK');
      assert.strictEqual(result.journeyLegs[0].cost, 0);
    });
  });

  describe('US-10: 2026 AT Fare Update & Ferry Pricing Fix', () => {
    it('calculates Devonport to Parnell with $7.80 Inner Harbour ferry base fare and $50/wk cap', () => {
      const input: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        concession: 'adult',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);
      // Devonport to Parnell uses Inner Harbour Ferry
      assert.strictEqual(result.transit.singleTripStandardFare, 7.80, 'Must use $7.80 inner harbour ferry base fare');
      assert.strictEqual(result.transit.singleTripConcessionFare, 7.80);
      assert.strictEqual(result.transit.dailyFare, 15.60, 'Daily return fare is 2 * $7.80 = $15.60');
      assert.strictEqual(result.transit.uncappedWeeklyFare, 78.00, '5 days * $15.60 = $78.00');
      assert.strictEqual(result.transit.isHopCapApplied, true, '5 days ($78) exceeds $50 AT HOP cap');
      assert.strictEqual(result.transit.weeklyTotal, 50.00, 'Capped at $50.00/wk');
      assert.strictEqual(result.transit.primaryMode, 'Ferry');
    });

    it('calculates 3-day commute Devonport to Parnell under the $50 cap ($46.80/wk)', () => {
      const input: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        concession: 'adult',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);
      assert.strictEqual(result.transit.singleTripStandardFare, 7.80);
      assert.strictEqual(result.transit.dailyFare, 15.60);
      assert.strictEqual(result.transit.uncappedWeeklyFare, 46.80);
      assert.strictEqual(result.transit.isHopCapApplied, false, '3 days ($46.80) is under $50 cap');
      assert.strictEqual(result.transit.weeklyTotal, 46.80);
    });

    it('applies ferry classification when Google Routes API step specifies travelMode: FERRY', () => {
      const input: CommuteInput = {
        originSuburbId: 'takapuna',
        destinationSuburbId: 'cbd',
        daysPerWeek: 4,
        vehicleType: 'petrol91',
        concession: 'adult',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitSteps: [
          { line: 'DEV', durationMins: 12, travelMode: 'FERRY' },
          { line: 'InnerLink', durationMins: 8, travelMode: 'TRANSIT' },
        ],
      };

      const result = calculateCommuteArbitrage(input);
      assert.strictEqual(result.transit.singleTripStandardFare, 7.80, 'Must detect ferry from transitSteps travelMode');
      assert.strictEqual(result.transit.dailyFare, 15.60);
      assert.strictEqual(result.transit.uncappedWeeklyFare, 62.40);
      assert.strictEqual(result.transit.isHopCapApplied, true);
      assert.strictEqual(result.transit.weeklyTotal, 50.00);
      assert.strictEqual(result.transit.primaryMode, 'Ferry');
    });

    it('applies concession rates (Tertiary & Youth/Child) to Inner Harbour ferry fares', () => {
      const tertiaryInput: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        concession: 'tertiary',
        fareConcession: 'TERTIARY',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const tertiaryResult = calculateCommuteArbitrage(tertiaryInput);
      assert.strictEqual(tertiaryResult.transit.singleTripStandardFare, 7.80);
      assert.strictEqual(tertiaryResult.transit.singleTripConcessionFare, 6.24, 'Tertiary gets 20% off ($6.24)');
      assert.strictEqual(tertiaryResult.transit.dailyFare, 12.48);
      assert.strictEqual(tertiaryResult.transit.weeklyTotal, 37.44);

      const childInput: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        concession: 'youth',
        fareConcession: 'CHILD',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const childResult = calculateCommuteArbitrage(childInput);
      assert.strictEqual(childResult.transit.singleTripStandardFare, 7.80);
      assert.strictEqual(childResult.transit.singleTripConcessionFare, 3.90, 'Youth/Child gets 50% off ($3.90)');
      assert.strictEqual(childResult.transit.dailyFare, 7.80);
      assert.strictEqual(childResult.transit.weeklyTotal, 23.40);
    });

    it('BUG-37: scales public transport fares by carpool passenger count', () => {
      // 1. Standard Bus/Train (1 zone: Epsom to CBD)
      const bus1Pax: CommuteInput = {
        originSuburbId: 'epsom',
        destinationSuburbId: 'cbd',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const bus2Pax: CommuteInput = {
        ...bus1Pax,
        carpoolPassengers: 2,
      };

      const resBus1 = calculateCommuteArbitrage(bus1Pax);
      const resBus2 = calculateCommuteArbitrage(bus2Pax);

      assert.strictEqual(resBus1.transit.singleTripStandardFare, 3.00);
      assert.strictEqual(resBus1.transit.dailyFare, 6.00);
      assert.strictEqual(resBus2.transit.singleTripStandardFare, 6.00, 'Must double one-way fare for 2 pax');
      assert.strictEqual(resBus2.transit.dailyFare, 12.00, 'Must double daily return fare for 2 pax');
      assert.strictEqual(resBus2.transit.weeklyTotal, 36.00);

      // 2. Ferry Route (Devonport to Parnell)
      const ferry1Pax: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const ferry2Pax: CommuteInput = {
        ...ferry1Pax,
        carpoolPassengers: 2,
      };

      const resFerry1 = calculateCommuteArbitrage(ferry1Pax);
      const resFerry2 = calculateCommuteArbitrage(ferry2Pax);

      assert.strictEqual(resFerry1.transit.singleTripStandardFare, 7.80);
      assert.strictEqual(resFerry1.transit.dailyFare, 15.60);
      assert.strictEqual(resFerry2.transit.singleTripStandardFare, 15.60, 'Must double ferry one-way fare for 2 pax');
      assert.strictEqual(resFerry2.transit.dailyFare, 31.20, 'Must double ferry daily return fare for 2 pax');

      // Check JourneyLeg formatting: "$15.60 total (2 pax)"
      const ferryLeg = resFerry2.journeyLegs?.find((l) => l.type === 'TRANSIT');
      assert.strictEqual(ferryLeg?.cost, 15.60);
      assert.strictEqual(ferryLeg?.costFormatted, '$15.60 total (2 pax)');

      // 3. Rolling Fare Cap (AT HOP $50/week) scaling
      const capped1Pax: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };
      const capped2Pax: CommuteInput = {
        ...capped1Pax,
        carpoolPassengers: 2,
      };

      const resCapped1 = calculateCommuteArbitrage(capped1Pax);
      const resCapped2 = calculateCommuteArbitrage(capped2Pax);

      assert.strictEqual(resCapped1.transit.weeklyTotal, 50.00);
      assert.strictEqual(resCapped2.transit.hopCappedWeeklyFare, 100.00, 'Must scale $50 cap to $100 for 2 commuters');
      assert.strictEqual(resCapped2.transit.weeklyTotal, 100.00);
    });
  });

  describe('US-38: Fixed Vehicle Ownership Costs (WOF, Rego, Insurance)', () => {
    it('verifies baseline scenario with default WOF ($85), Rego ($173), and Insurance ($1,311) amortized with 70% commute apportionment', () => {
      const baselineInput: CommuteInput = {
        originSuburbId: 'epsom',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const res = calculateCommuteArbitrage(baselineInput);

      assert.strictEqual(res.driving.dailyFixedCost, 4.22);
      assert.strictEqual(res.driving.weeklyFixedCost, 21.10);
      assert.strictEqual(res.driving.monthlyFixedCost, 91.43);
      assert.strictEqual(res.driving.annualFixedCost, 1097.16);

      const fuelDaily = res.driving.dailyFuelCost;
      assert.strictEqual(res.driving.dailyTotal, Math.round((fuelDaily + 4.22) * 100) / 100);
    });

    it('verifies mutual exclusivity and custom insurance override for 2016 Isuzu MU-X ($1,850/yr)', () => {
      const isuzuMuxInput: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        annualWof: 85,
        annualRego: 173,
        insuranceEnabled: true,
        defaultInsurance: 1311,
        customInsurance: 1850,
      };

      const res = calculateCommuteArbitrage(isuzuMuxInput);

      assert.strictEqual(res.driving.dailyFixedCost, 5.68);
      assert.strictEqual(res.driving.weeklyFixedCost, 28.40);
      assert.strictEqual(res.driving.monthlyFixedCost, 123.07);
    });

    it('verifies custom insurance override for 2018 Honda Jazz ($950/yr)', () => {
      const hondaJazzInput: CommuteInput = {
        originSuburbId: 'epsom',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        annualWof: 85,
        annualRego: 173,
        insuranceEnabled: true,
        customInsurance: 950,
      };

      const res = calculateCommuteArbitrage(hondaJazzInput);

      assert.strictEqual(res.driving.dailyFixedCost, 3.25);
      assert.strictEqual(res.driving.weeklyFixedCost, 16.25);
      assert.strictEqual(res.driving.monthlyFixedCost, 70.42);
    });

    it('verifies exclusion when insurance is disabled (insuranceEnabled: false)', () => {
      const noInsuranceInput: CommuteInput = {
        originSuburbId: 'epsom',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        annualWof: 85,
        annualRego: 173,
        insuranceEnabled: false,
      };

      const res = calculateCommuteArbitrage(noInsuranceInput);

      assert.strictEqual(res.driving.dailyFixedCost, 0.69);
      assert.strictEqual(res.driving.weeklyFixedCost, 3.45);
      assert.strictEqual(res.driving.monthlyFixedCost, 14.95);
    });
  });

  describe('FEAT-60: IRD True Cost mileage toggle (Driving comparison logic)', () => {
    it('verifies IRD_MILEAGE_RATE_PER_KM is defined as 1.20', () => {
      assert.strictEqual(IRD_MILEAGE_RATE_PER_KM, 1.20);
    });

    it('verifies calculateDrivingCost returns distance_in_km * IRD_MILEAGE_RATE_PER_KM for sample distances in IRD_TRUE_COST mode', () => {
      // Test sample distances: 10km, 25km, 50km, 100km
      assert.strictEqual(calculateDrivingCost(10, 'IRD_TRUE_COST'), 12.00);
      assert.strictEqual(calculateDrivingCost(25, 'IRD_TRUE_COST'), 30.00);
      assert.strictEqual(calculateDrivingCost(50, 'IRD_TRUE_COST'), 60.00);
      assert.strictEqual(calculateDrivingCost(100, 'IRD_TRUE_COST'), 120.00);
    });

    it('verifies calculateDrivingCost returns expected fuel calculation in FUEL mode for sample distances', () => {
      // Petrol 91 default: 7.2 L/100km, $2.72/L
      // 25km: (25 * 7.2 / 100) * 2.72 = 4.896 -> 4.90
      // 50km: (50 * 7.2 / 100) * 2.72 = 9.792 -> 9.79
      // 100km: (100 * 7.2 / 100) * 2.72 = 19.584 -> 19.58
      assert.strictEqual(calculateDrivingCost(25, 'FUEL'), 4.90);
      assert.strictEqual(calculateDrivingCost(50, 'FUEL'), 9.79);
      assert.strictEqual(calculateDrivingCost(100, 'FUEL'), 19.58);
    });

    it('FEAT-73 & FEAT-74: calculateDrivingCost computes EV energy and RUC tiers correctly', () => {
      // 50km EV: energy = (50 * 16 / 100) * 0.25 = 2.00, RUC = 50 * 0.076 = 3.80. Total = 5.80
      const evCost = calculateDrivingCost(50, 'FUEL', {
        vehicleType: 'EV',
        efficiency: 16.0,
        kwhRate: 0.25,
        includeRuc: true,
      });
      assert.strictEqual(evCost, 5.80);

      // 50km PHEV: RUC = 50 * 0.038 = 1.90
      // 35km electric: (35 * 16.5 / 100) * 0.20 = 1.155
      // 15km petrol: (15 * 6.0 / 100) * 2.80 = 2.52
      // fuel = 3.675 -> 3.68
      // RUC = 1.90
      // total = 3.675 + 1.90 = 5.575 -> 5.58
      const phevCost = calculateDrivingCost(50, 'FUEL', {
        vehicleType: 'PHEV',
        efficiency: 16.5,
        kwhRate: 0.20,
        consumption: 6.0,
        fuelPrice: 2.80,
        includeRuc: true,
      });
      assert.strictEqual(phevCost, 5.58);
    });

    it('verifies calculateCommuteArbitrage computes IRD True Cost when calculationMode is IRD_TRUE_COST', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        distanceKm: 20, // 20 km one-way -> 40 km round-trip
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        calculationMode: 'IRD_TRUE_COST',
      };

      const result = calculateCommuteArbitrage(input);

      // Round trip: 40 km * $1.20 = $48.00/day
      assert.strictEqual(result.driving.distanceRoundTripKm, 40);
      assert.strictEqual(result.driving.dailyIrdCost, 48.00);
      assert.strictEqual(result.driving.dailyTotal, 48.00);
      assert.strictEqual(result.driving.dailyFuelCost, 0);
      assert.strictEqual(result.driving.dailyRucCost, 0);
      assert.strictEqual(result.driving.dailyFixedCost, 0);

      // Weekly: 5 days * 48.00 = 240.00
      assert.strictEqual(result.driving.weeklyIrdCost, 240.00);
      assert.strictEqual(result.driving.weeklyTotal, 240.00);

      // Monthly: 240.00 * (52 / 12) = 1040.00
      assert.strictEqual(result.driving.monthlyIrdCost, 1040.00);
      assert.strictEqual(result.driving.monthlyTotal, 1040.00);

      // Annual: 1040.00 * 12 = 12480.00
      assert.strictEqual(result.driving.annualTotal, 12480.00);
      assert.strictEqual(result.driving.calculationMode, 'IRD_TRUE_COST');
      assert.strictEqual(result.calculationMode, 'IRD_TRUE_COST');
    });

    it('verifies calculationMode defaults to FUEL preserving standard fuel and ownership breakdown', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        distanceKm: 20,
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.driving.calculationMode, 'FUEL');
      assert.strictEqual(result.calculationMode, 'FUEL');
      assert.strictEqual(result.driving.dailyIrdCost, undefined);
      assert.ok(result.driving.dailyFuelCost > 0, 'Fuel cost must be non-zero in FUEL mode');
      assert.ok((result.driving.dailyFixedCost ?? 0) > 0, 'Fixed costs must be non-zero in FUEL mode');
    });

    it('BUG-61: calculateDrivingCost strictly bypasses and zeroes out WOF, Rego, Insurance, RUC, and Wear & Tires in IRD_TRUE_COST mode', () => {
      // 50 km in IRD mode with all granular items enabled
      const costWithAllOptions = calculateDrivingCost(50, 'IRD_TRUE_COST', {
        includeMaintenance: true,
        maintenanceRate: 0.18,
        includeRuc: true,
        includeFixedCosts: true,
        annualWof: 100,
        annualRego: 200,
        annualInsurance: 1500,
        parkingCost: 15.00,
      });

      // 50 km * $1.20 = $60.00 + $15.00 parking = $75.00
      assert.strictEqual(costWithAllOptions, 75.00);

      // Same distance with no granular options passed
      const costClean = calculateDrivingCost(50, 'IRD_TRUE_COST', {
        parkingCost: 15.00,
      });
      assert.strictEqual(costClean, 75.00);
      assert.strictEqual(costWithAllOptions, costClean, 'Granular options must not alter IRD True Cost');
    });

    it('BUG-61: calculateCommuteArbitrage strictly zeroes out fuel, RUC, maintenance wear, and fixed ownership in IRD_TRUE_COST mode', () => {
      const input: CommuteInput = {
        originSuburbId: 'albany',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'diesel', // Diesel carries $0.076/km RUC
        distanceKm: 20, // 40 km round-trip
        parkingDailyRate: 10.0,
        parkingDaysPerWeek: 5,
        concession: 'adult',
        includeMaintenanceWear: true, // AA Wear & Tires ($0.18/km)
        annualWof: 95,
        annualRego: 185,
        insuranceEnabled: true,
        customInsurance: 1500,
        carpoolPassengers: 1,
        calculationMode: 'IRD_TRUE_COST',
      };

      const result = calculateCommuteArbitrage(input);

      // Verify all granular items are strictly zeroed out
      assert.strictEqual(result.driving.dailyFuelCost, 0, 'dailyFuelCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.dailyRucCost, 0, 'dailyRucCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.dailyMaintenanceCost, 0, 'dailyMaintenanceCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.dailyFixedCost, 0, 'dailyFixedCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.monthlyFuelCost, 0, 'monthlyFuelCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.monthlyRucCost, 0, 'monthlyRucCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.monthlyMaintenanceCost, 0, 'monthlyMaintenanceCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.monthlyFixedCost, 0, 'monthlyFixedCost must be 0 in IRD mode');
      assert.strictEqual(result.driving.annualFixedCost, 0, 'annualFixedCost must be 0 in IRD mode');

      // Driving totals must strictly equal distance * 1.20 + parking
      // 40 km * 1.20 = $48.00 IRD + $10.00 parking = $58.00/day
      assert.strictEqual(result.driving.dailyIrdCost, 48.00);
      assert.strictEqual(result.driving.dailyParkingCost, 10.00);
      assert.strictEqual(result.driving.dailyTotal, 58.00);

      // Weekly: 5 * 48.00 + 5 * 10.00 = 240.00 + 50.00 = 290.00
      assert.strictEqual(result.driving.weeklyTotal, 290.00);

      // Monthly: 290.00 * (52 / 12) = 1256.67
      assert.strictEqual(result.driving.monthlyTotal, 1256.67);

      // Delta savings must use effective driving total, avoiding double dipping
      assert.strictEqual(result.dailySavings, Math.round((58.00 - result.transit.dailyFare) * 100) / 100);
      assert.strictEqual(result.monthlySavings, Math.round((1256.67 - result.transit.monthlyTotal) * 100) / 100);
    });

    it('BUG-54: all-bus route does not prepend "Ferry" or set Ferry mode when transitMode is FERRY', () => {
      const input: CommuteInput = {
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY', // User requested ferry, but only bus route was returned
        transitLines: ['11', 'WX1'],
        transitSteps: [
          { line: '11', durationMins: 15, travelMode: 'BUS' },
          { line: 'WX1', durationMins: 25, travelMode: 'BUS' },
        ],
      };

      const result = calculateCommuteArbitrage(input);

      // Verify that primaryMode is NOT Ferry
      assert.strictEqual(result.transit.primaryMode, 'Bus', 'primaryMode must be Bus, not Ferry');

      // Verify transit leg title does not prepend Ferry
      const transitLeg = result.journeyLegs?.find((l) => l.type === 'TRANSIT');
      assert.ok(transitLeg, 'Transit leg must exist');
      assert.strictEqual(transitLeg.mode, 'BUS', 'Transit leg mode must be BUS');
      assert.strictEqual(transitLeg.title, 'Bus 11 + WX1 Ride', 'Transit leg title must not be Ferry 11 + WX1 Ride');
      assert.strictEqual(transitLeg.iconName, 'Bus', 'Transit leg iconName must be Bus');
    });

    it('BUG-54: route with actual ferry step correctly identifies as Ferry mode', () => {
      const input: CommuteInput = {
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
        transitLines: ['HOBH Ferry'],
        transitSteps: [
          { line: 'HOBH Ferry', durationMins: 35, travelMode: 'FERRY' },
        ],
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.transit.primaryMode, 'Ferry');
      assert.strictEqual(result.transit.singleTripStandardFare, 10.40, 'Hobsonville ferry single trip standard fare must be $10.40');
      assert.strictEqual(result.transit.singleTripConcessionFare, 10.40);

      const transitLeg = result.journeyLegs?.find((l) => l.type === 'TRANSIT');
      assert.ok(transitLeg);
      assert.strictEqual(transitLeg.mode, 'FERRY');
      assert.strictEqual(transitLeg.cost, 10.40, 'Transit leg cost must reflect $10.40 Mid-Harbour fare');
      assert.strictEqual(transitLeg.iconName, 'Ship', 'Transit leg iconName must be Ship');
      assert.strictEqual(transitLeg.title, 'Ferry HOBH Ferry Ride');
    });

    it('calculates West Harbour and Half Moon Bay ferry commutes at $10.40 Mid-Harbour rate', () => {
      // West Harbour
      const whResult = calculateCommuteArbitrage({
        originSuburbId: 'west-harbour',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
        transitSteps: [
          { line: 'West Harbour Ferry', durationMins: 45, travelMode: 'FERRY' },
        ],
      });
      assert.strictEqual(whResult.transit.primaryMode, 'Ferry');
      assert.strictEqual(whResult.transit.singleTripStandardFare, 10.40);
      assert.strictEqual(whResult.transit.isHopCapApplied, true);
      assert.strictEqual(whResult.transit.weeklyTotal, 50.00);

      // Half Moon Bay
      const hmbResult = calculateCommuteArbitrage({
        originSuburbId: 'half-moon-bay',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
      });
      assert.strictEqual(hmbResult.transit.primaryMode, 'Ferry');
      assert.strictEqual(hmbResult.transit.singleTripStandardFare, 10.40);
      assert.strictEqual(hmbResult.transit.isHopCapApplied, true);
      assert.strictEqual(hmbResult.transit.weeklyTotal, 50.00);
    });

    it('BUG-63: inland ferry commute with firstMileMode: DRIVE synthesizes first-mile drive and ferry transit legs', () => {
      const input: CommuteInput = {
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        originAddress: '124 Hobsonville Road, Hobsonville, Auckland',
        originCoordinates: [174.6450, -36.8150],
        destinationAddress: 'Auckland Ferry Terminal, CBD, Auckland',
        destinationCoordinates: [174.7667, -36.8433],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
        firstMileMode: 'DRIVE',
        firstMileDistanceKm: 3.2,
        firstMileDurationMins: 6,
        transitSteps: [
          { line: 'HOBH Ferry', durationMins: 35, travelMode: 'FERRY' },
        ],
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.transit.primaryMode, 'Ferry');
      assert.strictEqual(result.transit.singleTripStandardFare, 10.40, 'Hobsonville ferry single trip fare must be $10.40');
      assert.strictEqual(result.nearestStation?.hasParkAndRide, true, 'Must mark hasParkAndRide as true on nearestStation');
      assert.strictEqual(result.transit.firstMileMode, 'DRIVE');
      assert.strictEqual(result.transit.firstMileDistanceKm, 3.2);
      assert.strictEqual(result.transit.firstMileDurationMins, 6);
      assert.ok(result.transit.firstMileMonthlyCost! > 0, 'First-mile driving must have fuel cost');

      const legs = result.journeyLegs || [];
      const firstMileLeg = legs.find((l) => l.type === 'FIRST_MILE');
      assert.ok(firstMileLeg, 'Must include FIRST_MILE leg');
      assert.strictEqual(firstMileLeg.mode, 'DRIVE');
      assert.strictEqual(firstMileLeg.destinationName, 'Hobsonville Point Ferry Terminal');
      assert.ok(firstMileLeg.title.includes('Drive to Ferry Terminal'), `Title should include "Drive to Ferry Terminal", got: ${firstMileLeg.title}`);
      assert.ok(firstMileLeg.notes?.includes('Park & Ride Available'), 'Notes must mention Park & Ride Available');

      const transitLeg = legs.find((l) => l.type === 'TRANSIT');
      assert.ok(transitLeg, 'Must include TRANSIT leg');
      assert.strictEqual(transitLeg.mode, 'FERRY');
      assert.strictEqual(transitLeg.originName, 'Hobsonville Point Ferry Terminal');
      assert.strictEqual(transitLeg.durationMins, 35);

      // Verify total door-to-door transit minutes combines first-mile (6) + ferry (35) + walk (8) = 49
      assert.strictEqual(result.transitTimeMins, 6 + 35 + 8);
    });

    it('BUG-63: inland ferry commute with firstMileMode: CYCLE calculates $0 first-mile cost and combined duration', () => {
      const input: CommuteInput = {
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        originAddress: '124 Hobsonville Road, Hobsonville, Auckland',
        originCoordinates: [174.6450, -36.8150],
        destinationAddress: 'Auckland Ferry Terminal, CBD, Auckland',
        destinationCoordinates: [174.7667, -36.8433],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
        firstMileMode: 'CYCLE',
        transitSteps: [
          { line: 'HOBH Ferry', durationMins: 35, travelMode: 'FERRY' },
        ],
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.transit.primaryMode, 'Ferry');
      assert.strictEqual(result.transit.firstMileMode, 'CYCLE');
      assert.strictEqual(result.transit.firstMileMonthlyCost, undefined, 'Cycling first-mile has no fuel surcharge');

      const legs = result.journeyLegs || [];
      const firstMileLeg = legs.find((l) => l.type === 'FIRST_MILE');
      assert.ok(firstMileLeg);
      assert.strictEqual(firstMileLeg.mode, 'CYCLE');
      assert.strictEqual(firstMileLeg.cost, 0, 'Cycling first-mile cost must be $0');
      assert.strictEqual(firstMileLeg.costFormatted, 'Free');
      assert.strictEqual(firstMileLeg.destinationName, 'Hobsonville Point Ferry Terminal');
      assert.ok(firstMileLeg.title.includes('Cycle to Ferry Terminal'), `Title should include "Cycle to Ferry Terminal", got: ${firstMileLeg.title}`);
      assert.ok(firstMileLeg.notes?.includes('Park & Ride Available'));

      // Total time should combine first-mile cycle duration + 35 min ferry + walk
      assert.ok(result.transitTimeMins > 35, 'Total transit time must include cycling first-mile');
    });

    it('BUG-63: ferry commute originating at terminal does not inject first-mile driving/cycling waypoint', () => {
      const input: CommuteInput = {
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        originAddress: 'Hobsonville Point Ferry Terminal, Hobsonville, Auckland',
        originCoordinates: [174.6680, -36.7980], // Exact ferry terminal coords
        destinationAddress: 'Auckland Ferry Terminal, CBD, Auckland',
        destinationCoordinates: [174.7667, -36.8433],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
        transitMode: 'FERRY',
        firstMileMode: 'DRIVE',
        transitSteps: [
          { line: 'HOBH Ferry', durationMins: 35, travelMode: 'FERRY' },
        ],
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.transit.primaryMode, 'Ferry');
      // When origin is already at the terminal, no Park & Ride first-mile drive is injected
      const legs = result.journeyLegs || [];
      const firstMileDriveLeg = legs.find((l) => l.type === 'FIRST_MILE' && l.mode === 'DRIVE');
      assert.strictEqual(firstMileDriveLeg, undefined, 'Must not inject first-mile DRIVE when origin is terminal');
      const transitLeg = legs.find((l) => l.type === 'TRANSIT');
      assert.ok(transitLeg);
      assert.strictEqual(transitLeg.mode, 'FERRY');
    });
  });
});


