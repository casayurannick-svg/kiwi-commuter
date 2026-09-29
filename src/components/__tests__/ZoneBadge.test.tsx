import { describe, it } from 'vitest';
import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ZoneBadge from '../ZoneBadge';

describe('ZoneBadge Component (US-42)', () => {
  it('renders origin zone badge with Z prefix, hub name, and emerald styling', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZoneBadge, {
        zone: 2,
        hubName: 'Mount Roskill',
        variant: 'origin',
        'data-testid': 'origin-zone-badge',
      })
    );

    assert.ok(html.includes('Z2'), 'Must include zone formatted as Z2');
    assert.ok(html.includes('Mount Roskill'), 'Must include hub name Mount Roskill');
    assert.ok(html.includes('data-testid="origin-zone-badge"'), 'Must include data-testid');
    assert.ok(html.includes('text-emerald-300'), 'Must include emerald text color for origin');
  });

  it('renders destination zone badge with sky styling', () => {
    const html = renderToStaticMarkup(
      React.createElement(ZoneBadge, {
        zone: 1,
        hubName: 'Auckland CBD',
        variant: 'destination',
        'data-testid': 'destination-zone-badge',
      })
    );

    assert.ok(html.includes('Z1'), 'Must include zone formatted as Z1');
    assert.ok(html.includes('Auckland CBD'), 'Must include hub name Auckland CBD');
    assert.ok(html.includes('data-testid="destination-zone-badge"'), 'Must include data-testid');
    assert.ok(html.includes('text-sky-300'), 'Must include sky text color for destination');
  });
});
