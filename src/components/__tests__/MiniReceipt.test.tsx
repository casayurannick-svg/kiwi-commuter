import assert from 'node:assert';
import { describe, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import MiniReceipt from '../MiniReceipt';
import { ArbitrageResult, CommuteInput } from '@/types';

function createMockArbitrage(overrides?: Partial<ArbitrageResult>): ArbitrageResult {
  return {
    dailySavings: 15,
    weeklySavings: 75,
    monthlySavings: 325,
    annualSavings: 3900,
    breakEvenDaysPerWeek: 2,
    co2SavedMonthlyKg: 40,
    hoursReclaimedMonthly: 5,
    arbitrageVerdict: 'transit_wins',
    arbitrageTagline: 'Payback achieved!',
    distanceKm: 12,
    drivingTimeMins: 20,
    transitTimeMins: 25,
    paybackMonths: 6.5,
    stops: {
      fuel: 24,
      ruc: 0,
      parking: 40,
      distanceWear: 8,
      total: 72,
    },
    stays: {
      insurance: 15,
      rego: 3,
      wof: 2,
      depreciation: 0,
      timeMaintenance: 0,
      total: 20,
    },
    fullCost: 92,
    transitCost: 30,
    carTime: '40m',
    transitTime: '50m',
    driving: {
      distanceOneWayKm: 12,
      distanceRoundTripKm: 24,
      dailyFuelCost: 6,
      dailyRucCost: 0,
      dailyParkingCost: 10,
      dailyMaintenanceCost: 2,
      dailyTotal: 18,
      weeklyFuelCost: 30,
      weeklyRucCost: 0,
      weeklyParkingCost: 50,
      weeklyMaintenanceCost: 10,
      weeklyTotal: 90,
      monthlyFuelCost: 130,
      monthlyRucCost: 0,
      monthlyParkingCost: 216,
      monthlyMaintenanceCost: 43,
      monthlyTotal: 390,
      annualTotal: 4680,
      monthlyCo2Kg: 50,
    },
    transit: {
      singleTripStandardFare: 0,
      singleTripConcessionFare: 0,
      zoneCount: 1,
      uncappedWeeklyFare: 0,
      isHopCapApplied: false,
      hopCappedWeeklyFare: 0,
      dailyFare: 0,
      weeklyTotal: 0,
      monthlyTotal: 65,
      annualTotal: 780,
      monthlyCo2Kg: 2,
      primaryMode: 'E-Bike',
      estimatedTransitTimeMins: 25,
    },
    ...overrides,
  };
}

const baseInput: CommuteInput = {
  originSuburbId: 'grey_lynn',
  destinationSuburbId: 'cbd',
  daysPerWeek: 5,
  vehicleType: 'petrol91',
  parkingDailyRate: 10,
  parkingDaysPerWeek: 5,
  concession: 'adult',
  includeMaintenanceWear: false,
  carpoolPassengers: 1,
  transitMode: 'EBIKE',
};

describe('BUG-39: Micromobility Breakeven Tile Dynamic State Interpolation', () => {
  it('correctly renders OWNED E-BIKE and 🚲 icon when E-Bike mode is selected', () => {
    const input: CommuteInput = {
      ...baseInput,
      transitMode: 'EBIKE',
      scooterOwnership: 'OWNED', // Mismatched legacy state should not override E-Bike
    };

    const arbitrage = createMockArbitrage({
      paybackMonths: 7.2,
      transit: {
        ...createMockArbitrage().transit,
        primaryMode: 'E-Bike',
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(MiniReceipt, { arbitrage, input })
    );

    // Verify dynamic title is OWNED E-BIKE, not hardcoded OWNED SCOOTER
    assert.ok(html.includes('OWNED E-BIKE'), 'Must render OWNED E-BIKE header');
    assert.ok(!html.includes('OWNED SCOOTER'), 'Must NOT render OWNED SCOOTER for E-Bike mode');

    // Verify 🚲 icon is displayed
    assert.ok(html.includes('🚲'), 'Must render bicycle emoji 🚲 for E-Bike');
    assert.ok(!html.includes('🛴'), 'Must NOT render scooter emoji 🛴 for E-Bike');

    // Verify copy mentions E-Bike
    assert.ok(html.includes('your E-Bike pays for itself in'), 'Must state E-Bike pays for itself');
    assert.ok(html.includes('7.2 months'), 'Must include exact paybackMonths');
  });

  it('correctly renders OWNED SCOOTER and 🛴 icon when Scooter mode is selected', () => {
    const input: CommuteInput = {
      ...baseInput,
      transitMode: 'MICROMOBILITY_TRANSIT',
      scooterOwnership: 'OWNED',
    };

    const arbitrage = createMockArbitrage({
      paybackMonths: 4.5,
      scooterOwnership: 'OWNED',
      transit: {
        ...createMockArbitrage().transit,
        primaryMode: 'Scooter & Transit',
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(MiniReceipt, { arbitrage, input })
    );

    // Verify dynamic title is OWNED SCOOTER
    assert.ok(html.includes('OWNED SCOOTER'), 'Must render OWNED SCOOTER header for scooter mode');
    assert.ok(!html.includes('OWNED E-BIKE'), 'Must NOT render OWNED E-BIKE for scooter mode');

    // Verify 🛴 icon is displayed
    assert.ok(html.includes('🛴'), 'Must render scooter emoji 🛴 for scooter mode');
    assert.ok(!html.includes('🚲'), 'Must NOT render bicycle emoji 🚲 for scooter mode');

    // Verify copy mentions scooter
    assert.ok(html.includes('your scooter pays for itself in'), 'Must state scooter pays for itself');
    assert.ok(html.includes('4.5 months'), 'Must include exact paybackMonths');
  });
});
