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

  describe('BUG-76: Badge removal, ICE RUC calculation, and dynamic custom fuel price', () => {
    it('removes FEAT-75 badge from the header', () => {
      const html = renderToStaticMarkup(
        React.createElement(CommuteMatrix, {
          input: mockInput,
          arbitrage: mockArbitrage,
        })
      );

      assert.strictEqual(html.includes('FEAT-75'), false);
    });

    it('displays (Exempt) when ICE RUC is 0 for petrol, but displays calculated RUC without (Exempt) for diesel', () => {
      const petrolHtml = renderToStaticMarkup(
        React.createElement(CommuteMatrix, {
          input: mockInput,
          arbitrage: mockArbitrage,
        })
      );
      assert.ok(petrolHtml.includes('(Exempt)'));

      const dieselInput: CommuteInput = {
        ...mockInput,
        vehicleType: 'diesel',
        powertrain: 'DIESEL',
      };
      const dieselArbitrage = calculateCommuteArbitrage(dieselInput);
      const dieselHtml = renderToStaticMarkup(
        React.createElement(CommuteMatrix, {
          input: dieselInput,
          arbitrage: dieselArbitrage,
        })
      );
      assert.strictEqual(dieselHtml.includes('(Exempt)'), false);
    });

    it('dynamically displays custom fuel price in footer when provided, and default benchmark when omitted', () => {
      const defaultHtml = renderToStaticMarkup(
        React.createElement(CommuteMatrix, {
          input: mockInput,
          arbitrage: mockArbitrage,
        })
      );
      assert.ok(defaultHtml.includes('Standard petrol rate benchmark ($2.72/L default)'));

      const customInput: CommuteInput = {
        ...mockInput,
        customFuelPricePerL: 2.95,
      };
      const customArbitrage = calculateCommuteArbitrage(customInput);
      const customHtml = renderToStaticMarkup(
        React.createElement(CommuteMatrix, {
          input: customInput,
          arbitrage: customArbitrage,
        })
      );
      assert.ok(customHtml.includes('Custom fuel price ($2.95/L)'));
    });
  });
});
