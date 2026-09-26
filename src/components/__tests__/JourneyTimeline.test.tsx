import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JourneyTimeline from '../JourneyTimeline';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { CommuteInput } from '@/types';

describe('src/components/JourneyTimeline.tsx - US-28 Segmented Timeline UI', () => {
  it('renders multimodal journey legs for Drive + Transit + Walk', () => {
    const input: CommuteInput = {
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      originAddress: '120 Dairy Flat Highway, Albany',
      destinationAddress: '188 Quay St, Auckland CBD',
      originCoordinates: [174.7082, -36.7295],
      destinationCoordinates: [174.7645, -36.8485],
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      firstMileMode: 'DRIVE',
      parkingDailyRate: 22,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    };

    const arbitrage = calculateCommuteArbitrage(input);
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { arbitrage, input })
    );

    // Verify container and header
    assert.ok(html.includes('data-testid="journey-timeline"'), 'Must render timeline container');
    assert.ok(html.includes('Segmented Journey Timeline'), 'Must render timeline header');
    assert.ok(html.includes('Albany Busway Station'), 'Must display nearest station name');
    assert.ok(html.includes('P&amp;R') || html.includes('P&R'), 'Must display Park & Ride badge');

    // Verify 3 segmented nodes
    assert.ok(html.includes('Drive to Station'), 'Must display Drive to Station node');
    assert.ok(html.includes('Ride'), 'Must display Transit Ride node');
    assert.ok(html.includes('Walk to Desk'), 'Must display Walk to Desk node');

    // Verify time and cost breakdown
    assert.ok(html.includes('mins'), 'Must display duration in mins');
    assert.ok(html.includes('Free'), 'Walk to desk should be Free');
  });

  it('renders E-Bike single-leg timeline when transit mode is EBIKE', () => {
    const input: CommuteInput = {
      originSuburbId: 'grey-lynn',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      transitMode: 'EBIKE',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    };

    const arbitrage = calculateCommuteArbitrage(input);
    const html = renderToStaticMarkup(
      React.createElement(JourneyTimeline, { arbitrage, input })
    );

    assert.ok(html.includes('E-Bike Commute'), 'Must render E-Bike Commute leg');
    assert.ok(html.includes('Direct active commute via cycleways'), 'Must include cycleway notes');
  });

  it('US-30: retains offline Turf.js spatial logic for driving mode and switches mode controls for walk/scooter', () => {
    const driveInput: CommuteInput = {
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      originCoordinates: [174.7082, -36.7295],
      destinationCoordinates: [174.7645, -36.8485],
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      firstMileMode: 'DRIVE',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    };

    const driveArbitrage = calculateCommuteArbitrage(driveInput);
    const driveHtml = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        arbitrage: driveArbitrage,
        input: driveInput,
        onFirstMileModeChange: () => {},
      })
    );

    // Retains offline rapid transit hub logic from at-stations.json exclusively for DRIVE
    assert.ok(driveHtml.includes('Albany Busway Station'), 'Driving mode must display rapid transit hub');
    assert.ok(driveHtml.includes('Drive to Station'), 'Must display Drive to Station leg');
    assert.ok(driveHtml.includes('P&amp;R') || driveHtml.includes('P&R'), 'Must display Park & Ride indicator');

    // Walk mode input
    const walkInput: CommuteInput = {
      ...driveInput,
      firstMileMode: 'WALK',
    };
    const walkArbitrage = calculateCommuteArbitrage(walkInput);
    const walkHtml = renderToStaticMarkup(
      React.createElement(JourneyTimeline, {
        arbitrage: walkArbitrage,
        input: walkInput,
        onFirstMileModeChange: () => {},
      })
    );

    // Displays walk mode selection and nodes
    assert.ok(walkHtml.includes('Walk to Station') || walkHtml.includes('Walk to Stop'));
    assert.ok(walkHtml.includes('First-Mile Mode to Station:'));
  });
});
