import { describe, it, expect } from 'vitest';
import { calculateCommuteArbitrage } from './calculator';
import { CommuteInput } from '@/types';

describe('Private Vehicle Math', () => {
  const baseInput: CommuteInput = {
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

  describe('Statutory Road User Charges (RUC) & Powertrain Rates (BUG-40)', () => {
    it('applies statutory RUC of $76.00/1,000km ($0.076/km) when power=DIESEL (BUG-40 fix)', () => {
      // Albany to CBD is ~19.5 km one-way, 39.0 km round trip
      const dieselInput: CommuteInput = {
        ...baseInput,
        power: 'DIESEL',
      };

      const result = calculateCommuteArbitrage(dieselInput);

      // 39.0 km round-trip * $0.076/km = $2.964 -> rounded to $2.96/day
      expect(result.driving.distanceRoundTripKm).toBe(39.0);
      expect(result.driving.dailyRucCost).toBe(2.96);
      expect(result.driving.weeklyRucCost).toBe(14.80); // $2.96 * 5 days
      expect(result.driving.monthlyRucCost).toBe(64.13); // $14.80 * (52 / 12)
      expect(result.driving.dailyRucCost).toBeGreaterThan(0);

      // Verify that rate per 1,000 km is exactly $76.00
      const ratePer1000Km = (result.driving.dailyRucCost / result.driving.distanceRoundTripKm) * 1000;
      expect(Math.round(ratePer1000Km)).toBe(76);
    });

    it('returns $0 RUC exemption when power=PETROL (BUG-40 fix)', () => {
      const petrolInput: CommuteInput = {
        ...baseInput,
        power: 'PETROL',
      };

      const result = calculateCommuteArbitrage(petrolInput);

      expect(result.driving.distanceRoundTripKm).toBe(39.0);
      expect(result.driving.dailyRucCost).toBe(0);
      expect(result.driving.weeklyRucCost).toBe(0);
      expect(result.driving.monthlyRucCost).toBe(0);
    });

    it('returns $0 RUC exemption for PETROL_91, PETROL_95, and HEV powertrains', () => {
      const powertrains: Array<CommuteInput['power']> = ['PETROL_91', 'PETROL_95', 'HEV'];

      for (const power of powertrains) {
        const result = calculateCommuteArbitrage({
          ...baseInput,
          power,
        });

        expect(result.driving.dailyRucCost).toBe(0);
        expect(result.driving.monthlyRucCost).toBe(0);
      }
    });

    it('applies statutory reduced RUC of $38.00/1,000km ($0.038/km) when power=PHEV', () => {
      const phevInput: CommuteInput = {
        ...baseInput,
        power: 'PHEV',
      };

      const result = calculateCommuteArbitrage(phevInput);

      // 39.0 km round-trip * $0.038/km = $1.482 -> rounded to $1.48/day
      expect(result.driving.dailyRucCost).toBe(1.48);
      expect(result.driving.weeklyRucCost).toBe(7.40); // $1.48 * 5 days
    });

    it('applies statutory light EV RUC of $76.00/1,000km ($0.076/km) when power=BEV', () => {
      const bevInput: CommuteInput = {
        ...baseInput,
        power: 'BEV',
      };

      const result = calculateCommuteArbitrage(bevInput);

      expect(result.driving.dailyRucCost).toBe(2.96);
      expect(result.driving.weeklyRucCost).toBe(14.80);
    });
  });

  describe('Fuel Consumption & Variable Running Costs', () => {
    it('correctly calculates daily and monthly fuel cost for standard petrol 91', () => {
      const result = calculateCommuteArbitrage({
        ...baseInput,
        power: 'PETROL_91',
        fuelPriceOverride: 2.70, // $2.70 / L
        consumptionOverride: 8.0, // 8.0 L / 100km
      });

      // 39 km * (8.0 / 100) = 3.12 L/day * $2.70/L = $8.424 -> $8.42/day
      expect(result.driving.dailyFuelCost).toBe(8.42);
      expect(result.driving.weeklyFuelCost).toBe(42.10); // $8.42 * 5 days
    });

    it('splits fuel and RUC costs evenly across carpool passengers', () => {
      const soloResult = calculateCommuteArbitrage({
        ...baseInput,
        power: 'DIESEL',
        carpoolPassengers: 1,
      });

      const carpoolResult = calculateCommuteArbitrage({
        ...baseInput,
        power: 'DIESEL',
        carpoolPassengers: 2,
      });

      expect(carpoolResult.driving.dailyRucCost).toBe(Math.round((soloResult.driving.dailyRucCost / 2) * 100) / 100);
      expect(carpoolResult.driving.dailyFuelCost).toBe(Math.round((soloResult.driving.dailyFuelCost / 2) * 100) / 100);
    });
  });

  describe('Fixed Ownership Costs (WOF, Rego, Insurance)', () => {
    it('amortizes annual fixed costs with 70% commute apportionment', () => {
      const result = calculateCommuteArbitrage({
        ...baseInput,
        annualWof: 85,
        annualRego: 173,
        defaultInsurance: 1311,
        insuranceEnabled: true,
      });

      // Total annual: 85 + 173 + 1311 = $1569
      // Commute apportioned (70%): $1569 * 0.70 = $1098.30
      // Monthly fixed cost: $1098.30 / 12 = $91.525
      // 5 days/wk -> 21.6667 commute days/mo -> daily fixed baseline = $4.22
      expect(result.driving.dailyFixedCost).toBe(4.22);
      expect(result.driving.weeklyFixedCost).toBe(21.10); // 4.22 * 5
      expect(result.driving.monthlyFixedCost).toBe(91.43); // 21.10 * (52 / 12)
    });
  });
});

describe('BUG-43: Micromobility Decoupled from Carpool Multiplier', () => {
  const baseInput: CommuteInput = {
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

  describe('E-Bike: carpool multiplier is locked to 1', () => {
    it('solo rider (carpoolPassengers=1) E-Bike energy cost matches expected', () => {
      const result = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'EBIKE',
        carpoolPassengers: 1,
      });
      // Albany to CBD ~19.5km one-way = 39km round trip
      // 39 km * $0.0027/km = $0.1053 -> $0.11/day
      expect(result.transit.dailyFare).toBeCloseTo(0.11, 1);
    });

    it('carpool=2 does NOT double E-Bike energy costs', () => {
      const soloResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'EBIKE',
        carpoolPassengers: 1,
      });

      const carpoolResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'EBIKE',
        carpoolPassengers: 2,
      });

      // Energy cost is per-rider and must not be multiplied by carpool count
      expect(carpoolResult.transit.dailyFare).toBe(soloResult.transit.dailyFare);
      expect(carpoolResult.transit.weeklyTotal).toBe(soloResult.transit.weeklyTotal);
      expect(carpoolResult.transit.monthlyTotal).toBe(soloResult.transit.monthlyTotal);
      expect(carpoolResult.transit.singleTripConcessionFare).toBe(soloResult.transit.singleTripConcessionFare);
    });

    it('carpool=3 does NOT multiply E-Bike costs', () => {
      const soloResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'EBIKE',
        carpoolPassengers: 1,
      });

      const carpoolResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'EBIKE',
        carpoolPassengers: 3,
      });

      expect(carpoolResult.transit.dailyFare).toBe(soloResult.transit.dailyFare);
      expect(carpoolResult.transit.monthlyTotal).toBe(soloResult.transit.monthlyTotal);
    });
  });

  describe('Scooter-Transit: carpool multiplier is locked to 1', () => {
    it('carpool=2 does NOT double Scooter & Transit AT HOP fares', () => {
      const soloResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'Scooter & Transit',
        scooterOwnership: 'OWNED',
        carpoolPassengers: 1,
      });

      const carpoolResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'Scooter & Transit',
        scooterOwnership: 'OWNED',
        carpoolPassengers: 2,
      });

      // Transit fares for scooter+transit should not be scaled by passenger count
      expect(carpoolResult.transit.dailyFare).toBe(soloResult.transit.dailyFare);
      expect(carpoolResult.transit.monthlyTotal).toBe(soloResult.transit.monthlyTotal);
    });
  });

  describe('Bus/Train: carpool multiplier correctly scales fares', () => {
    it('carpool=2 doubles daily transit fare for standard bus commute (BUG-37 regression)', () => {
      const soloResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'BUS',
        carpoolPassengers: 1,
      });

      const carpoolResult = calculateCommuteArbitrage({
        ...baseInput,
        transitMode: 'BUS',
        carpoolPassengers: 2,
      });

      // Bus IS a shared/multi-rider mode, carpool scaling SHOULD apply
      expect(carpoolResult.transit.dailyFare).toBe(
        Math.round(soloResult.transit.dailyFare * 2 * 100) / 100
      );
    });
  });
});

