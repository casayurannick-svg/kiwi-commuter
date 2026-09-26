import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import DonationButton from '../DonationButton';

describe('src/components/DonationButton.tsx - US-27 Donation Button', () => {
  it('renders header variant with subtle icon, minimal text, target blank and rel noopener', () => {
    const html = renderToStaticMarkup(React.createElement(DonationButton, { variant: 'header' }));

    assert.ok(html.includes('<a'), 'Must render an anchor tag');
    assert.ok(html.includes('target="_blank"'), 'Must have target="_blank"');
    assert.ok(html.includes('rel="noopener noreferrer"'), 'Must have rel="noopener noreferrer"');
    assert.ok(html.includes('title="Buy Me a Coffee"'), 'Must have title attribute');
    assert.ok(html.includes('aria-label="Buy Me a Coffee"'), 'Must have aria-label');
    assert.ok(html.includes('Coffee'), 'Must render Coffee text');
  });

  it('renders footer variant with coffee emoji and full Buy Me a Coffee text', () => {
    const html = renderToStaticMarkup(React.createElement(DonationButton, { variant: 'footer' }));

    assert.ok(html.includes('<a'), 'Must render an anchor tag');
    assert.ok(html.includes('target="_blank"'), 'Must have target="_blank"');
    assert.ok(html.includes('rel="noopener noreferrer"'), 'Must have rel="noopener noreferrer"');
    assert.ok(html.includes('☕'), 'Must include coffee emoji');
    assert.ok(html.includes('Buy Me a Coffee'), 'Must include full "Buy Me a Coffee" text');
  });

  it('uses NEXT_PUBLIC_DONATION_URL when present or falls back to #', () => {
    const originalEnv = process.env.NEXT_PUBLIC_DONATION_URL;
    try {
      delete process.env.NEXT_PUBLIC_DONATION_URL;
      const htmlFallback = renderToStaticMarkup(React.createElement(DonationButton, { variant: 'header' }));
      assert.ok(htmlFallback.includes('href="#"'), 'Must fallback to href="#" when env var is not set');

      process.env.NEXT_PUBLIC_DONATION_URL = 'https://revolut.me/testdonor';
      const htmlWithUrl = renderToStaticMarkup(React.createElement(DonationButton, { variant: 'header' }));
      assert.ok(htmlWithUrl.includes('href="https://revolut.me/testdonor"'), 'Must use custom donation URL when configured');
    } finally {
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_DONATION_URL = originalEnv;
      } else {
        delete process.env.NEXT_PUBLIC_DONATION_URL;
      }
    }
  });
});
