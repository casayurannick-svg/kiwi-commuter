import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import KiwiPathwayIcon from '../icons/KiwiPathwayIcon';
import fs from 'node:fs';
import path from 'node:path';

describe('US-31: KiwiPathwayIcon Component', () => {
  it('renders SVG with correct viewBox, className, and accessibility attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(KiwiPathwayIcon, {
        className: 'h-8 w-8 text-emerald-500',
        'aria-label': 'Kiwi Commuter',
      })
    );

    assert.ok(html.includes('viewBox="0 0 120 120"'), 'Must have viewBox="0 0 120 120"');
    assert.ok(html.includes('class="h-8 w-8 text-emerald-500"'), 'Must apply Tailwind className');
    assert.ok(html.includes('aria-label="Kiwi Commuter"'), 'Must apply aria-label attribute');
    assert.ok(html.includes('role="img"'), 'Must have role="img"');
  });

  it('renders the transit route pathways, nodes, and arrowheads', () => {
    const html = renderToStaticMarkup(
      React.createElement(KiwiPathwayIcon, {
        className: 'h-8 w-8 text-emerald-500',
      })
    );

    // Main transit line and inner route paths
    assert.ok(html.includes('d="M30,85 C10,85 10,45 35,35 C55,27 65,40 80,45 C95,50 105,55 110,58"'), 'Must contain main transit route');
    assert.ok(html.includes('d="M98,48 L110,58 L98,66"'), 'Must contain forward momentum arrowhead');
    assert.ok(html.includes('cx="75" cy="60" r="4"'), 'Must contain internal destination node');
    assert.ok(html.includes('cx="82" cy="42" r="4"'), 'Must contain transit stop eye node');
  });

  it('verifies DashboardClient renders KiwiPathwayIcon in top-left navigation', () => {
    const dashboardPath = path.resolve(process.cwd(), 'src/components/DashboardClient.tsx');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    assert.ok(
      content.includes('KiwiPathwayIcon'),
      'DashboardClient must import and render KiwiPathwayIcon'
    );
    assert.ok(
      content.includes('className="h-8 w-8 text-emerald-500 shrink-0"'),
      'KiwiPathwayIcon must have h-8 w-8 text-emerald-500 styling'
    );
    assert.ok(
      content.includes('aria-label="Kiwi Commuter"'),
      'KiwiPathwayIcon must have aria-label="Kiwi Commuter"'
    );
    assert.ok(
      content.includes('The daily commute calculator for driving and public transport.'),
      'DashboardClient must display the updated subtitle'
    );
  });
});
