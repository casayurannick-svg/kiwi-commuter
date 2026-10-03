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
    assert.ok(html.includes('disabled'), 'Input should be disabled when apiError is true');
  });
});
