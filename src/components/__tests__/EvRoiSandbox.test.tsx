import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EvRoiSandbox, { formatEvVerdictSentence } from '../EvRoiSandbox';
import { CommuteInput } from '@/types';

describe('FEAT-65 & STORY-6: EV ROI Sandbox Component & Plain-Language Verdict', () => {
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

  it('renders EV ROI Sandbox container with proper testids and titles without FEAT-65 badge', () => {
    const html = renderToStaticMarkup(
      React.createElement(EvRoiSandbox, { input: mockInput })
    );

    assert.ok(html.includes('data-testid="ev-roi-sandbox"'));
    assert.ok(html.includes('EV ROI &amp; TCO Sandbox') || html.includes('EV ROI & TCO Sandbox'));
    assert.ok(html.includes('data-testid="breakeven-badge"'));
    assert.strictEqual(html.includes('FEAT-65'), false);
  });

  it('correctly handles zero trade-in value without falling back to $15k default', () => {
    const zeroTradeInput: CommuteInput = {
      ...mockInput,
      iceTradeInValue: 0,
      evPurchasePrice: 40000,
    };
    const html = renderToStaticMarkup(
      React.createElement(EvRoiSandbox, { input: zeroTradeInput })
    );

    assert.ok(html.includes('data-testid="tco-ice-trade-input"'));
    assert.ok(html.includes('value="0"'));
    assert.ok(html.includes('$40,000'));
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

  describe('STORY-6: Plain-Language Verdict Sentence (No Hardcoded Numbers)', () => {
    it('formats achievable break-even in plain English without technical syntax', () => {
      const sentence = formatEvVerdictSentence(14000, 2500, 10000, 4.0);
      assert.strictEqual(sentence, 'An electric car would pay for itself in about 4 years.');
    });

    it('formats single year break-even accurately', () => {
      const sentence = formatEvVerdictSentence(18000, 3000, 3000, 1.0);
      assert.strictEqual(sentence, 'An electric car would pay for itself in about 1 year.');
    });

    it('formats decades scenario when break-even is 20+ years using dynamic annual mileage', () => {
      const sentence = formatEvVerdictSentence(5200, 400, 30000, 75.0);
      assert.strictEqual(
        sentence,
        "At about 5,200 km a year, an electric car wouldn't pay itself back for decades."
      );
    });

    it('formats immediate break-even when trade-in covers EV purchase', () => {
      const sentence = formatEvVerdictSentence(10000, 1500, 0, 0);
      assert.strictEqual(
        sentence,
        'An electric car would pay for itself immediately as your trade-in covers the purchase.'
      );
    });

    it('replaces the technical "break-even [X] years" string in rendered HTML with human sentence', () => {
      // 1. High delta scenario (decades)
      const htmlDecades = renderToStaticMarkup(
        React.createElement(EvRoiSandbox, { input: mockInput })
      );
      assert.ok(
        htmlDecades.includes("wouldn&#x27;t pay itself back for decades") ||
          htmlDecades.includes("wouldn't pay itself back for decades"),
        'Must render decades plain-language sentence'
      );
      assert.ok(!htmlDecades.includes('Break-even:'), 'Must not render old technical "Break-even:" prefix');

      // 2. Short delta scenario (achievable in ~2-3 years)
      const achievableInput: CommuteInput = {
        ...mockInput,
        evPurchasePrice: 20000,
        iceTradeInValue: 18000,
      };
      const htmlAchievable = renderToStaticMarkup(
        React.createElement(EvRoiSandbox, { input: achievableInput })
      );
      assert.ok(
        htmlAchievable.includes('An electric car would pay for itself in about'),
        'Must render achievable plain-language sentence'
      );
      assert.ok(!htmlAchievable.includes('Break-even:'), 'Must not render old technical "Break-even:" prefix');
    });
  });
});
