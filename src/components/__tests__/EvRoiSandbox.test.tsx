import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EvRoiSandbox from '../EvRoiSandbox';
import { CommuteInput } from '@/types';

describe('FEAT-65: EV ROI Sandbox Component', () => {
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
    evPurchasePrice: 45000,
    iceTradeInValue: 15000,
    horizonYears: 5,
  };

  it('renders EV ROI Sandbox container with proper testids and titles', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvRoiSandbox, { input: mockInput })
    );

    assert.ok(html.includes('data-testid="ev-roi-sandbox"'));
    assert.ok(html.includes('EV ROI &amp; TCO Sandbox') || html.includes('EV ROI & TCO Sandbox'));
    assert.ok(html.includes('data-testid="breakeven-badge"'));
  });

  it('renders interactive input controls for EV price, ICE trade-in, and horizon years', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvRoiSandbox, { input: mockInput })
    );

    assert.ok(html.includes('data-testid="tco-ev-price-input"'));
    assert.ok(html.includes('data-testid="tco-ice-trade-input"'));
    assert.ok(html.includes('data-testid="tco-horizon-btn-5"'));
    assert.ok(html.includes('data-testid="tco-horizon-btn-3"'));
    assert.ok(html.includes('data-testid="tco-horizon-btn-7"'));
    assert.ok(html.includes('data-testid="tco-horizon-btn-10"'));
  });

  it('renders flex-box timeline mapping cumulative cost years', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvRoiSandbox, { input: mockInput })
    );

    assert.ok(html.includes('data-testid="tco-timeline"'));
    assert.ok(html.includes('data-testid="tco-year-1"'));
    assert.ok(html.includes('data-testid="tco-year-5"'));
  });
});
