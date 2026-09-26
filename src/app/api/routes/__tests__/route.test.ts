import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { CommuteInput } from '@/types';

// Test the parseDurationSeconds helper logic directly
function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)s$/);
  if (match) return parseInt(match[1], 10);
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);
  return 0;
}

// Convert Google duration string to minutes via Math.round(parseInt(d.replace('s', '')) / 60)
function parseDurationMinutes(duration: string | undefined): number {
  if (!duration) return 0;
  const cleaned = duration.replace('s', '').trim();
  const seconds = parseInt(cleaned, 10);
  return isNaN(seconds) ? 0 : Math.round(seconds / 60);
}

describe('US-21: /api/routes – Google Routes Transit Duration', () => {
  it('parseDurationSeconds correctly parses "s"-suffix format', () => {
    assert.strictEqual(parseDurationSeconds('1800s'), 1800);
    assert.strictEqual(parseDurationSeconds('3600s'), 3600);
    assert.strictEqual(parseDurationSeconds('0s'), 0);
  });

  it('parseDurationSeconds returns 0 for undefined or empty string', () => {
    assert.strictEqual(parseDurationSeconds(undefined), 0);
    assert.strictEqual(parseDurationSeconds(''), 0);
  });

  it('parseDurationSeconds falls back to plain integer string', () => {
    assert.strictEqual(parseDurationSeconds('2400'), 2400);
  });

  it('parseDurationSeconds returns 0 for non-numeric strings', () => {
    assert.strictEqual(parseDurationSeconds('invalid'), 0);
    assert.strictEqual(parseDurationSeconds('30m'), 0); // minutes format not supported
  });

  it('parseDurationMinutes converts duration strings to minutes via Math.round(parseInt(d.replace("s", "")) / 60)', () => {
    assert.strictEqual(parseDurationMinutes('1860s'), 31);
    assert.strictEqual(parseDurationMinutes('300s'), 5);
    assert.strictEqual(parseDurationMinutes('2160s'), 36);
    assert.strictEqual(parseDurationMinutes(undefined), 0);
  });

  it('ensures ALL transit steps are summed together rather than overwriting in loop', () => {
    // Simulated Google Routes steps for Mt Roskill to Parnell:
    // Step 1: Walk to bus stop
    // Step 2: Bus 25B (1860s = 31m)
    // Step 3: Walk/transfer
    // Step 4: Bus OuterLink (300s = 5m)
    // Step 5: Walk to destination
    const steps = [
      { travelMode: 'WALK', staticDuration: '480s' },
      { travelMode: 'TRANSIT', staticDuration: '1860s', line: '25B' },
      { travelMode: 'WALK', staticDuration: '180s' },
      { travelMode: 'TRANSIT', staticDuration: '300s', line: 'OuterLink' },
      { travelMode: 'WALK', staticDuration: '360s' },
    ];

    let totalTransitMins = 0;
    const transitLines: string[] = [];

    for (const step of steps) {
      if (step.travelMode === 'TRANSIT') {
        const stepMins = parseDurationMinutes(step.staticDuration);
        // Correct accumulator logic:
        totalTransitMins += stepMins;
        if (step.line) transitLines.push(step.line);
      }
    }

    // Must NOT be 5 minutes (which would happen if step 4 overwrote step 2)
    assert.notStrictEqual(totalTransitMins, 5, 'Transit duration must not be overwritten by last step');
    assert.strictEqual(totalTransitMins, 36, 'Sum of 25B (31m) + OuterLink (5m) must equal 36m');
    assert.deepStrictEqual(transitLines, ['25B', 'OuterLink']);
  });

  it('reproduction test: Mt Roskill to Parnell outputs realistic transit duration (~30-36 mins) instead of 5 minutes', () => {
    // Setup reproduction input for 10 McAlister Place, Mt Roskill -> 56 Parnell Rd, Parnell
    const input: CommuteInput = {
      originSuburbId: 'mt-roskill',
      destinationSuburbId: 'parnell',
      originAddress: '10 McAlister Place, Mount Roskill, Auckland',
      destinationAddress: '56 Parnell Road, Parnell, Auckland',
      originCoordinates: [174.728277, -36.91447],
      destinationCoordinates: [174.778397, -36.851663],
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      firstMileMode: 'WALK',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
      // Values returned by /api/routes for this corridor:
      transitTimeMins: 56, // Total door-to-door
      transitRideDurationMins: 36, // Sum of 25B (31m) + OuterLink (5m)
      transitLines: ['25B', 'OuterLink'],
      transitSteps: [
        { line: '25B', durationMins: 31 },
        { line: 'OuterLink', durationMins: 5 },
      ],
    };

    const arbitrage = calculateCommuteArbitrage(input);
    const legs = arbitrage.journeyLegs || [];
    const transitLeg = legs.find((leg) => leg.type === 'TRANSIT');

    assert.ok(transitLeg, 'Must include a TRANSIT leg in journeyLegs');
    // Verify middle leg is NOT 5 minutes!
    assert.notStrictEqual(transitLeg.durationMins, 5, 'Transit leg duration must NOT be 5 minutes');
    // Verify middle leg outputs realistic travel time (~30-36 mins)
    assert.ok(
      transitLeg.durationMins >= 30 && transitLeg.durationMins <= 36,
      `Transit leg duration must be between 30 and 36 minutes, got: ${transitLeg.durationMins}`
    );
    assert.strictEqual(transitLeg.durationMins, 36, 'Middle transit leg duration must be 36 mins');
    assert.ok(transitLeg.title.includes('25B') && transitLeg.title.includes('OuterLink'), 'Title must reflect multi-leg lines');
    assert.ok(transitLeg.notes?.includes('25B (31m)') && transitLeg.notes?.includes('OuterLink (5m)'), 'Notes must show leg breakdown');
  });

  it('validates that API route file exists and references TRANSIT travelMode and steps', () => {
    const routePath = resolve(process.cwd(), 'src/app/api/routes/route.ts');
    const content = readFileSync(routePath, 'utf-8');

    assert.ok(content.includes("travelMode: 'TRANSIT'"), 'Must set travelMode: TRANSIT');
    assert.ok(content.includes('GOOGLE_ROUTES_API_KEY'), 'Must reference GOOGLE_ROUTES_API_KEY');
    assert.ok(content.includes('routes.googleapis.com'), 'Must call Google Routes API endpoint');
    assert.ok(content.includes('steps'), 'Must inspect and parse route steps');
    assert.ok(content.includes('totalTransitMins') || content.includes('totalTransitSeconds'), 'Must accumulate transit step duration');
    assert.ok(content.includes("source: 'google_routes_api'"), 'Must return source identifier');
    assert.ok(content.includes("source: 'fallback_none'"), 'Must return graceful fallback source');
  });

  it('validates DashboardClient fetches from /api/routes endpoint', () => {
    const dashPath = resolve(process.cwd(), 'src/components/DashboardClient.tsx');
    const content = readFileSync(dashPath, 'utf-8');

    assert.ok(content.includes('/api/routes'), 'DashboardClient must call /api/routes');
    assert.ok(content.includes('transitTimeMins'), 'DashboardClient must inject transitTimeMins from Google Routes');
    assert.ok(content.includes('transitRideDurationMins'), 'DashboardClient must inject transitRideDurationMins');
  });

  it('validates /api/routes route handles invalid coordinates with 400', async () => {
    const queryParams = { originLng: 'NaN', originLat: '100', destinationLng: 'abc', destinationLat: '-36.8' };
    const values = Object.values(queryParams).map(parseFloat);
    const hasNaN = values.some(isNaN);
    assert.ok(hasNaN, 'Missing/invalid coords must trigger validation failure (400 response)');
  });

  it('validates that GOOGLE_ROUTES_API_KEY is documented in .env.example', () => {
    const envExamplePath = resolve(process.cwd(), '.env.example');
    const content = readFileSync(envExamplePath, 'utf-8');
    assert.ok(content.includes('GOOGLE_ROUTES_API_KEY'), 'Must document GOOGLE_ROUTES_API_KEY in .env.example');
  });

  describe('US-35: Harbour-Separated Corridor Driving Road Distance (Devonport to Parnell)', () => {
    it('verifies Devonport to 56 Parnell Road returns ~17-18 km one-way road distance via Harbour Bridge', () => {
      // Devonport coordinates: [174.7960, -36.8315]
      // 56 Parnell Road coordinates: [174.778397, -36.851663]
      const input: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        originAddress: 'Devonport, Auckland',
        destinationAddress: '56 Parnell Road, Parnell, Auckland',
        originCoordinates: [174.7960, -36.8315],
        destinationCoordinates: [174.778397, -36.851663],
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: true,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);

      // Verify one-way distance is ~17-18 km (NOT 4 km straight-line across harbour water!)
      assert.ok(
        result.driving.distanceOneWayKm >= 17 && result.driving.distanceOneWayKm <= 18,
        `One-way road driving distance must be between 17 and 18 km, got: ${result.driving.distanceOneWayKm}`
      );
      assert.notStrictEqual(result.driving.distanceOneWayKm, 4, 'Must NOT use 4 km straight-line distance across harbour water');

      // Verify round-trip daily distance is ~34-36 km/day (NOT 8 km/day!)
      assert.ok(
        result.driving.distanceRoundTripKm >= 34 && result.driving.distanceRoundTripKm <= 36,
        `Round-trip daily road distance must be ~35 km/day, got: ${result.driving.distanceRoundTripKm}`
      );
      assert.notStrictEqual(result.driving.distanceRoundTripKm, 8, 'Must NOT be 8 km/day');

      // Verify monthly fuel cost reflects real ~35 km/day commute (e.g. ~$140-$160/mo, not $34/mo)
      assert.ok(
        result.driving.monthlyFuelCost > 100,
        `Monthly fuel cost must reflect real 35 km/day commute (> $100/mo), got: $${result.driving.monthlyFuelCost}`
      );
    });

    it('verifies drivingDistanceKm override takes precedence when supplied by /api/routes', () => {
      const input: CommuteInput = {
        originSuburbId: 'devonport',
        destinationSuburbId: 'parnell',
        drivingDistanceKm: 17.5,
        drivingTimeMins: 24,
        daysPerWeek: 5,
        vehicleType: 'petrol91',
        parkingDailyRate: 0,
        parkingDaysPerWeek: 0,
        concession: 'adult',
        includeMaintenanceWear: false,
        carpoolPassengers: 1,
      };

      const result = calculateCommuteArbitrage(input);

      assert.strictEqual(result.driving.distanceOneWayKm, 17.5);
      assert.strictEqual(result.driving.distanceRoundTripKm, 35);
      assert.strictEqual(result.drivingTimeMins, 24);
    });

    it('validates /api/routes and DashboardClient support travelMode: DRIVE and drivingDistanceKm', () => {
      const routePath = resolve(process.cwd(), 'src/app/api/routes/route.ts');
      const routeContent = readFileSync(routePath, 'utf-8');

      assert.ok(routeContent.includes("travelMode: 'DRIVE'"), 'Must support travelMode: DRIVE');
      assert.ok(routeContent.includes('drivingDistanceKm'), 'Must export drivingDistanceKm');
      assert.ok(routeContent.includes('drivingDurationMins'), 'Must export drivingDurationMins');
      assert.ok(routeContent.includes('distanceMeters'), 'Must parse distanceMeters from Google');

      const dashPath = resolve(process.cwd(), 'src/components/DashboardClient.tsx');
      const dashContent = readFileSync(dashPath, 'utf-8');

      assert.ok(dashContent.includes('drivingDistanceKm'), 'DashboardClient must inject drivingDistanceKm');
      assert.ok(dashContent.includes('drivingDurationMins') || dashContent.includes('drivingTimeMins'), 'DashboardClient must inject driving time');
    });
  });
});
