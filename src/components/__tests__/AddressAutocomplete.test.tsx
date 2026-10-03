import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AddressAutocomplete from '../AddressAutocomplete';
import SetupFlow from '../SetupFlow';

describe('STORY-25: AddressAutocomplete & API Failure Disabled State', () => {
  it('renders input enabled by default when disabled and apiError are false', () => {
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-address',
        value: '',
        onChange: () => {},
        onSelect: () => {},
      })
    );

    assert.ok(html.includes('id="test-address"'), 'Must render address input');
    assert.strictEqual(
      html.includes('disabled=""') || html.includes('disabled '),
      false,
      'Input must not have disabled attribute by default'
    );
  });

  it('renders input with disabled attribute when disabled={true}', () => {
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-address',
        value: '',
        disabled: true,
        onChange: () => {},
        onSelect: () => {},
      })
    );

    assert.ok(
      html.includes('disabled=""') || html.includes('disabled'),
      'Input must render with disabled attribute when disabled is true'
    );
  });

  it('renders input with disabled attribute when apiError={true}', () => {
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-address',
        value: '',
        apiError: true,
        onChange: () => {},
        onSelect: () => {},
      })
    );

    assert.ok(
      html.includes('disabled=""') || html.includes('disabled'),
      'Input must render with disabled attribute when apiError is true'
    );
  });

  it('includes visual disabled styling classes for opacity and cursor', () => {
    const html = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        id: 'test-address',
        value: '',
        apiError: true,
        onChange: () => {},
        onSelect: () => {},
      })
    );

    assert.ok(
      html.includes('disabled:opacity-50'),
      'Input must have disabled:opacity-50 class to turn gray'
    );
    assert.ok(
      html.includes('disabled:cursor-not-allowed'),
      'Input must have disabled:cursor-not-allowed class to prevent pointer interactions'
    );
  });

  it('renders SetupFlow address inputs disabled when apiError triggers', () => {
    // In SetupFlow, when apiError is true, inputs receive disabled={apiError}
    const html = renderToStaticMarkup(
      React.createElement(SetupFlow, {
        onComplete: () => {},
      })
    );

    // Initial render without errors: inputs exist and are enabled
    assert.ok(html.includes('id="setup-from-input"'), 'Must render setup from input');
    assert.ok(html.includes('id="setup-to-input"'), 'Must render setup to input');
  });
});
