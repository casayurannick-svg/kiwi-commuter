import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import AddressAutocomplete from '../src/components/AddressAutocomplete';
import { GeocodingResult } from '../src/lib/mapbox';

describe('AddressAutocomplete Component', () => {
  it('renders input with combobox role and placeholder', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;

    const container = dom.window.document.getElementById('root')!;
    const root = createRoot(container);

    flushSync(() => {
      root.render(
        React.createElement(AddressAutocomplete, {
          id: 'test-address',
          label: 'Test Address',
          placeholder: 'Search address...',
          value: '',
          onChange: () => {},
          onSelect: () => {},
        })
      );
    });

    const input = container.querySelector('#test-address') as HTMLInputElement;
    assert.ok(input, 'Input must exist');
    assert.strictEqual(input.getAttribute('role'), 'combobox');
    assert.strictEqual(input.getAttribute('placeholder'), 'Search address...');
    assert.strictEqual(input.getAttribute('aria-label'), 'Test Address');

    flushSync(() => {
      root.unmount();
    });
  });

  it('renders suggestions dropdown and selects an address on click', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;

    const container = dom.window.document.getElementById('root')!;
    const root = createRoot(container);

    let selectedItem: GeocodingResult | null = null;
    let textValue = '';

    flushSync(() => {
      root.render(
        React.createElement(AddressAutocomplete, {
          id: 'test-auto',
          testId: 'test-auto',
          value: textValue,
          onChange: (val) => {
            textValue = val;
          },
          onSelect: (item) => {
            selectedItem = item;
          },
        })
      );
    });

    const input = container.querySelector('#test-auto') as HTMLInputElement;

    const nativeSetter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      'value'
    )?.set;

    flushSync(() => {
      nativeSetter?.call(input, 'Ponsonby');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });

    let dropdown: Element | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 25));
      flushSync(() => {});
      dropdown = container.querySelector('[data-testid="test-auto-dropdown"]');
      if (dropdown) break;
    }

    assert.ok(dropdown, 'Dropdown must render with suggestions');

    const item0 = container.querySelector('[data-testid="test-auto-suggestion-0"]') as HTMLButtonElement;
    assert.ok(item0, 'First suggestion exists');
    assert.ok(item0.textContent?.includes('Ponsonby'), 'Item text includes suburb name');

    flushSync(() => {
      item0.click();
    });

    assert.ok(selectedItem !== null, 'Item should be selected');
    assert.ok(selectedItem?.placeName.includes('Ponsonby'), 'Selected item should be Ponsonby');
    assert.strictEqual(
      container.querySelector('[data-testid="test-auto-dropdown"]'),
      null,
      'Dropdown must close after selection'
    );

    // Clear button functionality
    const clearBtn = container.querySelector('[data-testid="test-auto-clear-btn"]') as HTMLButtonElement;
    assert.ok(clearBtn, 'Clear button should exist when input is non-empty');

    flushSync(() => {
      clearBtn.click();
    });

    assert.strictEqual(input.value, '', 'Input value should be cleared');

    flushSync(() => {
      root.unmount();
    });
  });

  it('handles outside click to dismiss the dropdown', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="outside-elem"></div><div id="root"></div></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;

    const container = dom.window.document.getElementById('root')!;
    const outsideElem = dom.window.document.getElementById('outside-elem')!;
    const root = createRoot(container);

    flushSync(() => {
      root.render(
        React.createElement(AddressAutocomplete, {
          id: 'test-outside',
          testId: 'test-outside',
          value: '',
          onChange: () => {},
          onSelect: () => {},
        })
      );
    });

    const input = container.querySelector('#test-outside') as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      dom.window.HTMLInputElement.prototype,
      'value'
    )?.set;

    flushSync(() => {
      nativeSetter?.call(input, 'Newmarket');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });

    let outsideDropdown: Element | null = null;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 25));
      flushSync(() => {});
      outsideDropdown = container.querySelector('[data-testid="test-outside-dropdown"]');
      if (outsideDropdown) break;
    }

    assert.ok(outsideDropdown, 'Dropdown is open');

    // Click outside
    flushSync(() => {
      dom.window.document.dispatchEvent(
        new dom.window.MouseEvent('mousedown', { bubbles: true })
      );
    });

    assert.strictEqual(
      container.querySelector('[data-testid="test-outside-dropdown"]'),
      null,
      'Dropdown must close on outside click'
    );

    flushSync(() => {
      root.unmount();
    });
  });
});
