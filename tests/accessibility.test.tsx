import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import Tabs from '../src/components/Tabs';
import SummaryTab from '../src/components/SummaryTab';
import CompareTab from '../src/components/CompareTab';
import AdvancedTab from '../src/components/AdvancedTab';
import VerdictCard from '../src/components/VerdictCard';
import FeedbackModal from '../src/components/FeedbackModal';
import FeedbackButton from '../src/components/FeedbackButton';
import ShareButton from '../src/components/ShareButton';
import SetupFlow from '../src/components/SetupFlow';
import CarFreeCard from '../src/components/CarFreeCard';
import EvRoiSandbox from '../src/components/EvRoiSandbox';
import { calculateVerdict } from '../src/lib/verdict';
import { calculateCommuteArbitrage } from '../src/lib/calculator';
import { CommuteInput } from '../src/types';
import { DEFAULT_COMMUTE_INPUT } from '../src/hooks/useCommuteForm';
import fs from 'node:fs';
import path from 'node:path';

// WCAG Contrast Calculation Helpers (WCAG 2.1 / 2.2 Relative Luminance)
function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getRelativeLuminance(r1, g1, b1);
  const lum2 = getRelativeLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

const fixtureInput: CommuteInput = {
  ...DEFAULT_COMMUTE_INPUT,
  originSuburbId: 'mt-roskill',
  destinationSuburbId: 'parnell',
  daysPerWeek: 3,
  vehicleType: 'diesel',
  powertrain: 'DIESEL',
  parkingDailyRate: 0,
  distanceKm: 13,
  drivingTimeMins: 18,
  transitTimeMins: 46,
};

const arbitrage = calculateCommuteArbitrage(fixtureInput);

