import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateCommuteArbitrage, WEEKS_PER_MONTH } from '../calculator';
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

    it('US-20: Devonport ferry respects the AT $50 7-day cap', () => {
      // Devonport to CBD: Zone 2 ($4.45 adult one-way, $8.90 daily return)
      // 5 days per week: 5 * $8.90 = $44.50 uncapped
      // With 6 days: 6 * $8.90 = $53.40 -> capped at $50.00
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

      assert.strictEqual(result.transit.uncappedWeeklyFare, 53.40);
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

      assert.strictEqual(adult.transit.singleTripStandardFare, 6.00); // 3 zones
      assert.strictEqual(tertiary.transit.singleTripConcessionFare, 4.80); // 20% off
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

      // Assert that parking and RUC are zeroed out
      assert.strictEqual(result.driving.dailyParkingCost, 0, 'Parking cost must be zeroed out in EBIKE mode');
      assert.strictEqual(result.driving.monthlyParkingCost, 0, 'Monthly parking must be zero in EBIKE mode');
      assert.strictEqual(result.driving.dailyRucCost, 0, 'RUC cost must be zeroed out in EBIKE mode');
      assert.strictEqual(result.driving.monthlyRucCost, 0, 'Monthly RUC must be zero in EBIKE mode');

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
});

