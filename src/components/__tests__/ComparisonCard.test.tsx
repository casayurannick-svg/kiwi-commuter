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

  it('US‑25: hides AT HOP Cap, Corridor and $50/wk badge for E‑Bike mode', () => {
    const input: CommuteInput = {
      ...defaultInput,
      transitMode: 'EBIKE',
    };
    const arbitrage = createMockArbitrage({
      transit: {
        ...createMockArbitrage().transit,
        primaryMode: 'E-Bike',
        isHopCapApplied: true,
      },
    });
    const html = renderToStaticMarkup(
      React.createElement(ComparisonCard, { arbitrage, input })
    );

    // Headline should mention E‑Bike
    assert.ok(
      html.includes('on an E-Bike'),
      'Headline must use E‑Bike wording'
    );
    // AT HOP Cap block should be absent
    assert.ok(
      !html.includes('AT HOP Cap:'),
      'AT HOP Cap label should not be rendered for E‑Bike'
    );
    // $50/wk Cap badge should not be present
    assert.ok(
      !html.includes('$50/wk Cap'),
      'Cap badge should be hidden for E‑Bike'
    );
    // Corridor block should be omitted
    assert.ok(
      !html.includes('Corridor:'),
      'Corridor label should not appear for E‑Bike'
    );
  });

  it('renders the MONTHLY SUMMARY badge with uppercase styling and icon', () => {
    const input: CommuteInput = {
      ...defaultInput,
    };
    const arbitrage = createMockArbitrage();
    const html = renderToStaticMarkup(
      React.createElement(ComparisonCard, { arbitrage, input })
    );

    assert.ok(html.includes('MONTHLY SUMMARY'), 'Must display "MONTHLY SUMMARY" badge');
    assert.ok(
      html.includes('uppercase tracking-wider'),
      'Must preserve uppercase tracking-wider badge styling'
    );
  });

  describe('US-34: Hero Summary Split UI & Dynamic Trade-off Badge', () => {
    it('renders the side-by-side two-column grid (Drive vs Transit) in the hero banner', () => {
      const input: CommuteInput = { ...defaultInput };
      const arbitrage = createMockArbitrage();
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      // Check hero split grid container
      assert.ok(html.includes('data-testid="hero-split-grid"'), 'Must render hero split grid');
      assert.ok(html.includes('md:grid-cols-2'), 'Must use two-column layout on desktop');

      // Check Drive side
      assert.ok(html.includes('Private Vehicle'), 'Must render Private Vehicle side');
      assert.ok(html.includes('25 mins one-way'), 'Must render one-way drive time');
      assert.ok(html.includes('$433'), 'Must render driving monthly total');

      // Check Transit side
      assert.ok(html.includes('AT HOP Transit'), 'Must render Transit side');
      assert.ok(html.includes('40 mins one-way'), 'Must render one-way transit time');
      assert.ok(html.includes('$166'), 'Must render transit monthly total');

      // Check desktop VS badge
      assert.ok(html.includes('VS'), 'Must include VS indicator badge between columns');
    });

    it('renders trade-off badge when transit saves money but driving is faster', () => {
      const input: CommuteInput = { ...defaultInput };
      // transit: $166/mo (saves $267/mo), transit 40 min vs drive 25 min (transit adds 15m)
      const arbitrage = createMockArbitrage({
        drivingTimeMins: 25,
        transitTimeMins: 40,
        timeMetrics: {
          oneWayDriveMinutes: 25,
          oneWayTransitMinutes: 40,
          monthlyTimeDeltaHours: 8.66,
          monetizedMonthlyTimeCost: 173.2,
          generalizedMonthlySavings: 93.53,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(html.includes('data-testid="tradeoff-badge"'), 'Must render trade-off badge');
      assert.ok(
        html.includes('Trade-off: Save $267/mo (+15m travel time)'),
        'Must state exact trade-off: money saved vs travel time added'
      );
    });

    it('renders win-win badge when transit saves money and is faster', () => {
      const input: CommuteInput = { ...defaultInput };
      // transit: $166/mo (saves $267/mo), transit 20 min vs drive 35 min (transit 15m faster)
      const arbitrage = createMockArbitrage({
        drivingTimeMins: 35,
        transitTimeMins: 20,
        timeMetrics: {
          oneWayDriveMinutes: 35,
          oneWayTransitMinutes: 20,
          monthlyTimeDeltaHours: -8.66,
          monetizedMonthlyTimeCost: -173.2,
          generalizedMonthlySavings: 440.2,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(
        html.includes('Win-Win: Saves $267/mo &amp; 15m faster on transit') ||
        html.includes('Win-Win: Saves $267/mo & 15m faster on transit'),
        'Must state win-win badge when transit is cheaper and faster'
      );
    });

    it('renders win-win badge when driving is cheaper and faster', () => {
      const input: CommuteInput = { ...defaultInput };
      // Driving: $100/mo, Transit: $250/mo (driving saves $150/mo), drive 15m vs transit 35m (drive 20m faster)
      const arbitrage = createMockArbitrage({
        driving: {
          ...createMockArbitrage().driving,
          monthlyTotal: 100,
          weeklyTotal: 25,
          dailyTotal: 5,
        },
        transit: {
          ...createMockArbitrage().transit,
          monthlyTotal: 250,
          weeklyTotal: 62.5,
          dailyFare: 12.5,
        },
        drivingTimeMins: 15,
        transitTimeMins: 35,
        timeMetrics: {
          oneWayDriveMinutes: 15,
          oneWayTransitMinutes: 35,
          monthlyTimeDeltaHours: 11.5,
          monetizedMonthlyTimeCost: 230,
          generalizedMonthlySavings: -80,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(
        html.includes('Win-Win: Drive saves $150/mo &amp; 20m faster') ||
        html.includes('Win-Win: Drive saves $150/mo & 20m faster'),
        'Must state win-win badge when driving is cheaper and faster'
      );
    });

    it('renders similar cost badge when commute costs are break-even', () => {
      const input: CommuteInput = { ...defaultInput };
      const arbitrage = createMockArbitrage({
        driving: {
          ...createMockArbitrage().driving,
          monthlyTotal: 200,
        },
        transit: {
          ...createMockArbitrage().transit,
          monthlyTotal: 200,
        },
        drivingTimeMins: 20,
        transitTimeMins: 30,
        timeMetrics: {
          oneWayDriveMinutes: 20,
          oneWayTransitMinutes: 30,
          monthlyTimeDeltaHours: 5.77,
          monetizedMonthlyTimeCost: 115.4,
          generalizedMonthlySavings: -115.4,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(
        html.includes('Similar Cost · Drive is 10m faster'),
        'Must state similar cost badge with time difference'
      );
    });

    it('renders Fixed Costs (Ins/Rego/WOF) line item beneath Fuel and RUC when monthlyFixedCosts > 0', () => {
      const input: CommuteInput = { ...defaultInput };
      const arbitrage = createMockArbitrage({
        driving: {
          ...createMockArbitrage().driving,
          monthlyFixedCosts: 91.53,
          monthlyFixedCost: 91.53,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(html.includes('Fixed Costs (Ins/Rego/WOF):'), 'Must render Fixed Costs label');
      assert.ok(html.includes('$92/mo'), 'Must render rounded monthly fixed cost ($92/mo)');
    });

    it('BUG-40: renders RUC ($0.076/km) with calculated monthly value for diesel instead of Exempt', () => {
      const input: CommuteInput = {
        ...defaultInput,
        vehicleType: 'diesel',
        powertrain: 'DIESEL',
      };
      const arbitrage = createMockArbitrage({
        driving: {
          ...createMockArbitrage().driving,
          dailyRucCost: 2.96,
          monthlyRucCost: 64.13,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(html.includes('RUC ($0.076/km):'), 'Must display $0.076/km RUC rate label for diesel');
      assert.ok(html.includes('$64/mo'), 'Must display calculated monthly RUC ($64/mo)');
      assert.ok(!html.includes('RUC (Exempt): $0'), 'Must not display RUC Exempt for diesel');
    });

    it('BUG-40: renders RUC (Exempt): $0 for petrol vehicles', () => {
      const input: CommuteInput = {
        ...defaultInput,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
      };
      const arbitrage = createMockArbitrage({
        driving: {
          ...createMockArbitrage().driving,
          dailyRucCost: 0,
          monthlyRucCost: 0,
        },
      });
      const html = renderToStaticMarkup(
        React.createElement(ComparisonCard, { arbitrage, input })
      );

      assert.ok(html.includes('RUC (Exempt):'), 'Must display RUC Exempt label for petrol');
    });
  });
});



