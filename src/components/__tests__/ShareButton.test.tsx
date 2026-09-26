import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ShareButton from '../ShareButton';
import { CommuteInput } from '@/types';

describe('src/components/ShareButton.tsx - US-36 Share Button Component', () => {
  const sampleInput: CommuteInput = {
    originSuburbId: 'devonport',
    destinationSuburbId: 'parnell',
    originAddress: '10 Queens Parade, Devonport, Auckland',
    destinationAddress: '56 Parnell Road, Parnell, Auckland',
    originCoordinates: [174.7972, -36.8306],
    destinationCoordinates: [174.7788, -36.8576],
    daysPerWeek: 4,
    vehicleType: 'bev',
    powertrain: 'BEV',
    parkingDailyRate: 22,
    parkingTier: 'CBD_EARLY_BIRD',
    drivingDistanceKm: 17.8,
    drivingTimeMins: 28,
    transitTimeMins: 32,
    firstMileMode: 'WALK',
  };

  it('renders a button with data-testid="share-button" and accessibility attributes', () => {
    const html = renderToStaticMarkup(React.createElement(ShareButton, { commuteInput: sampleInput }));

    assert.ok(html.includes('data-testid="share-button"'), 'Must render button with data-testid="share-button"');
    assert.ok(html.includes('aria-label="Share comparison link"'), 'Must have aria-label');
    assert.ok(html.includes('title="Copy shareable link with current commute parameters"'), 'Must have title attribute');
    assert.ok(html.includes('Share'), 'Must render Share label initially');
  });

  it('applies custom className when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(ShareButton, {
        commuteInput: sampleInput,
        className: 'custom-share-btn-class',
      })
    );

    assert.ok(html.includes('custom-share-btn-class'), 'Must apply custom className');
  });
});
