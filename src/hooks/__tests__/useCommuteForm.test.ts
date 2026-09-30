import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCommuteForm, DEFAULT_COMMUTE_INPUT } from '../useCommuteForm';
import { CommuteInput } from '@/types';
import { FuelBenchmarkDto } from '@/lib/supabase';

// Test harness component
function TestFormConsumer({
  initialFuelPrices,
  initialValues,
  onRenderState,
}: {
  initialFuelPrices?: FuelBenchmarkDto;
  initialValues?: Partial<CommuteInput>;
  onRenderState?: (state: CommuteInput) => void;
}) {
  const { commuteInput } = useCommuteForm({ initialFuelPrices, initialValues });
  if (onRenderState) {
    onRenderState(commuteInput);
  }
  return React.createElement(
    'div',
    { 'data-testid': 'consumer' },
    `${commuteInput.originSuburbId}->${commuteInput.destinationSuburbId},${commuteInput.vehicleType},${commuteInput.daysPerWeek}days`
  );
}

describe('src/hooks/useCommuteForm.ts - URL State Synchronization Hook', () => {
  it('defines correct DEFAULT_COMMUTE_INPUT values', () => {
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.originSuburbId, 'epsom');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.destinationSuburbId, 'cbd');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.daysPerWeek, 3);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.vehicleType, 'petrol91');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.powertrain, 'PETROL_91');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.parkingDailyRate, 22.0);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.parkingDaysPerWeek, 3);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.parkingTier, 'CBD_EARLY_BIRD');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.concession, 'adult');
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.includeMaintenanceWear, true);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.annualWof, 85);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.annualRego, 173);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.insuranceEnabled, true);
    assert.strictEqual(DEFAULT_COMMUTE_INPUT.defaultInsurance, 1311);
  });

  it('renders consumer with default base state during SSR / static rendering', () => {
    let capturedState: CommuteInput | null = null;
    const html = renderToStaticMarkup(
      React.createElement(TestFormConsumer, {
        onRenderState: (s) => {
          capturedState = s;
        },
      })
    );

    assert.ok(html.includes('epsom-&gt;cbd,petrol91,3days'));
    assert.strictEqual(capturedState?.originSuburbId, 'epsom');
    assert.strictEqual(capturedState?.destinationSuburbId, 'cbd');
    assert.strictEqual(capturedState?.daysPerWeek, 3);
  });

  it('accepts initialValues and initialFuelPrices overrides', () => {
    let capturedState: CommuteInput | null = null;
    const mockPrices: FuelBenchmarkDto = {
      regular_91: 2.85,
      premium_95: 3.05,
      diesel: 2.2,
      scrape_date: '2026-09-30',
      source: 'test',
    };

    const html = renderToStaticMarkup(
      React.createElement(TestFormConsumer, {
        initialFuelPrices: mockPrices,
        initialValues: { daysPerWeek: 5, vehicleType: 'diesel' },
        onRenderState: (s) => {
          capturedState = s;
        },
      })
    );

    assert.ok(html.includes('epsom-&gt;cbd,diesel,5days'));
    assert.strictEqual(capturedState?.daysPerWeek, 5);
    assert.strictEqual(capturedState?.vehicleType, 'diesel');
    assert.strictEqual(capturedState?.fuelPriceOverride, 2.85);
  });
});
