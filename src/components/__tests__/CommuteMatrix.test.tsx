import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CommuteMatrix, { CommuteSummaryMatrix } from '../CommuteMatrix';
import { CommuteInput } from '@/types';
import { calculateCommuteArbitrage } from '@/lib/calculator';

describe('FEAT-75: 3-Way Commute Summary Matrix UI Component', () => {
  const mockInput: CommuteInput = {
    originSuburbId: 'takapuna',
    destinationSuburbId: 'cbd',
    daysPerWeek: 5,
    vehicleType: 'petrol91',
    powertrain: 'PETROL_91',
    parkingDailyRate: 18.0,
    parkingDaysPerWeek: 5,
    parkingTier: 'CBD_EARLY_BIRD',
    concession: 'adult',
    includeMaintenanceWear: false,
    carpoolPassengers: 1,
    kwhRate: 0.33,
    evEfficiency: 15,
  };

  const mockArbitrage = calculateCommuteArbitrage(mockInput);

  it('renders responsive 3-way matrix container with ICE, EV, and Public Transit sections', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteMatrix, {
        input: mockInput,
        arbitrage: mockArbitrage,
      })
    );

    assert.ok(html.includes('data-testid="commute-summary-matrix"'));
    assert.ok(html.includes('3-Way Commute Cost Matrix'));
    assert.ok(html.includes('Combustion (ICE)'));
    assert.ok(html.includes('Electric (EV)'));
    assert.ok(html.includes('Public Transit'));
  });

  it('displays EV energy math and RUC line items', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteMatrix, {
        input: mockInput,
        arbitrage: mockArbitrage,
      })
    );

    assert.ok(html.includes('NZ RUC ($0.076/km)'));
    assert.ok(html.includes('Rate: $0.33/kWh'));
    assert.ok(html.includes('Eff: 15 kWh/100km'));
  });

  it('renders timeframe switch buttons for daily, weekly, and annual breakdowns', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteMatrix, {
        input: mockInput,
        arbitrage: mockArbitrage,
      })
    );

    assert.ok(html.includes('data-testid="matrix-tab-daily"'));
    assert.ok(html.includes('data-testid="matrix-tab-weekly"'));
    assert.ok(html.includes('data-testid="matrix-tab-annual"'));
  });

  it('exports CommuteSummaryMatrix as an alias', () => {
    assert.strictEqual(CommuteMatrix, CommuteSummaryMatrix);
  });
});
