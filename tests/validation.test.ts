import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  checkEfficiencyPlausibility,
  resolveBenchmarkCategory,
  EECA_BENCHMARKS,
} from '../src/lib/validation';

describe('STORY-9: EECA / Rightcar Efficiency Validation & Plausibility', () => {
  describe('Petrol Benchmark (5 - 11 L/100km)', () => {
    it('returns warning when petrol consumption is below 5 L/100km', () => {
      const warning = checkEfficiencyPlausibility('petrol91', 4.9);
      assert.strictEqual(warning, 'Petrol cars usually use 5-11 L/100km. Are you sure?');
    });

    it('returns warning when petrol consumption is above 11 L/100km', () => {
      const warning = checkEfficiencyPlausibility('petrol95', 11.1);
      assert.strictEqual(warning, 'Petrol cars usually use 5-11 L/100km. Are you sure?');
    });

    it('returns null at exact boundaries and valid mid-range values', () => {
      assert.strictEqual(checkEfficiencyPlausibility('petrol91', 5.0), null);
      assert.strictEqual(checkEfficiencyPlausibility('petrol91', 7.6), null);
      assert.strictEqual(checkEfficiencyPlausibility('petrol95', 8.8), null);
      assert.strictEqual(checkEfficiencyPlausibility('petrol95', 11.0), null);
    });
  });

  describe('Diesel Benchmark (6 - 11 L/100km)', () => {
    it('returns warning when diesel consumption is below 6 L/100km', () => {
      const warning = checkEfficiencyPlausibility('diesel', 5.9);
      assert.strictEqual(warning, 'Diesel vehicles usually use 6-11 L/100km. Are you sure?');
    });

    it('returns warning when diesel consumption is above 11 L/100km', () => {
      const warning = checkEfficiencyPlausibility('diesel', 11.2);
      assert.strictEqual(warning, 'Diesel vehicles usually use 6-11 L/100km. Are you sure?');
    });

    it('returns null at exact boundaries and valid mid-range values', () => {
      assert.strictEqual(checkEfficiencyPlausibility('diesel', 6.0), null);
      assert.strictEqual(checkEfficiencyPlausibility('diesel', 8.4), null);
      assert.strictEqual(checkEfficiencyPlausibility('diesel', 11.0), null);
    });
  });

  describe('Hybrid Benchmark (3 - 6 L/100km)', () => {
    it('returns warning when hybrid consumption is below 3 L/100km', () => {
      const warningHev = checkEfficiencyPlausibility('hev', 2.9);
      assert.strictEqual(warningHev, 'Hybrids usually use 3-6 L/100km. Are you sure?');

      const warningPhev = checkEfficiencyPlausibility('phev', 2.5);
      assert.strictEqual(warningPhev, 'Hybrids usually use 3-6 L/100km. Are you sure?');
    });

    it('returns warning when hybrid consumption is above 6 L/100km', () => {
      const warningHev = checkEfficiencyPlausibility('hev', 6.1);
      assert.strictEqual(warningHev, 'Hybrids usually use 3-6 L/100km. Are you sure?');
    });

    it('returns null at exact boundaries and valid mid-range values', () => {
      assert.strictEqual(checkEfficiencyPlausibility('hev', 3.0), null);
      assert.strictEqual(checkEfficiencyPlausibility('hev', 4.5), null);
      assert.strictEqual(checkEfficiencyPlausibility('phev', 3.8), null);
      assert.strictEqual(checkEfficiencyPlausibility('phev', 6.0), null);
    });
  });

  describe('Electric (EV / BEV) Benchmark (12 - 22 kWh/100km)', () => {
    it('returns warning when EV efficiency is below 12 kWh/100km', () => {
      const warning = checkEfficiencyPlausibility('bev', 11.9);
      assert.strictEqual(warning, 'Electric cars usually use 12-22 kWh/100km. Are you sure?');
    });

    it('returns warning when EV efficiency is above 22 kWh/100km', () => {
      const warning = checkEfficiencyPlausibility('bev', 22.1);
      assert.strictEqual(warning, 'Electric cars usually use 12-22 kWh/100km. Are you sure?');
    });

    it('returns null at exact boundaries and valid mid-range values', () => {
      assert.strictEqual(checkEfficiencyPlausibility('bev', 12.0), null);
      assert.strictEqual(checkEfficiencyPlausibility('bev', 16.5), null);
      assert.strictEqual(checkEfficiencyPlausibility('bev', 22.0), null);
    });
  });

  describe('Edge Cases & Sanitization', () => {
    it('returns null for null, undefined, zero, negative, or NaN values', () => {
      assert.strictEqual(checkEfficiencyPlausibility('petrol91', null), null);
      assert.strictEqual(checkEfficiencyPlausibility('diesel', undefined), null);
      assert.strictEqual(checkEfficiencyPlausibility('hev', 0), null);
      assert.strictEqual(checkEfficiencyPlausibility('bev', -5), null);
      assert.strictEqual(checkEfficiencyPlausibility('bev', NaN), null);
    });

    it('returns null when vehicleType is empty or unknown', () => {
      assert.strictEqual(checkEfficiencyPlausibility('', 10), null);
      assert.strictEqual(checkEfficiencyPlausibility('unknown_rocket', 10), null);
      assert.strictEqual(checkEfficiencyPlausibility(undefined, 10), null);
    });

    it('correctly maps powertrain variants into benchmark categories', () => {
      assert.strictEqual(resolveBenchmarkCategory('petrol91'), 'petrol');
      assert.strictEqual(resolveBenchmarkCategory('PETROL_95'), 'petrol');
      assert.strictEqual(resolveBenchmarkCategory('diesel'), 'diesel');
      assert.strictEqual(resolveBenchmarkCategory('HEV'), 'hybrid');
      assert.strictEqual(resolveBenchmarkCategory('phev'), 'hybrid');
      assert.strictEqual(resolveBenchmarkCategory('bev'), 'ev');
      assert.strictEqual(resolveBenchmarkCategory('EV'), 'ev');
    });
  });

  describe('UI Component Integration: Assumption Badges & Plausibility Hints', () => {
    // Dynamic import to keep isolated if needed
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const CommuteForm = require('../src/components/CommuteForm').default;
    const SummaryTab = require('../src/components/SummaryTab').default;
    const { calculateCommuteArbitrage } = require('../src/lib/calculator');

    const baseInput = {
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
      hourlyTimeValue: 0,
    };

    it('renders Default / Assumption badges when values are defaults in CommuteForm', () => {
      const html = renderToStaticMarkup(
        React.createElement(CommuteForm, { input: baseInput })
      );

      // Default consumption badge
      assert.ok(
        html.includes('data-testid="consumption-default-badge"'),
        'Must display consumption default badge'
      );
      // Default fuel price badge
      assert.ok(
        html.includes('data-testid="fuel-price-default-badge"'),
        'Must display fuel price default badge'
      );
      // Default distance wear assumption badge
      assert.ok(
        html.includes('data-testid="wear-assumption-badge"'),
        'Must display wear assumption badge'
      );
    });

    it('hides default badges when values are manually overridden in CommuteForm', () => {
      const customInput = {
        ...baseInput,
        consumptionOverride: 8.5,
        fuelPriceOverride: 2.85,
        distanceWearWeekly: 6.0,
      };

      const html = renderToStaticMarkup(
        React.createElement(CommuteForm, { input: customInput })
      );

      assert.ok(
        !html.includes('data-testid="fuel-price-default-badge"'),
        'Fuel price default badge must be hidden when overridden'
      );
      assert.ok(
        !html.includes('data-testid="wear-assumption-badge"'),
        'Wear assumption badge must be hidden when overridden'
      );
    });

    it('renders gentle non-blocking warning when fuel efficiency is outside EECA benchmark', () => {
      const outOfRangeInput = {
        ...baseInput,
        vehicleType: 'hev',
        powertrain: 'HEV',
        consumptionOverride: 12.0, // Hybrids usually 3-6 L/100km
      };

      const html = renderToStaticMarkup(
        React.createElement(CommuteForm, { input: outOfRangeInput })
      );

      assert.ok(
        html.includes('data-testid="efficiency-warning"'),
        'Must display efficiency warning container'
      );
      assert.ok(
        html.includes('Hybrids usually use 3-6 L/100km. Are you sure?'),
        'Must display exact gentle warning message for hybrid'
      );
      assert.ok(
        html.includes('role="status"'),
        'Warning must be non-blocking with role="status"'
      );
    });

    it('does not render warning when fuel efficiency is within EECA benchmark', () => {
      const inRangeInput = {
        ...baseInput,
        vehicleType: 'hev',
        powertrain: 'HEV',
        consumptionOverride: 4.8,
      };

      const html = renderToStaticMarkup(
        React.createElement(CommuteForm, { input: inRangeInput })
      );

      assert.ok(
        !html.includes('data-testid="efficiency-warning"'),
        'Must not display warning when consumption is within plausible benchmark'
      );
    });

    it('renders EV efficiency warning when kWh/100km is outside 12-22 benchmark', () => {
      const evOutOfRange = {
        ...baseInput,
        vehicleType: 'bev',
        powertrain: 'BEV',
        consumptionOverride: 28.0,
      };

      const html = renderToStaticMarkup(
        React.createElement(CommuteForm, { input: evOutOfRange })
      );

      assert.ok(
        html.includes('data-testid="ev-efficiency-warning"'),
        'Must display EV efficiency warning'
      );
      assert.ok(
        html.includes('Electric cars usually use 12-22 kWh/100km. Are you sure?'),
        'Must display EV plausibility copy'
      );
    });

    it('renders summary-wear-assumption-badge in SummaryTab when wear is default', () => {
      const arbitrage = calculateCommuteArbitrage(baseInput);
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: baseInput,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.ok(
        html.includes('data-testid="summary-wear-assumption-badge"'),
        'SummaryTab must show wear assumption badge when at default'
      );
      assert.ok(
        html.includes('Assumption'),
        'Badge must contain text Assumption'
      );
    });

    it('hides summary-wear-assumption-badge in SummaryTab when wear is customized', () => {
      const customInput = {
        ...baseInput,
        distanceWearWeekly: 7.5,
      };
      const arbitrage = calculateCommuteArbitrage(customInput);
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: customInput,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.ok(
        !html.includes('data-testid="summary-wear-assumption-badge"'),
        'SummaryTab must hide wear assumption badge when wear is custom'
      );
    });
  });
});
