import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ComparisonCard from '../ComparisonCard';
import { ArbitrageResult, CommuteInput } from '@/types';

function createMockArbitrage(overrides?: Partial<ArbitrageResult>): ArbitrageResult {
  return {
    dailySavings: 10,
    weeklySavings: 50,
    monthlySavings: 266.73,
    annualSavings: 3200.76,
    breakEvenDaysPerWeek: 2,
    co2SavedMonthlyKg: 45,
    hoursReclaimedMonthly: 12,
    arbitrageVerdict: 'transit_wins',
    arbitrageTagline: 'Public Transport saves you money!',
    distanceKm: 18,
    drivingTimeMins: 25,
    transitTimeMins: 40, // 15 mins slower transit
    driving: {
      distanceOneWayKm: 18,
      distanceRoundTripKm: 36,
      dailyFuelCost: 8,
      dailyRucCost: 0,
      dailyParkingCost: 15,
      dailyMaintenanceCost: 2,
      dailyTotal: 25,
      weeklyFuelCost: 32,
      weeklyRucCost: 0,
      weeklyParkingCost: 60,
      weeklyMaintenanceCost: 8,
      weeklyTotal: 100,
      monthlyFuelCost: 138.56,
      monthlyRucCost: 0,
      monthlyParkingCost: 259.8,
      monthlyMaintenanceCost: 34.64,
      monthlyTotal: 433,
      annualTotal: 5196,
      monthlyCo2Kg: 65,
    },
    transit: {
      singleTripStandardFare: 4.8,
      singleTripConcessionFare: 4.8,
      zoneCount: 2,
      uncappedWeeklyFare: 38.4,
      isHopCapApplied: false,
      hopCappedWeeklyFare: 38.4,
      dailyFare: 9.6,
      weeklyTotal: 38.4,
      monthlyTotal: 166.27,
      annualTotal: 1995.24,
      monthlyCo2Kg: 20,
      primaryMode: 'Bus',
      estimatedTransitTimeMins: 40,
    },
    timeMetrics: {
      oneWayDriveMinutes: 25,
      oneWayTransitMinutes: 40,
      monthlyTimeDeltaHours: 8.66,
      monetizedMonthlyTimeCost: 173.2,
      generalizedMonthlySavings: 93.53,
    },
    ...overrides,
  };
}

const defaultInput: CommuteInput = {
  originSuburbId: 'albany',
  destinationSuburbId: 'cbd',
  daysPerWeek: 4,
  vehicleType: 'petrol91',
  parkingDailyRate: 15,
  parkingDaysPerWeek: 4,
  concession: 'adult',
  includeMaintenanceWear: true,
  carpoolPassengers: 1,
  hourlyTimeValue: 0,
};

describe('src/components/ComparisonCard.tsx - US-16 Mini-Receipt Time Valuation', () => {
  it('renders the US-16 Time Valuation mini-receipt balance sheet when hourlyTimeValue > 0 with slower transit', () => {
    const input: CommuteInput = {
      ...defaultInput,
      hourlyTimeValue: 20,
    };
    const arbitrage = createMockArbitrage();
    const html = renderToStaticMarkup(React.createElement(ComparisonCard, { arbitrage, input }));

    // Assert Time Valuation container and header
    assert.ok(html.includes('Time Valuation ($20/hr)'), 'Must render Time Valuation header with rate');
    
    // Assert Row 1: Cash Saved
    assert.ok(html.includes('Cash Saved'), 'Must render "Cash Saved" label');
    assert.ok(html.includes('+$267'), 'Must render cash delta value');

    // Assert Row 2: Time Cost (slower commute)
    assert.ok(html.includes('Time Cost'), 'Must render "Time Cost" label for slower commute');
    assert.ok(html.includes('-$173'), 'Must render monetized time cost deduction');

    // Assert Row 3: Your True Benefit
    assert.ok(html.includes('Your True Benefit'), 'Must render "Your True Benefit" label');
    assert.ok(html.includes('/mo'), 'Must include monthly unit suffix');
    assert.ok(html.includes('tabular-nums'), 'Must format balance sheet with tabular-nums');
  });

  it('does not render the Time Valuation container when hourlyTimeValue is 0', () => {
    const input: CommuteInput = {
      ...defaultInput,
      hourlyTimeValue: 0,
    };
    const arbitrage = createMockArbitrage();
    const html = renderToStaticMarkup(React.createElement(ComparisonCard, { arbitrage, input }));

    assert.strictEqual(
      html.includes('Time Valuation'),
      false,
      'Must NOT render Time Valuation container when hourlyTimeValue = 0'
    );
  });

  it('renders Time Gained when the winning commute mode is faster', () => {
    const input: CommuteInput = {
      ...defaultInput,
      hourlyTimeValue: 20,
    };
    const arbitrage = createMockArbitrage({
      drivingTimeMins: 45,
      transitTimeMins: 20, // transit is 25 mins faster
      timeMetrics: {
        oneWayDriveMinutes: 45,
        oneWayTransitMinutes: 20,
        monthlyTimeDeltaHours: -14.43,
        monetizedMonthlyTimeCost: -288.6,
        generalizedMonthlySavings: 555.33,
      },
    });
    const html = renderToStaticMarkup(React.createElement(ComparisonCard, { arbitrage, input }));

    assert.ok(html.includes('Time Gained'), 'Must render "Time Gained" label when winning mode is faster');
    assert.ok(html.includes('+$289'), 'Must render positive time bonus');
  });
});
