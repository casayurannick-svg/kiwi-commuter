import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

import SetupFlow, { SetupResult } from '../src/components/SetupFlow';
import SetupModal from '../src/components/SetupModal';
import SummaryTab from '../src/components/SummaryTab';
import { CommuteInput } from '../src/types';
import { calculateCommuteArbitrage } from '../src/lib/calculator';

describe('STORY-7: Setup Flow Onboarding Modal', () => {
  describe('Task 1 & 2: Step 1 Validation & Progress Step Rendering', () => {
    it('renders Step 1 with progress bar and blocks Next when empty', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(SetupFlow, {
            onComplete: () => {},
          })
        );
      });

      // Progress bar & Step 1 header
      assert.ok(container.textContent?.includes('Step 1 of 4'), 'Must show Step 1 of 4');
      assert.ok(container.textContent?.includes('Where do you travel?'), 'Step 1 heading present');

      // Back button should NOT be rendered on Step 1
      const backBtn = container.querySelector('[data-testid="setup-back-btn"]');
      assert.strictEqual(backBtn, null, 'Back button must be hidden on Step 1');

      // Attempt to click Next with empty inputs
      const nextBtn = container.querySelector('[data-testid="setup-next-btn"]') as HTMLButtonElement;
      assert.ok(nextBtn, 'Next button exists');

      flushSync(() => {
        nextBtn.click();
      });

      // Validation message must appear as written
      const errorMsg = container.querySelector('[data-testid="setup-validation-error"]');
      assert.ok(errorMsg, 'Validation error appears');
      assert.strictEqual(
        errorMsg.textContent?.trim(),
        'Enter where you travel from and to.',
        'Validation text must match exact specification: "Enter where you travel from and to."'
      );

      // Still on Step 1
      assert.ok(container.textContent?.includes('Step 1 of 4'), 'Must remain on Step 1');

      flushSync(() => {
        root.unmount();
      });
    });

    it('advances to Step 2 when valid From and To suburbs are entered', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(SetupFlow, {
            initialFrom: 'Mount Roskill',
            initialTo: 'Parnell',
            onComplete: () => {},
          })
        );
      });

      const nextBtn = container.querySelector('[data-testid="setup-next-btn"]') as HTMLButtonElement;
      flushSync(() => {
        nextBtn.click();
      });

      // Now on Step 2
      assert.ok(container.textContent?.includes('Step 2 of 4'), 'Advances to Step 2 of 4');
      assert.ok(container.textContent?.includes('How many days a week?'), 'Step 2 heading present');

      // Back button must now be visible
      const backBtn = container.querySelector('[data-testid="setup-back-btn"]');
      assert.ok(backBtn, 'Back button must be visible on Step 2');

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 3: Step 2 Days per Week Selection & Validation', () => {
    it('blocks Next until a day option is selected with exact validation "Pick one to continue."', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      flushSync(() => {
        root.render(
          React.createElement(SetupFlow, {
            initialFrom: 'Albany',
            initialTo: 'Auckland CBD',
            onComplete: () => {},
          })
        );
      });

      const nextBtn = container.querySelector('[data-testid="setup-next-btn"]') as HTMLButtonElement;
      // Advance to Step 2
      flushSync(() => {
        nextBtn.click();
      });

      // Click Next on Step 2 without selecting any day
      flushSync(() => {
        nextBtn.click();
      });

      const errorMsg = container.querySelector('[data-testid="setup-validation-error"]');
      assert.ok(errorMsg, 'Validation error appears');
      assert.strictEqual(
        errorMsg.textContent?.trim(),
        'Pick one to continue.',
        'Validation text must match: "Pick one to continue."'
      );

      // Select 3 days and click Next
      const day3Btn = container.querySelector('[data-testid="setup-days-3"]') as HTMLButtonElement;
      assert.ok(day3Btn, 'Day 3 button exists');
      flushSync(() => {
        day3Btn.click();
      });

      flushSync(() => {
        nextBtn.click();
      });

      // Now on Step 3
      assert.ok(container.textContent?.includes('Step 3 of 4'), 'Advances to Step 3 of 4');
      assert.ok(container.textContent?.includes('What do you drive?'), 'Step 3 heading present');

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 4: Step 3 Vehicle Selection & "No car" Path', () => {
    it('renders vehicle options with exact hint and handles "No car" selection', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      let completedResult: SetupResult | null = null;

      flushSync(() => {
        root.render(
          React.createElement(SetupFlow, {
            initialFrom: 'Takapuna',
            initialTo: 'Auckland CBD',
            onComplete: (res) => {
              completedResult = res;
            },
          })
        );
      });

      const nextBtn = container.querySelector('[data-testid="setup-next-btn"]') as HTMLButtonElement;

      // Advance through Step 1
      flushSync(() => {
        nextBtn.click();
      });

      // Select 5 days on Step 2
      const day5Btn = container.querySelector('[data-testid="setup-days-5"]') as HTMLButtonElement;
      flushSync(() => {
        day5Btn.click();
      });
      flushSync(() => {
        nextBtn.click();
      });

      // Step 3: verify hint
      assert.ok(
        container.textContent?.includes(
          "We'll use a typical fuel use for it. You can change this later."
        ),
        'Must render exact Step 3 hint copy'
      );

      // Select "No car"
      const noCarBtn = container.querySelector('[data-testid="setup-drive-none"]') as HTMLButtonElement;
      assert.ok(noCarBtn, '"No car" option exists');
      flushSync(() => {
        noCarBtn.click();
      });

      flushSync(() => {
        nextBtn.click();
      });

      // Step 4: Free parking preselected for "No car"
      assert.ok(container.textContent?.includes('Step 4 of 4'), 'Advances to Step 4 of 4');
      flushSync(() => {
        nextBtn.click();
      });

      // Completed with hasCar = false
      assert.ok(completedResult !== null, 'Setup must complete');
      assert.strictEqual((completedResult as SetupResult).hasCar, false, 'hasCar must be false for "No car"');
      assert.strictEqual(
        (completedResult as SetupResult).parkingDailyRate,
        0,
        'parkingDailyRate must be 0 for "No car"'
      );

      flushSync(() => {
        root.unmount();
      });
    });
  });

  describe('Task 5: Step 4 Parking & "Not sure" Default Assignment ($24.50/day)', () => {
    it('defaults "Not sure" parking to $24.50/day and flags it as an assumption', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;

      const container = dom.window.document.getElementById('root')!;
      const root = createRoot(container);

      let completedResult: SetupResult | null = null;

      flushSync(() => {
        root.render(
          React.createElement(SetupFlow, {
            initialFrom: 'Mount Roskill',
            initialTo: 'Parnell',
            onComplete: (res) => {
              completedResult = res;
            },
          })
        );
      });

      const nextBtn = container.querySelector('[data-testid="setup-next-btn"]') as HTMLButtonElement;

      // Step 1 -> Next
      flushSync(() => {
        nextBtn.click();
      });

      // Step 2 -> Select 3 days
      const day3Btn = container.querySelector('[data-testid="setup-days-3"]') as HTMLButtonElement;
      assert.ok(day3Btn, 'Day 3 button must exist');
      flushSync(() => {
        day3Btn.click();
      });
      flushSync(() => {
        nextBtn.click();
      });

      // Step 3 -> Select Diesel
      const dieselBtn = container.querySelector('[data-testid="setup-drive-diesel"]') as HTMLButtonElement;
      assert.ok(dieselBtn, 'Diesel button must exist');
      flushSync(() => {
        dieselBtn.click();
      });
      flushSync(() => {
        nextBtn.click();
      });

      // Step 4 -> Select "Not sure"
      const notSureBtn = container.querySelector('[data-testid="setup-parking-not-sure"]') as HTMLButtonElement;
      assert.ok(notSureBtn, '"Not sure" parking option exists');
      flushSync(() => {
        notSureBtn.click();
      });

      // Click "See my commute" / Next to finish
      flushSync(() => {
        nextBtn.click();
      });

      assert.ok(completedResult !== null, 'Setup must complete');
      const res = completedResult as SetupResult;
      assert.strictEqual(res.parkingDailyRate, 24.50, 'Not sure must default to $24.50/day');
      assert.strictEqual(res.isParkingAssumed, true, 'isParkingAssumed must be true');

      flushSync(() => {
        root.unmount();
      });
    });

    it('flags parking assumption on the Summary tab', () => {
      const inputWithAssumedParking: CommuteInput = {
        originSuburbId: 'mt-roskill',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'diesel',
        powertrain: 'DIESEL',
        parkingDailyRate: 24.50,
        parkingDaysPerWeek: 3,
        concession: 'adult',
        carpoolPassengers: 1,
        includeMaintenanceWear: true,
        distanceWearWeekly: 3.0,
        isParkingAssumed: true,
      };

      const arbitrage = calculateCommuteArbitrage(inputWithAssumedParking);
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: inputWithAssumedParking,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.ok(
        html.includes('data-testid="parking-assumption-badge"'),
        'Summary tab must render parking-assumption-badge'
      );
      assert.ok(
        html.includes('$24.50 a day') || html.includes('$24.50/day'),
        'Summary tab must display the $24.50 a day assumption'
      );
    });

    it('renders transit-only commute banner on the Summary tab when hasCar is false', () => {
      const inputNoCar: CommuteInput = {
        originSuburbId: 'mt-roskill',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 3,
        concession: 'adult',
        carpoolPassengers: 1,
        includeMaintenanceWear: false,
        hasCar: false,
      };

      const arbitrage = calculateCommuteArbitrage(inputNoCar);
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: inputNoCar,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.ok(
        html.includes('data-testid="transit-only-banner"'),
        'Summary tab must render transit-only-banner when user has no car'
      );
      assert.ok(
        html.includes('Transit-Only Commute'),
        'Summary tab must display Transit-Only Commute heading'
      );
    });
  });

  describe('Task 6: Returning User Bypass Logic', () => {
    it('SetupModal does not render when isOpen is false (returning user scenario)', () => {
      const html = renderToStaticMarkup(
        React.createElement(SetupModal, {
          isOpen: false,
          onComplete: () => {},
        })
      );

      assert.strictEqual(html, '', 'SetupModal must return null when isOpen=false');
    });

    it('SetupModal renders dialog when isOpen is true (new user scenario)', () => {
      const html = renderToStaticMarkup(
        React.createElement(SetupModal, {
          isOpen: true,
          onComplete: () => {},
        })
      );

      assert.ok(html.includes('data-testid="setup-modal"'), 'Renders setup-modal dialog');
      assert.ok(html.includes('Welcome to Kiwi Commuter'), 'Renders modal heading');
      assert.ok(html.includes('Where do you travel?'), 'Renders Step 1 by default');
    });
  });
});
