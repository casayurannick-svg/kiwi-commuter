import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getPrimaryTransitMode,
  getPrimaryTransitModeLabel,
  normalizeTransitMode,
  TRANSIT_MODE_HIERARCHY,
} from '../src/lib/routing';
import { JourneyLeg, TransitStepDetail } from '../src/types';

describe('BUG-15: Multimodal Primary Mode Hierarchy & Detection Engine', () => {
  describe('Duration-based primary mode selection', () => {
    it('correctly selects Train over Bus when Train duration is longer (3m bus connection to 73m train ride)', () => {
      const legs: Partial<JourneyLeg>[] = [
        {
          id: 'leg-bus',
          type: 'TRANSIT',
          mode: 'BUS',
          durationMins: 3,
          title: 'Bus 25B Ride',
        },
        {
          id: 'leg-train',
          type: 'TRANSIT',
          mode: 'TRAIN',
          durationMins: 73,
          title: 'Western Line Train Ride',
        },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'train', '73m train ride must dominate 3m bus connection');
    });

    it('correctly selects Bus over Train when Bus duration is longer (45m bus to 10m train)', () => {
      const legs: Partial<JourneyLeg>[] = [
        {
          id: 'leg-bus',
          type: 'TRANSIT',
          mode: 'BUS',
          durationMins: 45,
          title: 'NX1 Express Bus Ride',
        },
        {
          id: 'leg-train',
          type: 'TRANSIT',
          mode: 'TRAIN',
          durationMins: 10,
          title: 'Southern Line Train Ride',
        },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'bus', '45m bus ride must dominate 10m train ride');
    });

    it('correctly selects Ferry over Bus when Ferry duration is longer (25m ferry to 8m feeder bus)', () => {
      const steps: TransitStepDetail[] = [
        {
          line: 'Hobsonville Ferry',
          travelMode: 'FERRY',
          vehicleType: 'FERRY',
          durationMins: 25,
        },
        {
          line: '110 Bus',
          travelMode: 'TRANSIT',
          vehicleType: 'BUS',
          durationMins: 8,
        },
      ];

      const primary = getPrimaryTransitMode(steps);
      assert.strictEqual(primary, 'ferry', '25m ferry must dominate 8m feeder bus');
    });

    it('correctly selects Train over Ferry when Train duration is longer (40m train to 15m ferry)', () => {
      const steps: TransitStepDetail[] = [
        {
          line: 'Eastern Line',
          travelMode: 'TRAIN',
          vehicleType: 'TRAIN',
          durationMins: 40,
        },
        {
          line: 'Devonport Ferry',
          travelMode: 'FERRY',
          vehicleType: 'FERRY',
          durationMins: 15,
        },
      ];

      const primary = getPrimaryTransitMode(steps);
      assert.strictEqual(primary, 'train', '40m train must dominate 15m ferry');
    });
  });

  describe('Rigid hierarchy tie-breaking (Train > Ferry > Bus)', () => {
    it('breaks ties in favor of Train when Train and Bus durations are equal (20m vs 20m)', () => {
      const legs: Partial<JourneyLeg>[] = [
        { mode: 'BUS', durationMins: 20 },
        { mode: 'TRAIN', durationMins: 20 },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'train', 'Train must take precedence over Bus when durations are equal');
    });

    it('breaks ties in favor of Ferry when Ferry and Bus durations are equal (15m vs 15m)', () => {
      const legs: Partial<JourneyLeg>[] = [
        { mode: 'BUS', durationMins: 15 },
        { mode: 'FERRY', durationMins: 15 },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'ferry', 'Ferry must take precedence over Bus when durations are equal');
    });

    it('breaks ties in favor of Train when Train and Ferry durations are equal (30m vs 30m)', () => {
      const legs: Partial<JourneyLeg>[] = [
        { mode: 'FERRY', durationMins: 30 },
        { mode: 'TRAIN', durationMins: 30 },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'train', 'Train must take precedence over Ferry when durations are equal');
    });

    it('strictly applies rigid hierarchy when no durations are specified', () => {
      assert.strictEqual(getPrimaryTransitMode(['bus', 'train']), 'train');
      assert.strictEqual(getPrimaryTransitMode(['bus', 'ferry']), 'ferry');
      assert.strictEqual(getPrimaryTransitMode(['ferry', 'train']), 'train');
      assert.strictEqual(getPrimaryTransitMode(['bus', 'ferry', 'train']), 'train');
    });

    it('allows strategy="hierarchy" override regardless of duration', () => {
      const steps: TransitStepDetail[] = [
        { line: 'NX1', vehicleType: 'BUS', durationMins: 80 },
        { line: 'Western Line', vehicleType: 'TRAIN', durationMins: 5 },
      ];

      // Duration strategy chooses Bus (80m > 5m)
      assert.strictEqual(getPrimaryTransitMode(steps, { strategy: 'duration' }), 'bus');

      // Hierarchy strategy strictly enforces Train > Bus
      assert.strictEqual(getPrimaryTransitMode(steps, { strategy: 'hierarchy' }), 'train');
    });
  });

  describe('Casing formats & labels', () => {
    it('returns lowercase mode by default for sentence nouns', () => {
      const legs: Partial<JourneyLeg>[] = [{ mode: 'TRAIN', durationMins: 30 }];
      const mode = getPrimaryTransitMode(legs);
      assert.strictEqual(mode, 'train');
      assert.strictEqual(`The ${mode} would save you`, 'The train would save you');
    });

    it('returns TitleCase mode when requested via options', () => {
      const legs: Partial<JourneyLeg>[] = [{ mode: 'TRAIN', durationMins: 30 }];
      assert.strictEqual(getPrimaryTransitMode(legs, { format: 'titlecase' }), 'Train');
      assert.strictEqual(getPrimaryTransitMode([{ mode: 'FERRY' }], { format: 'titlecase' }), 'Ferry');
      assert.strictEqual(getPrimaryTransitMode([{ mode: 'BUS' }], { format: 'titlecase' }), 'Bus');
    });

    it('provides correct human-readable UI labels via getPrimaryTransitModeLabel', () => {
      assert.strictEqual(getPrimaryTransitModeLabel('train'), 'Train');
      assert.strictEqual(getPrimaryTransitModeLabel('ferry'), 'Ferry');
      assert.strictEqual(getPrimaryTransitModeLabel('bus'), 'Bus');
      assert.strictEqual(getPrimaryTransitModeLabel('ebike'), 'E-Bike');
    });
  });

  describe('Nested transitSteps and multimodal array variations', () => {
    it('evaluates nested transitSteps within a single TRANSIT JourneyLeg', () => {
      const legs: JourneyLeg[] = [
        {
          id: 'leg-first',
          title: 'Walk to Station',
          type: 'FIRST_MILE',
          mode: 'WALK',
          originName: 'Home',
          destinationName: 'New Lynn Station',
          distanceKm: 0.8,
          durationMins: 10,
          cost: 0,
          costFormatted: 'Free',
          iconName: 'Footprints',
        },
        {
          id: 'leg-transit',
          title: 'Transit Journey',
          type: 'TRANSIT',
          mode: 'BUS', // Legacy first-item mode
          originName: 'New Lynn Station',
          destinationName: 'Britomart Hub',
          distanceKm: 15,
          durationMins: 76,
          cost: 4.80,
          costFormatted: '$4.80',
          iconName: 'Bus',
          transitSteps: [
            {
              line: '68 Bus',
              vehicleType: 'BUS',
              durationMins: 3,
            },
            {
              line: 'Western Line',
              vehicleType: 'TRAIN',
              durationMins: 73,
            },
          ],
        },
        {
          id: 'leg-last',
          title: 'Walk to Desk',
          type: 'LAST_MILE',
          mode: 'WALK',
          originName: 'Britomart Hub',
          destinationName: 'Office',
          distanceKm: 0.4,
          durationMins: 5,
          cost: 0,
          costFormatted: 'Free',
          iconName: 'Building',
        },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(
        primary,
        'train',
        'Should identify Train as primary mode from nested transitSteps despite first leg being Walk and first step being Bus'
      );
    });

    it('ignores First-Mile and Last-Mile walk legs when transit legs are present', () => {
      const legs: Partial<JourneyLeg>[] = [
        { type: 'FIRST_MILE', mode: 'WALK', durationMins: 15 },
        { type: 'TRANSIT', mode: 'BUS', durationMins: 10 },
        { type: 'LAST_MILE', mode: 'WALK', durationMins: 12 },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'bus', 'Walk legs must not override actual transit mode');
    });

    it('falls back to walk when trip is purely walking', () => {
      const legs: Partial<JourneyLeg>[] = [
        { type: 'FIRST_MILE', mode: 'WALK', durationMins: 15 },
        { type: 'LAST_MILE', mode: 'WALK', durationMins: 12 },
      ];

      const primary = getPrimaryTransitMode(legs);
      assert.strictEqual(primary, 'walk');
    });

    it('safely handles empty array, null, or undefined by defaulting to bus', () => {
      assert.strictEqual(getPrimaryTransitMode([]), 'bus');
      assert.strictEqual(getPrimaryTransitMode(null), 'bus');
      assert.strictEqual(getPrimaryTransitMode(undefined), 'bus');
      assert.strictEqual(getPrimaryTransitMode([], { format: 'titlecase' }), 'Bus');
    });

    it('normalizes various synonymous line and vehicle strings', () => {
      assert.strictEqual(normalizeTransitMode('HEAVY_RAIL'), 'train');
      assert.strictEqual(normalizeTransitMode('subway'), 'train');
      assert.strictEqual(normalizeTransitMode('Onehunga Line'), 'train');
      assert.strictEqual(normalizeTransitMode('InnerLink'), 'bus');
      assert.strictEqual(normalizeTransitMode('NX2'), 'bus');
      assert.strictEqual(normalizeTransitMode('Pine Harbour Ferry'), 'ferry');
      assert.strictEqual(normalizeTransitMode('boat'), 'ferry');
      assert.strictEqual(normalizeTransitMode('cycle'), 'ebike');
    });
  });
});