describe('BUG-44: Decouple Private Vehicle Baseline from Alternative Modes', () => {
  const baseInput: CommuteInput = {
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

  it('calculating an E-Bike comparison with power=DIESEL correctly applies $0.076/km RUC to the private vehicle baseline', () => {
    const result = calculateCommuteArbitrage({
      ...baseInput,
      power: 'DIESEL',
      transitMode: 'EBIKE',
    });

    // 39.0 km round trip * $0.076/km = $2.964 -> rounded to $2.96/day
    expect(result.driving.distanceRoundTripKm).toBe(39.0);
    expect(result.driving.dailyRucCost).toBe(2.96);
    expect(result.driving.weeklyRucCost).toBe(14.80);
    expect(result.driving.monthlyRucCost).toBe(64.13);

    // E-Bike energy cost on transit side remains intact
    expect(result.transit.dailyFare).toBeCloseTo(0.11, 1);
  });

  it('calculating an E-Bike comparison preserves private vehicle parking costs in baseline', () => {
    const result = calculateCommuteArbitrage({
      ...baseInput,
      transitMode: 'EBIKE',
      parkingDailyRate: 22,
      parkingDaysPerWeek: 5,
      parkingTier: 'CBD_EARLY_BIRD',
    });

    // Driving baseline should include $22/day parking
    expect(result.driving.dailyParkingCost).toBe(22);
    expect(result.driving.weeklyParkingCost).toBe(110);
    expect(result.driving.monthlyParkingCost).toBe(476.67);
  });

  it('calculating a Scooter comparison with power=DIESEL retains private vehicle RUC in baseline', () => {
    const result = calculateCommuteArbitrage({
      ...baseInput,
      power: 'DIESEL',
      transitMode: 'Scooter & Ride',
      scooterOwnership: 'OWNED',
    });

    expect(result.driving.dailyRucCost).toBe(2.96);
    expect(result.driving.weeklyRucCost).toBe(14.80);
  });
});
