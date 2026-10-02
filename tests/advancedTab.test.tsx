import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import AdvancedRow from '../src/components/AdvancedRow';
import AdvancedTab from '../src/components/AdvancedTab';
import { CommuteInput } from '../src/types';
import { calculateCommuteArbitrage } from '../src/lib/calculator';
import { getSuburbById } from '../src/config/suburbs';

const fixtureInput: CommuteInput = {
  originSuburbId: 'mt-roskill',
  destinationSuburbId: 'parnell',
  daysPerWeek: 3,
  vehicleType: 'diesel',
  powertrain: 'DIESEL',
  parkingDailyRate: 4.0,
  parkingDaysPerWeek: 3,
  concession: 'adult',
  carpoolPassengers: 1,
  includeMaintenanceWear: true,
  distanceWearWeekly: 3.0,
  kwhRate: 0.33,
  evEfficiency: 15,
  evPurchasePrice: 45000,
  iceTradeInValue: 15000,
  horizonYears: 5,
};

describe('STORY-6: Advanced Tab & EV Sandbox Refactor', () => {
  const arbitrage = calculateCommuteArbitrage(fixtureInput);
  const origin = getSuburbById(fixtureInput.originSuburbId);
  const destination = getSuburbById(fixtureInput.destinationSuburbId);

  describe('Task 1: AdvancedRow Component', () => {
    it('renders title, hint, and is collapsed by default', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          AdvancedRow,
          {
            id: 'test-row',
            title: 'Test Title',
            hint: 'Test Hint Copy',
            defaultExpanded: false,
          },
          React.createElement('div', { id: 'test-child' }, 'Test Child Content')
        )
      );

      assert.ok(html.includes('Test Title'), 'Renders title');
      assert.ok(html.includes('Test Hint Copy'), 'Renders hint copy');
      assert.ok(html.includes('aria-expanded="false"'), 'aria-expanded is false by default');
      assert.ok(html.includes('hidden'), 'Content container has hidden attribute/class');
    });

    it('toggles expansion state when clicked in interactive DOM', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;
      // @ts-ignore
      global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
      // @ts-ignore
      global.cancelAnimationFrame = (id) => clearTimeout(id);

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(
            AdvancedRow,
            {
              id: 'interactive-row',
              title: 'Interactive Title',
              hint: 'Interactive Hint',
              defaultExpanded: false,
            },
            React.createElement('div', { id: 'interactive-content' }, 'Child Body')
          )
        );
      });

      const button = container.querySelector('#advanced-header-interactive-row') as HTMLButtonElement;
      const content = container.querySelector('#advanced-content-interactive-row') as HTMLElement;

      assert.ok(button, 'Header button exists');
      assert.ok(content, 'Content container exists');
      assert.strictEqual(button.getAttribute('aria-expanded'), 'false', 'Initially collapsed');
      assert.strictEqual(content.hidden, true, 'Content hidden property is true');

      // Click to expand
      flushSync(() => {
        button.click();
      });

      assert.strictEqual(button.getAttribute('aria-expanded'), 'true', 'Expanded after click');
      assert.strictEqual(content.hidden, false, 'Content hidden property is false');

      // Click to collapse
      flushSync(() => {
        button.click();
      });

      assert.strictEqual(button.getAttribute('aria-expanded'), 'false', 'Collapsed after second click');
      assert.strictEqual(content.hidden, true, 'Content hidden property is true again');

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 2: AdvancedTab 5 Rows with Exact Section 7 Copy', () => {
    it('instantiates all 5 rows with exact titles and hints', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvancedTab, {
          commuteInput: fixtureInput,
          arbitrage,
          origin,
          destination,
        })
      );

      // Row 1
      assert.ok(
        html.includes('Would an electric car pay off?'),
        'Row 1 Title: Would an electric car pay off?'
      );
      assert.ok(
        html.includes("Try a price, a trade-in and how long you&#x27;d keep it.") ||
          html.includes("Try a price, a trade-in and how long you'd keep it."),
        'Row 1 Hint: Try a price, a trade-in and how long you\'d keep it.'
      );

      // Row 2
      assert.ok(
        html.includes('Fuel prices today.'),
        'Row 2 Title: Fuel prices today.'
      );
      assert.ok(
        html.includes('Pump prices and road user charges.'),
        'Row 2 Hint: Pump prices and road user charges.'
      );

      // Row 3
      assert.ok(
        html.includes('Use your own numbers.'),
        'Row 3 Title: Use your own numbers.'
      );
      assert.ok(
        html.includes('Change fuel, parking and fares.'),
        'Row 3 Hint: Change fuel, parking and fares.'
      );

      // Row 4
      assert.ok(
        html.includes('Your trip, step by step.'),
        'Row 4 Title: Your trip, step by step.'
      );
      assert.ok(
        html.includes('Walking, bus and driving legs.'),
        'Row 4 Hint: Walking, bus and driving legs.'
      );

      // Row 5
      assert.ok(
        html.includes('How costs add up.'),
        'Row 5 Title: How costs add up.'
      );
      assert.ok(
        html.includes('Year by year, side by side.'),
        'Row 5 Hint: Year by year, side by side.'
      );
    });

    it('asserts all 5 rows render collapsed by default in interactive DOM', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;
      // @ts-ignore
      global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
      // @ts-ignore
      global.cancelAnimationFrame = (id) => clearTimeout(id);

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(AdvancedTab, {
            commuteInput: fixtureInput,
            arbitrage,
            origin,
            destination,
          })
        );
      });

      const rowIds = [
        'ev-sandbox',
        'fuel-prices',
        'custom-numbers',
        'trip-steps',
        'cost-stacking',
      ];

      for (const id of rowIds) {
        const header = container.querySelector(`#advanced-header-${id}`) as HTMLButtonElement;
        const content = container.querySelector(`#advanced-content-${id}`) as HTMLElement;

        assert.ok(header, `Row header ${id} must exist`);
        assert.ok(content, `Row content ${id} must exist`);
        assert.strictEqual(
          header.getAttribute('aria-expanded'),
          'false',
          `Row ${id} must be collapsed by default (aria-expanded=false)`
        );
        assert.strictEqual(
          content.hidden,
          true,
          `Row content ${id} must be hidden by default`
        );
      }

      flushSync(() => {
        root.unmount();
      });
    });

    it('preserves existing widgets without removing functionality', () => {
      const html = renderToStaticMarkup(
        React.createElement(AdvancedTab, {
          commuteInput: fixtureInput,
          arbitrage,
          origin,
          destination,
        })
      );

      // Verify EV Sandbox presence
      assert.ok(html.includes('data-testid="ev-roi-sandbox"'), 'Embeds EvRoiSandbox');
      // Verify Fuel Radar presence
      assert.ok(html.includes('NZ Pump Benchmark'), 'Embeds FuelRadarWidget');
      // Verify Custom numbers (CommuteForm)
      assert.ok(
        html.includes('From (Origin Address)') || html.includes('origin-address-input'),
        'Embeds CommuteForm'
      );
      // Verify Journey legs
      assert.ok(
        html.includes('Segmented Journey Timeline') || html.includes('Multimodal breakdown'),
        'Embeds JourneyTimeline'
      );
    });
  });
});
