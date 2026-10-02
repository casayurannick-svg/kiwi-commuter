import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import CarFreeCard from '../src/components/CarFreeCard';
import SummaryTab from '../src/components/SummaryTab';
import { CommuteInput } from '../src/types';
import {
  calculateCommuteArbitrage,
  calculateAnnualNonCommuteCost,
  calculateCarFreeSavings,
} from '../src/lib/calculator';

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

describe('STORY-8: Car-Free Savings Card', () => {
  const arbitrage = calculateCommuteArbitrage(fixtureInput);

  describe('Task 1: Collapsed State & Expansion Behavior', () => {
    it('defaults to collapsed with exact label "Thinking of selling the car? See what going car-free could save."', () => {
      const html = renderToStaticMarkup(
        React.createElement(CarFreeCard, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      assert.ok(
        html.includes('Thinking of selling the car? See what going car-free could save.'),
        'Collapsed button must display exact copy'
      );
      assert.ok(html.includes('aria-expanded="false"'), 'Must have aria-expanded="false" by default');
      assert.ok(!html.includes('id="car-free-content"'), 'Content area must not be present when collapsed');
    });

    it('toggles expansion state when clicked in interactive DOM', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CarFreeCard, {
            commuteInput: fixtureInput,
            arbitrage,
          })
        );
      });

      const toggleBtn = container.querySelector('[data-testid="car-free-toggle"]') as HTMLButtonElement;
      assert.ok(toggleBtn, 'Toggle button must exist');
      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(container.querySelector('#car-free-content'), null);

      // Expand card
      flushSync(() => {
        toggleBtn.click();
      });

      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'true');
      const content = container.querySelector('#car-free-content');
      assert.ok(content, 'Content area must be rendered when expanded');

      // Collapse card
      flushSync(() => {
        toggleBtn.click();
      });

      assert.strictEqual(toggleBtn.getAttribute('aria-expanded'), 'false');
      assert.strictEqual(container.querySelector('#car-free-content'), null);

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 2-7: Exact Math, Editable Inputs, and Dynamic Calculations', () => {
    it('renders default input values and asserts exact C - F - A = X formula', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CarFreeCard, {
            commuteInput: fixtureInput,
            arbitrage,
            defaultExpanded: true,
          })
        );
      });

      // Task 2: "Other driving (km a year)" defaults to 5000
      const otherKmInput = container.querySelector(
        '[data-testid="car-free-other-km-input"]'
      ) as HTMLInputElement;
      assert.ok(otherKmInput, 'Other driving input must exist');
      assert.strictEqual(otherKmInput.value, '5000', 'Other driving defaults to 5000 km');
      assert.ok(container.textContent?.includes('Other driving (km a year)'));

      // Task 3: Line item 1: "You'd stop paying for the car: $C"
      const stopPayingEl = container.querySelector('[data-testid="car-free-stop-paying"]');
      assert.ok(stopPayingEl, 'Line item 1 element must exist');
      assert.ok(
        stopPayingEl.textContent?.includes("You'd stop paying for the car: $"),
        'Must display line item 1 text'
      );

      // Task 4: Line item 2: "Minus commute fares for the year: $F"
      const transitFaresEl = container.querySelector('[data-testid="car-free-transit-fares"]');
      assert.ok(transitFaresEl, 'Line item 2 element must exist');
      assert.ok(
        transitFaresEl.textContent?.includes('Minus commute fares for the year: $'),
        'Must display line item 2 text'
      );

      // Task 5: Editable allowance input: "Taxis, rentals and other trips: $A" (default $300)
      const allowanceInput = container.querySelector(
        '[data-testid="car-free-allowance-input"]'
      ) as HTMLInputElement;
      assert.ok(allowanceInput, 'Allowance input must exist');
      assert.strictEqual(allowanceInput.value, '300', 'Allowance defaults to $300');
      assert.ok(
        container.textContent?.includes('Taxis, rentals and other trips: $300'),
        'Must display editable allowance label with default $300'
      );

      // Task 6: Result sentence: "Going car-free could save about $X a year."
      const resultEl = container.querySelector('[data-testid="car-free-result"]');
      assert.ok(resultEl, 'Result element must exist');
      assert.ok(
        resultEl.textContent?.includes('Going car-free could save about $') &&
          resultEl.textContent?.includes(' a year.'),
        'Result sentence matches exact copy template'
      );

      // Exact mathematical assertion: verify X === C - F - A
      const savings = calculateCarFreeSavings(fixtureInput, arbitrage, {
        otherDrivingKm: 5000,
        allowance: 300,
      });

      const expectedC = Math.round(savings.carCostTotal);
      const expectedF = Math.round(savings.annualTransitFare);
      const expectedA = Math.round(savings.allowance);
      const expectedX = expectedC - expectedF - expectedA;

      assert.strictEqual(
        Math.round(savings.annualSavings * 100) / 100,
        Math.round((savings.carCostTotal - savings.annualTransitFare - 300) * 100) / 100
      );
      assert.ok(
        stopPayingEl.textContent?.includes(`$${expectedC.toLocaleString('en-NZ')}`),
        'Line item 1 displays formatted C'
      );
      assert.ok(
        transitFaresEl.textContent?.includes(`$${expectedF.toLocaleString('en-NZ')}`),
        'Line item 2 displays formatted F'
      );
      assert.ok(
        resultEl.textContent?.includes(`Going car-free could save about $${expectedX.toLocaleString('en-NZ')} a year.`),
        'Result displays exact formula X = C - F - A'
      );

      // Task 7: Caveat text
      const caveatEl = container.querySelector('[data-testid="car-free-caveat"]');
      assert.ok(caveatEl, 'Caveat element must exist');
      assert.ok(
        caveatEl.textContent?.includes('Based on the full yearly cost of the car.'),
        'Caveat must explain calculation is based on the full yearly cost of the car'
      );

      flushSync(() => {
        root.unmount();
      });
    });

    it('dynamically recalculates C and X when Other driving (km) is updated live', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CarFreeCard, {
            commuteInput: fixtureInput,
            arbitrage,
            defaultExpanded: true,
          })
        );
      });

      const otherKmInput = container.querySelector(
        '[data-testid="car-free-other-km-input"]'
      ) as HTMLInputElement;

      // Update other driving km from 5000 to 10000
      flushSync(() => {
        const tracker = (otherKmInput as any)._valueTracker;
        if (tracker) tracker.setValue('');
        const setter = Object.getOwnPropertyDescriptor(
          dom.window.HTMLInputElement.prototype,
          'value'
        )?.set;
        setter?.call(otherKmInput, '10000');
        otherKmInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        otherKmInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });

      const savings10k = calculateCarFreeSavings(fixtureInput, arbitrage, {
        otherDrivingKm: 10000,
        allowance: 300,
      });

      const expectedC = Math.round(savings10k.carCostTotal);
      const expectedF = Math.round(savings10k.annualTransitFare);
      const expectedA = Math.round(savings10k.allowance);
      const expectedX = expectedC - expectedF - expectedA;

      const stopPayingEl = container.querySelector('[data-testid="car-free-stop-paying"]');
      const resultEl = container.querySelector('[data-testid="car-free-result"]');

      assert.ok(
        stopPayingEl?.textContent?.includes(`$${expectedC.toLocaleString('en-NZ')}`),
        'C updates live when other driving km is edited'
      );
      assert.ok(
        resultEl?.textContent?.includes(`Going car-free could save about $${expectedX.toLocaleString('en-NZ')} a year.`),
        'X updates live reflecting increased non-commute car savings'
      );

      flushSync(() => {
        root.unmount();
      });
    });

    it('dynamically recalculates X when editable allowance is updated live', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(CarFreeCard, {
            commuteInput: fixtureInput,
            arbitrage,
            defaultExpanded: true,
          })
        );
      });

      const allowanceInput = container.querySelector(
        '[data-testid="car-free-allowance-input"]'
      ) as HTMLInputElement;

      // Change allowance from 300 to 800
      flushSync(() => {
        const tracker = (allowanceInput as any)._valueTracker;
        if (tracker) tracker.setValue('');
        const setter = Object.getOwnPropertyDescriptor(
          dom.window.HTMLInputElement.prototype,
          'value'
        )?.set;
        setter?.call(allowanceInput, '800');
        allowanceInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        allowanceInput.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      });

      const savings800 = calculateCarFreeSavings(fixtureInput, arbitrage, {
        otherDrivingKm: 5000,
        allowance: 800,
      });

      const expectedC = Math.round(savings800.carCostTotal);
      const expectedF = Math.round(savings800.annualTransitFare);
      const expectedA = Math.round(savings800.allowance);
      const expectedX = expectedC - expectedF - expectedA;

      const allowanceLabel = container.querySelector('[data-testid="car-free-allowance-label"]');
      const resultEl = container.querySelector('[data-testid="car-free-result"]');

      assert.ok(
        allowanceLabel?.textContent?.includes('Taxis, rentals and other trips: $800'),
        'Allowance label updates live to $800'
      );
      assert.ok(
        resultEl?.textContent?.includes(`Going car-free could save about $${expectedX.toLocaleString('en-NZ')} a year.`),
        'Result X reflects reduced savings with $800 alternative transport allowance'
      );

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 8: SummaryTab Integration', () => {
    it('wires the CarFreeCard into the bottom of SummaryTab', () => {
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: fixtureInput,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.ok(
        html.includes('data-testid="car-free-card"'),
        'SummaryTab must render CarFreeCard container'
      );
      assert.ok(
        html.includes('Thinking of selling the car? See what going car-free could save.'),
        'SummaryTab must include CarFreeCard toggle header'
      );
    });
  });

  describe('Pure Helper Function Tests: calculateAnnualNonCommuteCost & calculateCarFreeSavings', () => {
    it('returns 0 when nonCommuteKm <= 0', () => {
      assert.strictEqual(calculateAnnualNonCommuteCost(fixtureInput, 0), 0);
      assert.strictEqual(calculateAnnualNonCommuteCost(fixtureInput, -100), 0);
    });

    it('calculates non-commute costs for Diesel matching fuel, RUC, and wear', () => {
      // 5,000 km in Diesel
      const cost = calculateAnnualNonCommuteCost(fixtureInput, 5000);
      assert.ok(cost > 0, 'Cost must be positive');
      // For diesel: ~8.4 L/100km * $2.05 = $0.1722/km + $0.076 RUC + wear (~$0.05/km) -> ~$0.298/km -> ~$1490/yr
      assert.ok(cost > 1000 && cost < 2500, `Diesel cost ($${cost}) in expected range`);
    });

    it('calculates non-commute costs for BEV including light EV RUC ($0.076/km)', () => {
      const evInput: CommuteInput = {
        ...fixtureInput,
        vehicleType: 'bev',
        powertrain: 'BEV',
        efficiency: 16.5,
      };
      const cost = calculateAnnualNonCommuteCost(evInput, 5000);
      assert.ok(cost > 0, 'Cost must be positive');
      // 16.5 kWh/100km * $0.28 = $0.0462/km + $0.076 RUC + wear -> ~$0.17/km -> ~$850/yr
      assert.ok(cost > 500 && cost < 2000, `BEV cost ($${cost}) in expected range`);
    });

    it('calculates non-commute costs in IRD_TRUE_COST mode using standard IRD rate', () => {
      const irdInput: CommuteInput = {
        ...fixtureInput,
        calculationMode: 'IRD_TRUE_COST',
      };
      const cost = calculateAnnualNonCommuteCost(irdInput, 5000);
      // 5000 * 1.20 = 6000
      assert.strictEqual(cost, 6000);
    });

    it('enforces C = annualCommuteFullCost + annualNonCommuteCost in calculateCarFreeSavings', () => {
      const res = calculateCarFreeSavings(fixtureInput, arbitrage, {
        otherDrivingKm: 4000,
        allowance: 250,
      });

      assert.strictEqual(res.carCostTotal, res.annualCommuteFullCost + res.annualNonCommuteCost);
      assert.strictEqual(
        Math.round(res.annualSavings * 100) / 100,
        Math.round((res.carCostTotal - res.annualTransitFare - 250) * 100) / 100
      );
    });
  });
});
