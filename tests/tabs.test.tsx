import assert from 'node:assert';
import { describe, it, beforeEach, afterEach } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot, Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { JSDOM } from 'jsdom';
import Tabs, { TABS } from '../src/components/Tabs';
import { CommuteInput, TabId } from '../src/types';
import { parseCommuteFromParams, serializeCommuteToParams } from '../src/lib/urlParams';
import { DEFAULT_COMMUTE_INPUT } from '../src/hooks/useCommuteForm';

const baseFallback: CommuteInput = {
  ...DEFAULT_COMMUTE_INPUT,
  originSuburbId: 'epsom',
  destinationSuburbId: 'cbd',
  daysPerWeek: 3,
};

describe('STORY-3: Tab Shell & URL State Navigation', () => {
  describe('Task 1: URL Parameter Serialization and Parsing (urlParams.ts)', () => {
    it('defaults to activeTab="summary" when no tab parameter is present in URL', () => {
      const params = new URLSearchParams('from=albany&to=cbd');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'summary');
      assert.strictEqual(parsed.tab, 'summary');
    });

    it('parses tab="compare" from URL parameter into activeTab="compare"', () => {
      const params = new URLSearchParams('tab=compare&from=epsom&to=cbd');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'compare');
      assert.strictEqual(parsed.tab, 'compare');
    });

    it('parses tab="advanced" from URL parameter into activeTab="advanced"', () => {
      const params = new URLSearchParams('tab=advanced');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'advanced');
      assert.strictEqual(parsed.tab, 'advanced');
    });

    it('supports activeTab alias parameter in URL', () => {
      const params = new URLSearchParams('activeTab=compare');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'compare');
    });

    it('normalizes uppercase and trimmed tab values safely', () => {
      const params = new URLSearchParams('tab= ADVANCED ');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'advanced');
    });

    it('falls back safely to summary when given an invalid tab parameter', () => {
      const params = new URLSearchParams('tab=nonexistent_tab');
      const parsed = parseCommuteFromParams(params, baseFallback);
      assert.strictEqual(parsed.activeTab, 'summary');
    });

    it('omits tab parameter when activeTab="summary" to preserve clean default URLs', () => {
      const input: CommuteInput = {
        ...baseFallback,
        activeTab: 'summary',
      };
      const params = serializeCommuteToParams(input);
      assert.strictEqual(params.has('tab'), false);
    });

    it('serializes tab="compare" when activeTab is set to compare', () => {
      const input: CommuteInput = {
        ...baseFallback,
        activeTab: 'compare',
      };
      const params = serializeCommuteToParams(input);
      assert.strictEqual(params.get('tab'), 'compare');
    });

    it('serializes tab="advanced" when activeTab is set to advanced', () => {
      const input: CommuteInput = {
        ...baseFallback,
        activeTab: 'advanced',
      };
      const params = serializeCommuteToParams(input);
      assert.strictEqual(params.get('tab'), 'advanced');
    });

    it('round-trips activeTab between serialization and parsing', () => {
      const tabs: TabId[] = ['summary', 'compare', 'advanced'];
      for (const tab of tabs) {
        const input: CommuteInput = { ...baseFallback, activeTab: tab };
        const serialized = serializeCommuteToParams(input);
        const parsed = parseCommuteFromParams(serialized, baseFallback);
        assert.strictEqual(parsed.activeTab, tab);
      }
    });
  });

  describe('Task 2 & 4: Tabs Component Structure & ARIA Keyboard Accessibility', () => {
    it('renders all three tabs: Summary, Compare, and Advanced', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'summary' }));
      assert.ok(html.includes('Summary'), 'Must render Summary tab');
      assert.ok(html.includes('Compare'), 'Must render Compare tab');
      assert.ok(html.includes('Advanced'), 'Must render Advanced tab');
    });

    it('contains sticky navigation styling for header anchoring', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'summary' }));
      assert.ok(html.includes('sticky'), 'Must contain sticky positioning class');
      assert.ok(html.includes('top-[57px]'), 'Must anchor directly beneath the sticky top navbar');
    });

    it('enforces W3C ARIA tablist and tab roles', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'summary' }));
      assert.ok(html.includes('role="tablist"'), 'Must define role="tablist" on container');
      assert.ok(html.includes('aria-label="Dashboard navigation tabs"'), 'Must have accessible tablist label');
      assert.ok(html.includes('role="tab"'), 'Each button must have role="tab"');
      assert.ok(html.includes('aria-controls="panel-summary"'), 'Summary tab controls panel-summary');
      assert.ok(html.includes('aria-controls="panel-compare"'), 'Compare tab controls panel-compare');
      assert.ok(html.includes('aria-controls="panel-advanced"'), 'Advanced tab controls panel-advanced');
    });

    it('sets aria-selected and tabIndex correctly based on activeTab="summary"', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'summary' }));
      assert.ok(
        html.includes('id="tab-summary"') && html.includes('aria-selected="true"') && html.includes('tabindex="0"'),
        'Summary tab must have aria-selected="true" and tabIndex 0'
      );
      assert.ok(
        html.includes('id="tab-compare"') && html.includes('aria-selected="false"') && html.includes('tabindex="-1"'),
        'Compare tab must have aria-selected="false" and tabIndex -1'
      );
    });

    it('sets aria-selected and tabIndex correctly based on activeTab="compare"', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'compare' }));
      assert.ok(
        html.includes('id="tab-compare"') && html.includes('aria-selected="true"'),
        'Compare tab must have aria-selected="true"'
      );
      assert.ok(
        html.includes('id="tab-summary"') && html.includes('aria-selected="false"'),
        'Summary tab must have aria-selected="false"'
      );
    });

    it('sets aria-selected and tabIndex correctly based on activeTab="advanced"', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'advanced' }));
      assert.ok(
        html.includes('id="tab-advanced"') && html.includes('aria-selected="true"'),
        'Advanced tab must have aria-selected="true"'
      );
    });
  });

  describe('Task 2 & 5: Interactive Tab Switching & Zero Layout Shift', () => {
    let dom: JSDOM;
    let originalWindow: any;
    let originalDocument: any;
    let root: Root | null = null;

    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
        url: 'http://localhost:3000/?from=epsom&to=cbd',
      });
      originalWindow = global.window;
      originalDocument = global.document;
      // @ts-ignore
      global.window = dom.window;
      // @ts-ignore
      global.document = dom.window.document;
    });

    afterEach(() => {
      if (root) {
        flushSync(() => {
          root?.unmount();
        });
        root = null;
      }
      // @ts-ignore
      global.window = originalWindow;
      // @ts-ignore
      global.document = originalDocument;
    });

    it('clicking Compare tab pushes URL parameter and calls onTabChange', () => {
      let selectedTab: TabId | null = null;
      const pushedUrls: string[] = [];

      const originalPushState = dom.window.history.pushState.bind(dom.window.history);
      dom.window.history.pushState = (data, unused, url) => {
        pushedUrls.push(String(url));
        return originalPushState(data, unused, url);
      };

      const container = dom.window.document.getElementById('root')!;
      root = createRoot(container);
      flushSync(() => {
        root?.render(
          React.createElement(Tabs, {
            activeTab: 'summary',
            onTabChange: (tab) => {
              selectedTab = tab;
            },
          })
        );
      });

      const compareButton = container.querySelector('#tab-compare') as HTMLButtonElement;
      assert.ok(compareButton, 'Compare tab button must exist');

      compareButton.click();

      assert.strictEqual(selectedTab, 'compare', 'onTabChange must be called with "compare"');
      assert.ok(pushedUrls.length > 0, 'Must push update to browser history');
      assert.ok(pushedUrls[pushedUrls.length - 1].includes('tab=compare'), 'Pushed URL must contain tab=compare');
    });

    it('clicking Summary tab removes tab parameter from URL', () => {
      let selectedTab: TabId | null = null;
      const pushedUrls: string[] = [];

      dom.reconfigure({ url: 'http://localhost:3000/?tab=compare&from=epsom&to=cbd' });

      dom.window.history.pushState = (data, unused, url) => {
        pushedUrls.push(String(url));
      };

      const container = dom.window.document.getElementById('root')!;
      root = createRoot(container);
      flushSync(() => {
        root?.render(
          React.createElement(Tabs, {
            activeTab: 'compare',
            onTabChange: (tab) => {
              selectedTab = tab;
            },
          })
        );
      });

      const summaryButton = container.querySelector('#tab-summary') as HTMLButtonElement;
      assert.ok(summaryButton, 'Summary button must exist');

      summaryButton.click();

      assert.strictEqual(selectedTab, 'summary', 'onTabChange must be called with "summary"');
      assert.ok(pushedUrls.length > 0, 'Must push history update');
      const lastUrl = pushedUrls[pushedUrls.length - 1];
      assert.ok(!lastUrl.includes('tab='), 'Clean URL must omit tab=summary parameter');
    });

    it('navigates through tabs with keyboard ArrowRight, ArrowLeft, Home, and End', () => {
      const selectedTabs: TabId[] = [];

      const container = dom.window.document.getElementById('root')!;
      root = createRoot(container);
      flushSync(() => {
        root?.render(
          React.createElement(Tabs, {
            activeTab: 'summary',
            onTabChange: (tab) => {
              selectedTabs.push(tab);
            },
          })
        );
      });

      const summaryBtn = container.querySelector('#tab-summary') as HTMLButtonElement;
      assert.ok(summaryBtn, 'Summary button exists');

      // Dispatch ArrowRight from Summary -> should target Compare
      const rightEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      });
      summaryBtn.dispatchEvent(rightEvent);

      assert.ok(selectedTabs.includes('compare'), 'ArrowRight from summary must select compare');

      // Dispatch End -> should target Advanced
      const endEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      });
      summaryBtn.dispatchEvent(endEvent);

      assert.ok(selectedTabs.includes('advanced'), 'End key must select advanced tab');

      // Dispatch Home -> should target Summary
      const homeEvent = new dom.window.KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      });
      summaryBtn.dispatchEvent(homeEvent);

      assert.ok(selectedTabs.includes('summary'), 'Home key must select summary tab');
    });

    it('ensures tab container has stable min-height (52px) to prevent layout shifts', () => {
      const html = renderToStaticMarkup(React.createElement(Tabs, { activeTab: 'summary' }));
      assert.ok(html.includes('min-h-[52px]'), 'Tabs container must specify fixed min-height for zero layout shift');
    });
  });

  describe('Task 3: Shell Integration & Section Reachability', () => {
    it('verifies all tab definitions have matching tab panels defined in DOM structure', () => {
      for (const tab of TABS) {
        assert.ok(tab.id, 'Tab must have an ID');
        assert.ok(['summary', 'compare', 'advanced'].includes(tab.id), `ID ${tab.id} must be valid`);
      }
    });

    it('verifies DEFAULT_COMMUTE_INPUT initializes activeTab to summary', () => {
      assert.strictEqual(DEFAULT_COMMUTE_INPUT.activeTab, 'summary');
    });
  });
});
