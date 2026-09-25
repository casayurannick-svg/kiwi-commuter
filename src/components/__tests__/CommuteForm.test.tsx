import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CommuteForm from '../CommuteForm';
import { CommuteInput } from '@/types';

const defaultInput: CommuteInput = {
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

describe('src/components/CommuteForm.tsx - US-19 Wear & Tear Benchmark Tooltip', () => {
  it('renders the info icon and tooltip text explaining the AA/IRD benchmark', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    // Verify presence of AA Wear & Tires label
    assert.ok(html.includes('AA Wear &amp; Tires ($0.18/km)'), 'Must render AA Wear & Tires label');

    // Verify presence of info icon button
    assert.ok(
      html.includes('aria-label="Wear &amp; Tear benchmark info"'),
      'Must render accessible info button for Wear & Tear'
    );

    // Verify presence of exact tooltip explanation text
    assert.ok(
      html.includes(
        'AA/IRD annual benchmark: $0.18/km covers the average cost of tires, brake pads, and routine servicing for a typical NZ vehicle.'
      ),
      'Must contain exact AA/IRD benchmark tooltip explanation'
    );
  });

  it('renders Transit Mode selector including Ferry options (US-20)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    assert.ok(html.includes('Transit Mode'), 'Must render Transit Mode label');
    assert.ok(html.includes('Bus / Train (AT HOP $50 Cap)'), 'Must render Bus / Train button');
    assert.ok(html.includes('Ferry'), 'Must render Ferry button');
    assert.ok(html.includes('Waiheke Island (Matiatia)'), 'Must include Waiheke Island in suburb list');
  });
});
