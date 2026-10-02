import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import CompareTab from '../src/components/CompareTab';
import CostBarChart, { CompareBarItem } from '../src/components/CostBarChart';
import { CommuteInput } from '../src/types';
import { calculateCommuteArbitrage } from '../src/lib/calculator';
import { Car, Zap, Bus } from 'lucide-react';

// Section 5 Benchmark Fixture: Mt Roskill to Parnell, Diesel, 3 days/wk, $4.00 parking
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
};

describe('STORY-5: Compare Tab & Cost Base Toggle', () => {
  const arbitrage = calculateCommuteArbitrage(fixtureInput);

  describe('Task 1: H2 Heading & Structure', () => {
    it('renders the exact H2 heading "How your options stack up"', () => {
      const html = renderToStaticMarkup(
        React.createElement(CompareTab, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      assert.ok(
        html.includes('How your options stack up'),
        'Must contain exact H2 heading: "How your options stack up"'
      );
      assert.ok(
        html.includes('<h2'),
        'Heading must be an h2 element'
      );
    });

    it('renders timeframe selector with weekly, monthly, and yearly options', () => {
      const html = renderToStaticMarkup(
        React.createElement(CompareTab, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      assert.ok(html.includes('weekly'), 'Must include weekly timeframe');
      assert.ok(html.includes('monthly'), 'Must include monthly timeframe');
      assert.ok(html.includes('yearly'), 'Must include yearly timeframe');
    });

    it('renders toggle label and sub-hint text', () => {
      const html = renderToStaticMarkup(
        React.createElement(CompareTab, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      assert.ok(
        html.includes("Include costs I&#x27;d pay anyway") ||
          html.includes("Include costs I'd pay anyway"),
        'Must contain toggle label: "Include costs I\'d pay anyway"'
      );
      assert.ok(
        html.includes('Insurance, rego and age depreciation continue whether or not you drive.'),
        'Must contain exact sub-hint copy'
      );
    });
  });

  describe('Task 4: CostBarChart Three Exact Bar Labels', () => {
    it('renders three comparative bars labeled exactly: "Your car", "An electric car, if you bought one", and "Bus and train"', () => {
      const items: CompareBarItem[] = [
        {
          key: 'car',
          label: 'Your car',
          amount: 29.58,
          icon: Car,
          barColor: 'bg-blue-500',
          textColor: 'text-blue-400',
        },
        {
          key: 'ev',
          label: 'An electric car, if you bought one',
          amount: 22.38,
          icon: Zap,
          barColor: 'bg-cyan-400',
          textColor: 'text-cyan-400',
        },
        {
          key: 'transit',
          label: 'Bus and train',
          amount: 29.4,
          icon: Bus,
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-400',
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(CostBarChart, {
          items,
          unitSuffix: '/wk',
          includeFixedCosts: false,
        })
      );

      assert.ok(html.includes('Your car'), 'Must render bar labeled "Your car"');
      assert.ok(
        html.includes('An electric car, if you bought one'),
        'Must render bar labeled "An electric car, if you bought one"'
      );
      assert.ok(html.includes('Bus and train'), 'Must render bar labeled "Bus and train"');
      assert.ok(html.includes('$29.58'), 'Must render car amount');
      assert.ok(html.includes('$22.38'), 'Must render EV amount');
      assert.ok(html.includes('$29.40'), 'Must render transit amount');
    });
  });

  describe('Task 5: Cost Base Toggle (Stops vs Full)', () => {
    it('defaults to avoidable costs (stops.total) when toggle is OFF', () => {
      const html = renderToStaticMarkup(
        React.createElement(CompareTab, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      // Section 5 Fixture: stops.total = $29.58, transit = $29.40, EV stops = $22.38
      assert.ok(html.includes('$29.58'), 'Your car must show stops.total ($29.58)');
      assert.ok(html.includes('$22.38'), 'EV must show stops.total ($22.38)');
      assert.ok(html.includes('$29.40'), 'Transit must show transitCost ($29.40)');
      assert.ok(!html.includes('$47.70'), 'Must NOT show full car cost when toggle is OFF');
    });

    it('switches to full cost (fullCost) when toggle is clicked ON in interactive DOM', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CompareTab, {
            commuteInput: fixtureInput,
            arbitrage,
          })
        );
      });

      const toggleButton = container.querySelector('#toggle-fixed-costs') as HTMLButtonElement;
      assert.ok(toggleButton, 'Toggle button must exist');
      assert.strictEqual(toggleButton.getAttribute('aria-checked'), 'false', 'Initial state is false');

      // Click toggle ON
      flushSync(() => {
        toggleButton.click();
      });

      assert.strictEqual(toggleButton.getAttribute('aria-checked'), 'true', 'State after click is true');

      const text = container.textContent || '';
      // When toggle is ON:
      // Your car fullCost = $47.70
      // EV fullCost = $40.50
      // Public transit = $29.40 (unaffected by vehicle fixed costs)
      assert.ok(text.includes('$47.70'), 'Your car must show fullCost ($47.70) when toggle is ON');
      assert.ok(text.includes('$40.50'), 'EV must show fullCost ($40.50) when toggle is ON');
      assert.ok(text.includes('$29.40'), 'Transit must remain $29.40 when toggle is ON');

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 2: Timeframe Multipliers (Weekly, Monthly, Yearly)', () => {
    it('applies correct multipliers when Monthly or Yearly buttons are clicked', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CompareTab, {
            commuteInput: fixtureInput,
            arbitrage,
          })
        );
      });

      const buttons = Array.from(container.querySelectorAll('button'));
      const monthlyBtn = buttons.find((b) => b.textContent?.trim().toLowerCase() === 'monthly');
      const yearlyBtn = buttons.find((b) => b.textContent?.trim().toLowerCase() === 'yearly');

      assert.ok(monthlyBtn, 'Monthly button must exist');
      assert.ok(yearlyBtn, 'Yearly button must exist');

      // Click Monthly (52 / 12 multiplier)
      // Car stops: 29.58 * 52 / 12 = 128.18
      // EV stops: 22.38 * 52 / 12 = 96.98
      // Transit: 29.40 * 52 / 12 = 127.40
      flushSync(() => {
        monthlyBtn.click();
      });

      let text = container.textContent || '';
      assert.ok(text.includes('$128.18'), 'Monthly car cost must be $128.18');
      assert.ok(text.includes('$96.98'), 'Monthly EV cost must be $96.98');
      assert.ok(text.includes('$127.40'), 'Monthly transit cost must be $127.40');
      assert.ok(text.includes('a month') || text.includes('/mo'), 'Must display a month unit suffix');

      // Click Yearly (52 multiplier)
      // Car stops: 29.58 * 52 = 1538.16
      // EV stops: 22.38 * 52 = 1163.76
      // Transit: 29.40 * 52 = 1528.80
      flushSync(() => {
        yearlyBtn.click();
      });

      text = container.textContent || '';
      assert.ok(text.includes('1,538.16'), 'Yearly car cost must be $1,538.16');
      assert.ok(text.includes('1,163.76'), 'Yearly EV cost must be $1,163.76');
      assert.ok(text.includes('1,528.80'), 'Yearly transit cost must be $1,528.80');
      assert.ok(text.includes('a year') || text.includes('/yr'), 'Must display a year unit suffix');

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 6: Copy Rule Enforcement (Never Say "Savings" When Toggle is ON)', () => {
    it('labels totals as "What your commute costs in total" and never contains the word "savings"', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CompareTab, {
            commuteInput: fixtureInput,
            arbitrage,
          })
        );
      });

      const toggleButton = container.querySelector('#toggle-fixed-costs') as HTMLButtonElement;
      // Click toggle ON
      flushSync(() => {
        toggleButton.click();
      });

      const text = container.textContent || '';

      // 1. Must contain "What your commute costs in total"
      assert.ok(
        text.includes('What your commute costs in total'),
        'Must label totals as "What your commute costs in total"'
      );

      // 2. Strict copy rule: NEVER say "savings" when fixed costs are included
      const textLower = text.toLowerCase();
      assert.ok(
        !textLower.includes('savings'),
        'Must NEVER contain the word "savings" when toggle is ON'
      );

      flushSync(() => {
        root.unmount();
      });
    });
  });
});
