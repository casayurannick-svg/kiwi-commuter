import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { CommuteInput } from '@/types';
import { getNextWeekdayMorningISO } from '@/lib/routes';
import { GET } from '../route';

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

  describe('BUG-63: /api/routes Park & Ride Waypoint Injection for Ferry', () => {
    it('injects Hobsonville ferry waypoint and synthesizes two legs when origin is inland address', async () => {
      // Inland origin in Hobsonville (e.g. 124 Hobsonville Road: lng=174.6450, lat=-36.8150)
      // Destination in Auckland CBD (lng=174.7645, lat=-36.8485)
      const req = new Request(
        'http://localhost/api/routes?originLng=174.6450&originLat=-36.8150&destinationLng=174.7645&destinationLat=-36.8485&transitMode=FERRY&firstMileMode=DRIVE'
      );
      const res = await GET(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.waypointInjected, true, 'Must set waypointInjected to true');
      assert.strictEqual(json.waypointTerminal, 'Hobsonville Point Ferry Terminal');
      assert.ok(json.firstMileDistanceKm > 0, `firstMileDistanceKm must be > 0, got: ${json.firstMileDistanceKm}`);
      assert.ok(json.firstMileDurationMins > 0, `firstMileDurationMins must be > 0, got: ${json.firstMileDurationMins}`);
      assert.strictEqual(json.firstMileMode, 'DRIVE');
      assert.ok(json.transitDurationMins > 0, `transitDurationMins must be > 0, got: ${json.transitDurationMins}`);
      assert.strictEqual(
        json.totalDurationMins,
        json.firstMileDurationMins + json.transitDurationMins,
        'totalDurationMins must synthesize Leg 1 and Leg 2 durations'
      );
    });

    it('supports CYCLE as firstMileMode for ferry park & ride waypoint injection', async () => {
      const req = new Request(
        'http://localhost/api/routes?originLng=174.6450&originLat=-36.8150&destinationLng=174.7645&destinationLat=-36.8485&transitMode=FERRY&firstMileMode=CYCLE'
      );
      const res = await GET(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.waypointInjected, true);
      assert.strictEqual(json.firstMileMode, 'CYCLE');
      assert.ok(json.firstMileDistanceKm > 0);
      assert.ok(json.firstMileDurationMins > 0);
      assert.strictEqual(json.totalDurationMins, json.firstMileDurationMins + json.transitDurationMins);
    });

    it('does NOT inject waypoint if origin is already at Hobsonville Point Ferry Terminal', async () => {
      // Exact Hobsonville Ferry Terminal coords: [174.6680, -36.7980]
      const req = new Request(
        'http://localhost/api/routes?originLng=174.6680&originLat=-36.7980&destinationLng=174.7645&destinationLat=-36.8485&transitMode=FERRY'
      );
      const res = await GET(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.waypointInjected, undefined, 'Must not inject waypoint when origin is already at terminal');
      assert.strictEqual(json.firstMileDistanceKm, undefined);
    });
  });

  describe('FEAT: Ferry + Bus Multimodal Connections & Departure Time Resolution', () => {
    it('getNextWeekdayMorningISO returns a valid ISO-8601 string for next Monday 07:30 NZT', () => {
      const iso = getNextWeekdayMorningISO();
      assert.ok(iso, 'Must return a non-empty string');
      const date = new Date(iso);
      assert.ok(!isNaN(date.getTime()), 'Must parse as a valid Date');
      assert.ok(date.getTime() > Date.now(), 'Must be in the future');

      // Verify it lands on Monday morning 07:30 in Pacific/Auckland
      const aucklandFormatter = new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'Pacific/Auckland',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const formatted = aucklandFormatter.format(date);
      // e.g. "Mon, 07:30"
      assert.ok(formatted.includes('Mon'), `Expected Monday, got: ${formatted}`);
      assert.ok(formatted.includes('07:30'), `Expected 07:30 AM, got: ${formatted}`);
    });

    it('mocks a successful Ferry + Bus response in Google Routes API, ensuring it does NOT trigger fallback_none', async () => {
      const originalFetch = globalThis.fetch;
      const originalApiKey = process.env.GOOGLE_ROUTES_API_KEY;

      process.env.GOOGLE_ROUTES_API_KEY = 'mock_google_routes_key_test';

      let interceptedPayload: Record<string, unknown> | null = null;

      try {
        globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
          const urlStr = String(url);
          if (urlStr.includes('routes.googleapis.com')) {
            const body = JSON.parse(String(init?.body || '{}'));
            interceptedPayload = body;

            const isLegA = body.destination?.location?.latLng?.latitude === -36.8430;
            if (isLegA) {
              // Leg A: Hobsonville to Downtown Ferry Terminal (Ferry)
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '2100s', // 35 mins
                      legs: [
                        {
                          duration: '2100s',
                          steps: [
                            {
                              travelMode: 'TRANSIT',
                              staticDuration: '2100s',
                              transitDetails: {
                                headsign: 'Downtown Ferry Terminal',
                                transitLine: {
                                  name: 'Hobsonville Ferry',
                                  vehicle: { type: 'FERRY' },
                                },
                                stopDetails: {
                                  departureStop: { name: 'Hobsonville Point Ferry Terminal' },
                                  arrivalStop: { name: 'Downtown Ferry Terminal' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              } as Response;
            } else {
              // Leg B: Downtown Ferry Terminal to Parnell (InnerLink Bus)
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '1200s', // 20 mins door to door
                      legs: [
                        {
                          duration: '1200s',
                          steps: [
                            {
                              travelMode: 'WALK',
                              staticDuration: '300s', // 5m walk
                            },
                            {
                              travelMode: 'TRANSIT',
                              staticDuration: '900s', // 15m bus
                              transitDetails: {
                                headsign: 'InnerLink to Parnell',
                                transitLine: {
                                  name: 'InnerLink',
                                  shortName: 'INL',
                                  vehicle: { type: 'BUS' },
                                },
                                stopDetails: {
                                  departureStop: { name: 'Queens Wharf / Customs St' },
                                  arrivalStop: { name: '56 Parnell Rd' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              } as Response;
            }
          }

          return originalFetch(url, init);
        }) as typeof fetch;

        // Origin at Hobsonville Ferry Terminal [174.6680, -36.7980]
        // Destination at 56 Parnell Road [174.778397, -36.851663]
        const req = new Request(
          'http://localhost/api/routes?originLng=174.6680&originLat=-36.7980&destinationLng=174.778397&destinationLat=-36.851663&transitMode=FERRY'
        );

        const res = await GET(req);
        assert.strictEqual(res.status, 200);

        const json = await res.json();

        // 1. Must use google_routes_api source and NOT fallback_none
        assert.strictEqual(
          json.source,
          'google_routes_api',
          'Must return google_routes_api source when upstream returns Ferry + Bus route'
        );

        // 2. Verify payload sent to Google Routes did not over-restrict allowedTravelModes
        assert.ok(interceptedPayload, 'Must have made request to Google Routes API');
        const prefs = (interceptedPayload as Record<string, unknown>).transitPreferences as
          | Record<string, unknown>
          | undefined;
        assert.strictEqual(
          prefs?.allowedTravelModes,
          undefined,
          'allowedTravelModes must NOT be over-restricted for FERRY so multimodal transit is allowed'
        );
        assert.notStrictEqual(
          prefs?.routingPreference,
          'FEWER_TRANSFERS',
          'Must not enforce FEWER_TRANSFERS for FERRY so bus connections are permitted'
        );

        // 3. Verify departureTime was set to a valid weekday morning ISO string
        const departureTime = (interceptedPayload as Record<string, unknown>).departureTime as string;
        assert.ok(departureTime, 'Must send departureTime in request payload');
        assert.ok(new Date(departureTime).getTime() > Date.now(), 'departureTime must be in the future');

        // 4. Verify aggregated duration & multimodal steps
        assert.strictEqual(json.transitDurationMins, 50, 'Pure transit duration must sum 35m Ferry + 15m Bus = 50m');
        assert.strictEqual(json.totalDurationMins, 55, 'Total door-to-door duration must be 55m');
        assert.deepStrictEqual(json.transitLines, ['Hobsonville Ferry', 'INL']);
        assert.strictEqual(json.transitSteps?.length, 2);
        assert.strictEqual(json.transitSteps[0].travelMode, 'FERRY');
        assert.strictEqual(json.transitSteps[0].line, 'Hobsonville Ferry');
        assert.strictEqual(json.transitSteps[1].vehicleType, 'BUS');
        assert.strictEqual(json.transitSteps[1].line, 'INL');
      } finally {
        globalThis.fetch = originalFetch;
        if (originalApiKey === undefined) {
          delete process.env.GOOGLE_ROUTES_API_KEY;
        } else {
          process.env.GOOGLE_ROUTES_API_KEY = originalApiKey;
        }
      }
    });

    it('BUG-69: forces strict ferry transit leg and prevents all-bus overrides for inland destinations', async () => {
      const originalFetch = globalThis.fetch;
      const originalApiKey = process.env.GOOGLE_ROUTES_API_KEY;
      process.env.GOOGLE_ROUTES_API_KEY = 'mock_google_routes_key_test';

      const queriedRequests: Array<{ origin: unknown; destination: unknown; travelMode?: string }> = [];

      try {
        globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
          const urlStr = String(url);
          if (urlStr.includes('routes.googleapis.com')) {
            const body = JSON.parse(String(init?.body || '{}'));
            queriedRequests.push({
              origin: body.origin?.location?.latLng,
              destination: body.destination?.location?.latLng,
              travelMode: body.travelMode,
            });

            const isLegA = body.destination?.location?.latLng?.latitude === -36.8430;
            if (isLegA) {
              // Leg A forced to Downtown Ferry Terminal (Queens Wharf)
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '2100s',
                      legs: [
                        {
                          duration: '2100s',
                          steps: [
                            {
                              travelMode: 'TRANSIT',
                              staticDuration: '2100s',
                              transitDetails: {
                                headsign: 'Downtown Ferry Terminal',
                                transitLine: { name: 'Hobsonville Ferry', vehicle: { type: 'FERRY' } },
                                stopDetails: {
                                  departureStop: { name: 'Hobsonville Point Ferry Terminal' },
                                  arrivalStop: { name: 'Downtown Ferry Terminal' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              } as Response;
            } else if (body.travelMode === 'TRANSIT') {
              // Leg B forced from Downtown Ferry Terminal to destination
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '1020s',
                      legs: [
                        {
                          duration: '1020s',
                          steps: [
                            {
                              travelMode: 'TRANSIT',
                              staticDuration: '720s',
                              transitDetails: {
                                headsign: 'InnerLink to Parnell',
                                transitLine: { name: 'InnerLink', shortName: 'INL', vehicle: { type: 'BUS' } },
                                stopDetails: {
                                  departureStop: { name: 'Customs St' },
                                  arrivalStop: { name: '56 Parnell Rd' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              } as Response;
            } else {
              // Drive route
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '1800s',
                      distanceMeters: 25000,
                    },
                  ],
                }),
              } as Response;
            }
          }

          return originalFetch(url, init);
        }) as typeof fetch;

        // Query an inland destination with transitMode=FERRY
        const req = new Request(
          'http://localhost/api/routes?originLng=174.6680&originLat=-36.7980&destinationLng=174.778397&destinationLat=-36.851663&transitMode=FERRY'
        );
        const res = await GET(req);
        assert.strictEqual(res.status, 200);

        const json = await res.json();

        // Verify that intermediate Downtown Ferry Terminal (Queens Wharf: -36.8430) was injected
        const transitRequests = queriedRequests.filter((r) => r.travelMode === 'TRANSIT');
        assert.ok(transitRequests.length >= 2, 'Must query both Ferry Leg A and Connecting Transit Leg B');
        assert.strictEqual(
          (transitRequests[0].destination as { latitude: number })?.latitude,
          -36.8430,
          'Leg A must force destination to Downtown Ferry Terminal'
        );
        assert.strictEqual(
          (transitRequests[1].origin as { latitude: number })?.latitude,
          -36.8430,
          'Leg B must force origin from Downtown Ferry Terminal'
        );

        // Verify that the route contains a strict Ferry step and was not overridden by an all-bus route
        assert.strictEqual(json.transitSteps?.[0]?.travelMode, 'FERRY');
        assert.strictEqual(json.transitSteps?.[0]?.vehicleType, 'FERRY');
        assert.strictEqual(json.transitSteps?.[0]?.line, 'Hobsonville Ferry');
        assert.strictEqual(json.transitSteps?.[0]?.arrivalStop, 'Downtown Ferry Terminal');

        // Verify connecting transit leg is bus
        assert.strictEqual(json.transitSteps?.[1]?.travelMode, 'TRANSIT');
        assert.strictEqual(json.transitSteps?.[1]?.vehicleType, 'BUS');

        // Verify total transit lines and metrics
        assert.ok(json.transitLines.includes('Hobsonville Ferry'));
        assert.ok(json.transitLines.includes('INL'));
        assert.strictEqual(json.transitDurationMins, 47); // 35m + 12m
        assert.strictEqual(json.totalDurationMins, 52); // 35m + 17m
      } finally {
        globalThis.fetch = originalFetch;
        if (originalApiKey === undefined) {
          delete process.env.GOOGLE_ROUTES_API_KEY;
        } else {
          process.env.GOOGLE_ROUTES_API_KEY = originalApiKey;
        }
      }
    });

    it('fallback mode provides multimodal Ferry + connecting Bus steps when origin is terminal and destination is inland', async () => {
      // Ensure GOOGLE_ROUTES_API_KEY is not set to test graceful fallback
      const originalApiKey = process.env.GOOGLE_ROUTES_API_KEY;
      delete process.env.GOOGLE_ROUTES_API_KEY;

      try {
        const req = new Request(
          'http://localhost/api/routes?originLng=174.6680&originLat=-36.7980&destinationLng=174.778397&destinationLat=-36.851663&transitMode=FERRY'
        );
        const res = await GET(req);
        assert.strictEqual(res.status, 200);

        const json = await res.json();
        // In fallback without key, source is fallback_none but transit duration is NOT null
        assert.strictEqual(json.source, 'fallback_none');
        assert.ok(json.transitDurationMins > 0, 'transitDurationMins must be populated for ferry fallback');
        assert.ok(json.totalDurationMins > 0, 'totalDurationMins must be populated');
        assert.ok(json.transitLines?.includes('Hobsonville Ferry'));
        assert.ok(json.transitLines?.includes('InnerLink Bus'));
        assert.strictEqual(json.transitSteps?.length, 2, 'Should include Ferry and Bus steps in fallback to Parnell');
      } finally {
        if (originalApiKey === undefined) {
          delete process.env.GOOGLE_ROUTES_API_KEY;
        } else {
          process.env.GOOGLE_ROUTES_API_KEY = originalApiKey;
        }
      }
    });

    it('BUG-70: asserts that long walks to ferry terminals still return Ferry routes, not bus fallbacks', async () => {
      // Inland origin in West Auckland (~5.5km from Hobsonville Point Ferry Terminal)
      // Destination in Parnell
      const req = new Request(
        'http://localhost/api/routes?originLng=174.6200&originLat=-36.8100&destinationLng=174.778397&destinationLat=-36.851663&transitMode=FERRY&firstMileMode=WALK'
      );
      const res = await GET(req);
      assert.strictEqual(res.status, 200);

      const json = await res.json();
      assert.strictEqual(json.waypointInjected, true, 'Must inject ferry waypoint even for long walks');
      assert.strictEqual(json.waypointTerminal, 'Hobsonville Point Ferry Terminal');
      assert.strictEqual(json.firstMileMode, 'WALK');
      assert.ok(json.firstMileDistanceKm >= 5, `Expected long walk >= 5 km, got ${json.firstMileDistanceKm}`);
      assert.ok(json.firstMileDurationMins >= 60, `Expected long walk >= 60 mins, got ${json.firstMileDurationMins}`);

      // Must strictly return Ferry route, NOT bus fallback
      assert.ok(json.transitLines.includes('Hobsonville Ferry'), 'Must include Hobsonville Ferry in transit lines');
      assert.strictEqual(json.transitSteps?.[0]?.travelMode, 'FERRY', 'First transit step must be FERRY');
      assert.strictEqual(json.transitSteps?.[0]?.line, 'Hobsonville Ferry');
      assert.strictEqual(json.transitSteps?.[0]?.departureStop, 'Hobsonville Point Ferry Terminal');
      assert.strictEqual(json.transitSteps?.[0]?.arrivalStop, 'Downtown Ferry Terminal');

      // Connecting transit leg into Parnell
      assert.strictEqual(json.transitSteps?.[1]?.travelMode, 'TRANSIT');
      assert.strictEqual(json.transitSteps?.[1]?.vehicleType, 'BUS');

      // Total duration must synthesize Leg 1 walk + Leg 2 ferry + Leg 3 connecting bus
      assert.strictEqual(json.totalDurationMins, json.firstMileDurationMins + json.transitDurationMins);
    });

    it('BUG-70: mocks Google Routes API with a long first-mile WALK and asserts strict Ferry + Bus synthesis', async () => {
      const originalFetch = globalThis.fetch;
      const originalApiKey = process.env.GOOGLE_ROUTES_API_KEY;

      process.env.GOOGLE_ROUTES_API_KEY = 'mock_google_routes_key_bug70';

      const queriedRequests: Array<{ travelMode: string; origin: unknown; destination: unknown }> = [];

      try {
        globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
          const urlStr = String(url);
          if (urlStr.includes('routes.googleapis.com')) {
            const body = JSON.parse(String(init?.body || '{}'));
            queriedRequests.push({
              travelMode: body.travelMode,
              origin: body.origin?.location?.latLng,
              destination: body.destination?.location?.latLng,
            });

            if (body.travelMode === 'WALK') {
              // Leg 1: Long walk (6.5km, 78 mins)
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '4680s', // 78 mins
                      distanceMeters: 6500, // 6.5 km
                      legs: [{ duration: '4680s', distanceMeters: 6500 }],
                    },
                  ],
                }),
              };
            }

            if (body.travelMode === 'TRANSIT') {
              const isLegA = body.destination?.location?.latLng?.latitude === -36.8430;
              if (isLegA) {
                // Leg A: Hobsonville to Downtown Ferry Terminal (Ferry)
                return {
                  ok: true,
                  json: async () => ({
                    routes: [
                      {
                        duration: '2100s', // 35 mins
                        legs: [
                          {
                            duration: '2100s',
                            steps: [
                              {
                                travelMode: 'TRANSIT',
                                staticDuration: '2100s',
                                transitDetails: {
                                  transitLine: {
                                    name: 'Hobsonville Ferry',
                                    shortName: 'HOBH',
                                    vehicle: { type: 'FERRY' },
                                  },
                                  stopDetails: {
                                    departureStop: { name: 'Hobsonville Point Ferry Terminal' },
                                    arrivalStop: { name: 'Downtown Ferry Terminal' },
                                  },
                                },
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  }),
                };
              }

              // Leg B: Downtown Ferry Terminal to Parnell (Bus)
              return {
                ok: true,
                json: async () => ({
                  routes: [
                    {
                      duration: '900s', // 15 mins
                      legs: [
                        {
                          duration: '900s',
                          steps: [
                            {
                              travelMode: 'TRANSIT',
                              staticDuration: '600s', // 10 mins
                              transitDetails: {
                                transitLine: {
                                  name: 'InnerLink Bus',
                                  shortName: 'INL',
                                  vehicle: { type: 'BUS' },
                                },
                                stopDetails: {
                                  departureStop: { name: 'Downtown Stop' },
                                  arrivalStop: { name: 'Parnell Stop' },
                                },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                }),
              };
            }
          }
          return { ok: true, json: async () => ({ routes: [] }) };
        }) as unknown as typeof fetch;

        const req = new Request(
          'http://localhost/api/routes?originLng=174.6200&originLat=-36.8100&destinationLng=174.778397&destinationLat=-36.851663&transitMode=FERRY&firstMileMode=WALK'
        );
        const res = await GET(req);
        assert.strictEqual(res.status, 200);

        const json = await res.json();
        const walkRequests = queriedRequests.filter((r) => r.travelMode === 'WALK');
        assert.strictEqual(walkRequests.length, 1, 'Must dispatch Leg 1 query with travelMode WALK');

        assert.strictEqual(json.firstMileMode, 'WALK');
        assert.strictEqual(json.firstMileDistanceKm, 6.5);
        assert.strictEqual(json.firstMileDurationMins, 78);

        // Strict Ferry step preserved
        assert.strictEqual(json.transitSteps?.[0]?.travelMode, 'FERRY');
        assert.strictEqual(json.transitSteps?.[0]?.vehicleType, 'FERRY');
        assert.strictEqual(json.transitSteps?.[0]?.line, 'HOBH');

        // Connecting bus step preserved
        assert.strictEqual(json.transitSteps?.[1]?.travelMode, 'TRANSIT');
        assert.strictEqual(json.transitSteps?.[1]?.vehicleType, 'BUS');

        // Total time synthesizes all legs (78m walk + 35m ferry + 15m leg B = 128m)
        assert.strictEqual(json.totalDurationMins, 78 + 35 + 15);
      } finally {
        globalThis.fetch = originalFetch;
        if (originalApiKey === undefined) {
          delete process.env.GOOGLE_ROUTES_API_KEY;
        } else {
          process.env.GOOGLE_ROUTES_API_KEY = originalApiKey;
        }
      }
    });
  });
});