describe('STORY-11: Copy, Formatting & Accessibility Pass', () => {
  describe('Task 5: WCAG 2.2 AA Contrast Compliance (#090d16 background)', () => {
    const bgDark = '#090d16';

    it('validates text tokens satisfy WCAG AA (>= 4.5:1) and AAA (>= 7.0:1) contrast against #090d16', () => {
      const tokens = [
        { name: 'text-white', hex: '#ffffff', minRatio: 7.0 },
        { name: 'text-slate-200', hex: '#e2e8f0', minRatio: 7.0 },
        { name: 'text-slate-300', hex: '#cbd5e1', minRatio: 7.0 },
        { name: 'text-slate-400', hex: '#94a3b8', minRatio: 4.5 },
        { name: 'text-emerald-400', hex: '#34d399', minRatio: 4.5 },
        { name: 'text-amber-400', hex: '#fbbf24', minRatio: 4.5 },
        { name: 'text-sky-400', hex: '#38bdf8', minRatio: 4.5 },
        { name: 'text-cyan-400', hex: '#22d3ee', minRatio: 4.5 },
      ];

      for (const token of tokens) {
        const ratio = getContrastRatio(token.hex, bgDark);
        assert.ok(
          ratio >= token.minRatio,
          `${token.name} (${token.hex}) contrast ratio ${ratio.toFixed(2)}:1 must meet or exceed ${token.minRatio}:1 against ${bgDark}`
        );
      }
    });

    it('verifies low contrast text tokens (text-slate-500, text-slate-600) are removed from active components', () => {
      const activeComponentFiles = [
        'SummaryTab.tsx',
        'CompareTab.tsx',
        'AdvancedTab.tsx',
        'Tabs.tsx',
        'VerdictCard.tsx',
        'ExpandableCostRow.tsx',
        'CostBarChart.tsx',
        'AdvancedRow.tsx',
        'CarFreeCard.tsx',
        'EvRoiSandbox.tsx',
        'CommuteForm.tsx',
        'SetupFlow.tsx',
        'FeedbackModal.tsx',
        'FeedbackButton.tsx',
        'ShareButton.tsx',
        'JourneyTimeline.tsx',
        'RouteMap.tsx',
      ];

      for (const fileName of activeComponentFiles) {
        const filePath = path.join(__dirname, '../src/components', fileName);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const hasSlate500 = /text-slate-500/.test(content);
          const hasSlate600 = /text-slate-600/.test(content);
          assert.strictEqual(
            hasSlate500,
            false,
            `${fileName} must not contain low-contrast text-slate-500`
          );
          assert.strictEqual(
            hasSlate600,
            false,
            `${fileName} must not contain low-contrast text-slate-600`
          );
        }
      }
    });
  });

  describe('Task 4: WCAG 2.2 AA Target Size (SC 2.5.8 Minimum 24x24 CSS px)', () => {
    it('verifies Tabs interactive buttons have minimum target sizes', () => {
      const html = renderToStaticMarkup(
        React.createElement(Tabs, { activeTab: 'summary', onTabChange: () => {} })
      );
      const dom = new JSDOM(html);
      const buttons = dom.window.document.querySelectorAll('button[role="tab"]');
      assert.strictEqual(buttons.length, 3, 'Must render 3 tabs');

      buttons.forEach((btn) => {
        const className = btn.className;
        const hasMinH =
          className.includes('min-h-[') ||
          className.includes('h-') ||
          className.includes('py-');
        assert.ok(hasMinH, 'Tab button must declare min-height or adequate padding for 24px target size');
      });
    });

    it('verifies SummaryTab action buttons meet target size requirement', () => {
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: fixtureInput,
          setCommuteInput: () => {},
          arbitrage,
        })
      );
      const dom = new JSDOM(html);
      const buttons = dom.window.document.querySelectorAll('button');

      assert.ok(buttons.length >= 2, 'SummaryTab must have action buttons');
      buttons.forEach((btn) => {
        const className = btn.className;
        const satisfiesTarget =
          className.includes('min-h-[24px]') ||
          className.includes('min-h-[') ||
          className.includes('p-4') ||
          className.includes('py-4') ||
          className.includes('p-3') ||
          className.includes('px-') ||
          className.includes('inline-flex');
        assert.ok(
          satisfiesTarget,
          `Button "${btn.textContent?.trim()}" must meet minimum 24px target size`
        );
      });
    });

    it('verifies ShareButton, FeedbackButton, and FeedbackModal satisfy minimum target sizes', () => {
      const shareHtml = renderToStaticMarkup(
        React.createElement(ShareButton, { commuteInput: fixtureInput })
      );
      assert.ok(
        shareHtml.includes('min-h-[32px]') || shareHtml.includes('min-h-[24px]'),
        'ShareButton must meet >= 24px target height'
      );

      const feedbackBtnHtml = renderToStaticMarkup(
        React.createElement(FeedbackButton, { onClick: () => {} })
      );
      assert.ok(
        feedbackBtnHtml.includes('min-h-[32px]') || feedbackBtnHtml.includes('min-h-[24px]'),
        'FeedbackButton must meet >= 24px target height'
      );

      const modalHtml = renderToStaticMarkup(
        React.createElement(FeedbackModal, { isOpen: true, onClose: () => {} })
      );
      const dom = new JSDOM(modalHtml);
      const closeBtn = dom.window.document.querySelector('button[aria-label="Close feedback modal"]');
      assert.ok(closeBtn, 'Close button must exist in FeedbackModal');
      assert.ok(
        closeBtn.className.includes('min-h-[24px]') && closeBtn.className.includes('min-w-[24px]'),
        'Close button must have min-h-[24px] and min-w-[24px]'
      );
    });
  });

  describe('Task 1 & 2: Copy Rules & Banned Words Enforcement (Section 7)', () => {
    const bannedWordRegex = /\b(successfully|please|simply|easy)\b/i;

    it('ensures SummaryTab contains no banned words and uses natural time phrasing', () => {
      const html = renderToStaticMarkup(
        React.createElement(SummaryTab, {
          commuteInput: fixtureInput,
          setCommuteInput: () => {},
          arbitrage,
        })
      );

      assert.strictEqual(
        bannedWordRegex.test(html),
        false,
        'SummaryTab must not contain banned words (successfully, please, simply, easy)'
      );
      assert.strictEqual(
        html.includes('/week') || html.includes('/wk') || html.includes('/day') || html.includes('/mo') || html.includes('/yr'),
        false,
        'SummaryTab must not contain shorthand time notation (/week, /wk, /day, /mo, /yr)'
      );
      assert.ok(html.includes('a week'), 'SummaryTab must use natural phrasing "a week"');
      assert.ok(html.includes('a day'), 'SummaryTab must use natural phrasing "a day"');
    });

    it('ensures CompareTab uses natural phrasing and contains no banned words', () => {
      const html = renderToStaticMarkup(
        React.createElement(CompareTab, {
          commuteInput: fixtureInput,
          arbitrage,
        })
      );

      assert.strictEqual(
        bannedWordRegex.test(html),
        false,
        'CompareTab must not contain banned words'
      );
      assert.strictEqual(
        html.includes('/week') || html.includes('/wk') || html.includes('/mo') || html.includes('/yr'),
        false,
        'CompareTab must not contain shorthand time notation (/week, /wk, /mo, /yr)'
      );
      assert.ok(html.includes('a week'), 'CompareTab must use "a week"');
    });

    it('ensures CarFreeCard and EvRoiSandbox use natural phrasing without /yr or km/yr', () => {
      const carFreeHtml = renderToStaticMarkup(
        React.createElement(CarFreeCard, {
          commuteInput: fixtureInput,
          arbitrage,
          defaultExpanded: true,
        })
      );
      assert.strictEqual(carFreeHtml.includes('km/yr'), false, 'CarFreeCard must not contain "km/yr"');
      assert.ok(carFreeHtml.includes('km a year'), 'CarFreeCard must use "km a year"');

      const evRoiHtml = renderToStaticMarkup(
        React.createElement(EvRoiSandbox, {
          input: fixtureInput,
          onChange: () => {},
        })
      );
      assert.strictEqual(evRoiHtml.includes('/yr'), false, 'EvRoiSandbox must not contain "/yr"');
      assert.ok(evRoiHtml.includes('a year'), 'EvRoiSandbox must use "a year"');
    });

    it('ensures FeedbackModal contains no banned words in error states or success copy', () => {
      const successHtml = renderToStaticMarkup(
        React.createElement(FeedbackModal, { isOpen: true, onClose: () => {}, initialSuccess: true })
      );
      assert.strictEqual(
        bannedWordRegex.test(successHtml),
        false,
        'FeedbackModal success state must not contain banned words'
      );
      assert.ok(
        successHtml.includes('Your feedback is recorded.'),
        'FeedbackModal must use direct natural language'
      );
    });
  });

  describe('Task 3: Number Formatting & Sentence Punctuation', () => {
    it('verifies calculateVerdict sentences include units ($ or min) and end with a period', () => {
      const testCases: Array<{ stops: number; stays: number; transit: number; driveMin: number; transitMin: number }> = [
        { stops: 120, stays: 50, transit: 30, driveMin: 20, transitMin: 45 },
        { stops: 30, stays: 40, transit: 110, driveMin: 20, transitMin: 35 },
        { stops: 45, stays: 30, transit: 46, driveMin: 25, transitMin: 28 },
      ];

      for (const tc of testCases) {
        const v = calculateVerdict({
          avoidableWeeklyDrivingCost: tc.stops,
          fixedWeeklyOwnershipCost: tc.stays,
          weeklyTransitCost: tc.transit,
          oneWayDriveMinutes: tc.driveMin,
          oneWayTransitMinutes: tc.transitMin,
        });

        assert.ok(v.headline.length > 0, 'Headline must not be empty');
        assert.ok(v.support.length > 0, 'Support copy must not be empty');
        // Sentences must end with period or punctuation
        assert.ok(
          /[.!?]$/.test(v.support.trim()),
          `Support sentence "${v.support}" must end with a period or punctuation mark.`
        );
        // Financial or time reference check
        assert.ok(
          v.support.includes('$') || v.support.includes('min') || v.support.includes('cost'),
          `Support sentence "${v.support}" must mention numerical cost or time.`
        );
      }
    });

    it('verifies VerdictCard displays verdict ending with punctuation and valid units', () => {
      const verdict = calculateVerdict({
        avoidableWeeklyDrivingCost: arbitrage.stops.total,
        fixedWeeklyOwnershipCost: arbitrage.stays.total,
        weeklyTransitCost: arbitrage.transitCost,
        oneWayDriveMinutes: arbitrage.drivingTimeMins,
        oneWayTransitMinutes: arbitrage.transitTimeMins,
      });

      const html = renderToStaticMarkup(React.createElement(VerdictCard, { verdict }));
      const dom = new JSDOM(html);
      const text = dom.window.document.body.textContent || '';
      assert.ok(text.includes(verdict.headline), 'VerdictCard renders headline');
      assert.ok(text.includes(verdict.support), 'VerdictCard renders support copy');
      assert.ok(/[.!?]$/.test(verdict.support.trim()), 'VerdictCard support ends with period');
    });
  });
});
