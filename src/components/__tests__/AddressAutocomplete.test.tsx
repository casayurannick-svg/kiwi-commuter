import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AddressAutocomplete from '../AddressAutocomplete';

describe('AddressAutocomplete component - STORY-25 disable on API error', () => {
  it('renders input elements with disabled attribute when apiError is true', () => {
    const onChange = () => {};
    const onSelect = () => {};
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-input',
        value: '',
        onChange,
        onSelect,
        apiError: true,
      })
    );
    // The input element should have disabled attribute
    assert.ok(html.includes('disabled=""'), 'Input should be disabled when apiError is true');
  });
});

describe('AddressAutocomplete – UI state recovery on Turso fallback success', () => {
  it('renders enabled input when apiError is false (Turso succeeded)', () => {
    const onChange = () => {};
    const onSelect = () => {};
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-recovery',
        value: '',
        onChange,
        onSelect,
        apiError: false,
      })
    );
    // The input must NOT carry the disabled="" attribute when apiError=false.
    // Note: Tailwind utility classes like 'disabled:opacity-50' will still appear
    // in the class string — we specifically check for the HTML attribute 'disabled=""'.
    assert.ok(
      !html.includes('disabled=""'),
      'Input must be re-enabled (no disabled="" attribute) when apiError=false (Turso fallback succeeded)'
    );
  });

  it('renders disabled input when apiError is true (before fallback)', () => {
    const onChange = () => {};
    const onSelect = () => {};
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-error',
        value: '',
        onChange,
        onSelect,
        apiError: true,
      })
    );
    assert.ok(html.includes('disabled=""'), 'Input must be disabled when apiError=true');
  });
});
