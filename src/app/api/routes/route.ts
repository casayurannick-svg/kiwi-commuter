import { NextResponse } from 'next/server';
import { estimateRoadMetrics, haversineDistanceKm, getNextWeekdayMorningISO } from '@/lib/routes';

export const dynamic = 'force-dynamic';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// BUG-63: Hobsonville Point Ferry Terminal coordinates for waypoint injection
const HOBSONVILLE_FERRY_TERMINAL_COORDS: [number, number] = [174.6680, -36.7980];

export interface TransitStepDetail {
  line: string;
  durationMins: number;
  durationSeconds?: number;
  departureStop?: string;
  arrivalStop?: string;
  travelMode?: string;
  vehicleType?: string;
}

export interface GoogleRoutesResponse {
  transitDurationMins: number | null; // Pure in-vehicle transit duration (sum of all transit steps, e.g. 36 mins)
  totalDurationMins: number | null; // Total door-to-door journey time (e.g. 56 mins)
  transitSteps?: TransitStepDetail[]; // Breakdown of each transit step (e.g. 25B 31m, OuterLink 5m)
  transitLines?: string[]; // Names of transit lines (e.g. ['25B', 'OuterLink'])
  legCount: number;

  // US-35: Driving metrics via Google Routes computeRoutes (travelMode: 'DRIVE')
  drivingDistanceMeters?: number | null; // e.g. 17500 meters
  drivingDistanceKm?: number | null; // Real road driving distance e.g. 17.5 km
  drivingDurationMins?: number | null; // Real road driving duration e.g. 25 mins

  // BUG-63: Park & Ride waypoint injection for ferry commutes
  firstMileDistanceKm?: number | null;
  firstMileDurationMins?: number | null;
  firstMileMode?: string | null;
  waypointInjected?: boolean;
  waypointTerminal?: string | null;

  source: 'google_routes_api' | 'fallback_none';
  departureTime?: string;
  debug?: Record<string, unknown>;
}

export type GoogleRoutesTransitResponse = GoogleRoutesResponse;

interface GoogleRouteLegStep {
  travelMode?: string;
  staticDuration?: string;
  transitDetails?: {
    headsign?: string;
    transitLine?: {
      name?: string;
      nameShort?: string;
      shortName?: string;
      vehicle?: {
        type?: string;
      };
    };
    stopDetails?: {
      departureStop?: { name?: string };
      arrivalStop?: { name?: string };
    };
  };
}

interface GoogleRouteLeg {
  distanceMeters?: number;
  duration?: string;
  steps?: GoogleRouteLegStep[];
}

interface GoogleRoute {
  distanceMeters?: number;
  duration?: string;
  legs?: GoogleRouteLeg[];
}

interface GoogleComputeRoutesApiResponse {
  routes?: GoogleRoute[];
}

/**
 * US-21 & US-35: Google Routes API – Multimodal Route Endpoint
 *
 * Accepts [originLng, originLat] and [destinationLng, destinationLat] as query params.
 * Calls the Google Routes API (v2) for both DRIVE and TRANSIT (or via travelMode param).
 * Captures:
 *   - DRIVE: routes.distanceMeters and routes.duration (real road distance e.g. ~17-18 km for Devonport to Parnell)
 *   - TRANSIT: routes.duration, routes.legs.steps... summing all transit steps
 *
 * Query params:
 *   - originLng, originLat   – WGS84 origin coordinates
 *   - destinationLng, destinationLat – WGS84 destination coordinates
 *   - travelMode – optional 'DRIVE' | 'TRANSIT' | 'BOTH' (default: 'BOTH')
 *   - departureTime – optional ISO-8601 departure time (default: next Monday 08:00 NZST)
 *   - debug – optional boolean ('1' or 'true') for diagnostic details
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const originLng = parseFloat(searchParams.get('originLng') || '');
  const originLat = parseFloat(searchParams.get('originLat') || '');
  const destinationLng = parseFloat(searchParams.get('destinationLng') || '');
  const destinationLat = parseFloat(searchParams.get('destinationLat') || '');
  const travelModeParam = (searchParams.get('travelMode') || 'BOTH').toUpperCase();
  const transitModeParam = (searchParams.get('transitMode') || '').toUpperCase();
  const rawFirstMileMode = (searchParams.get('firstMileMode') || 'DRIVE').toUpperCase();
  const firstMileMode: 'DRIVE' | 'CYCLE' | 'SCOOTER' | 'WALK' =
    rawFirstMileMode === 'CYCLE' || rawFirstMileMode === 'SCOOTER' || rawFirstMileMode === 'WALK'
      ? rawFirstMileMode
      : 'DRIVE';
  const isDebug = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';

  // Validate coordinates
  if ([originLng, originLat, destinationLng, destinationLat].some(isNaN)) {
    return NextResponse.json(
      { error: 'Missing or invalid coordinates. Provide originLng, originLat, destinationLng, destinationLat.' },
      { status: 400 }
    );
  }

  // BUG-63: Check if Ferry Waypoint Injection is active
  // If transitMode=FERRY and the origin is not already at the Hobsonville Ferry Terminal (within 150m)
  const distToHobsonvilleTerminalKm = haversineDistanceKm([originLng, originLat], HOBSONVILLE_FERRY_TERMINAL_COORDS);
  const isOriginAlreadyTerminal = distToHobsonvilleTerminalKm < 0.15;
  const shouldInjectFerryWaypoint = transitModeParam === 'FERRY' && !isOriginAlreadyTerminal;

  // Use provided departure time or compute next weekday morning (7:30 AM Auckland time)
  let departureTime = searchParams.get('departureTime');
  const now = new Date();
  if (
    !departureTime ||
    isNaN(Date.parse(departureTime)) ||
    new Date(departureTime).getTime() <= now.getTime()
  ) {
    departureTime = getNextWeekdayMorningISO(now);
  }

  const apiKey = process.env.GOOGLE_ROUTES_API_KEY || '';
  let debugDetails: Record<string, unknown> | undefined;

  if (isDebug) {
    debugDetails = {
      hasKey: Boolean(apiKey),
      keyLength: apiKey.length,
      keyPrefix: apiKey ? `${apiKey.slice(0, 4)}...` : null,
      departureTime,
      travelModeParam,
      transitModeParam,
      firstMileMode,
      shouldInjectFerryWaypoint,
      distToHobsonvilleTerminalKm,
    };
  }

  const shouldFetchDrive = travelModeParam === 'DRIVE' || travelModeParam === 'BOTH';
  const shouldFetchTransit = travelModeParam === 'TRANSIT' || travelModeParam === 'BOTH';

  // Multimodal Transit Preferences:
  // For FERRY commutes, ensure multimodal transit (FERRY + BUS + TRAIN) is allowed to reach inland destinations (e.g. Parnell).
  // We do NOT set or restrict allowedTravelModes (Google Routes API defaults to all modes: FERRY, BUS, TRAIN).
  // We do NOT set routingPreference: 'FEWER_TRANSFERS' for FERRY so transfers (e.g., Downtown Ferry Terminal to InnerLink Bus) are not suppressed.
  const transitPreferences: Record<string, unknown> = {};
  if (transitModeParam !== 'FERRY') {
    transitPreferences.routingPreference = 'FEWER_TRANSFERS';
  }

  // Attempt Google Routes API if key is configured
  if (apiKey) {
    try {
      let drivingDistanceMeters: number | null = null;
      let drivingDistanceKm: number | null = null;
      let drivingDurationMins: number | null = null;

      let transitDurationMins: number | null = null;
      let totalDurationMins: number | null = null;
      const transitSteps: TransitStepDetail[] = [];
      const transitLines: string[] = [];
      let legCount = 0;

      let firstMileDistanceKm: number | null = null;
      let firstMileDurationMins: number | null = null;
      let waypointInjected = false;
      let waypointTerminal: string | null = null;

      // 1. Fetch Driving Route if requested (direct origin to destination for private vehicle comparison)
      const drivePromise = shouldFetchDrive
        ? fetch(GOOGLE_ROUTES_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters',
            },
            body: JSON.stringify({
              origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
              destination: { location: { latLng: { latitude: destinationLat, longitude: destinationLng } } },
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE',
            }),
          }).then(async (res) => (res.ok ? res.json() : null)).catch(() => null)
        : Promise.resolve(null);

      // 2. Fetch Transit Route (with Waypoint Injection for Ferry if active)
      let transitPromise: Promise<unknown>;
      let leg1Promise: Promise<unknown> = Promise.resolve(null);

      if (shouldFetchTransit && shouldInjectFerryWaypoint) {
        waypointInjected = true;
        waypointTerminal = 'Hobsonville Point Ferry Terminal';
        const firstMileGoogleMode =
          firstMileMode === 'CYCLE' ? 'BICYCLE' : firstMileMode === 'WALK' ? 'WALK' : 'DRIVE';

        // Leg 1: First-Mile from origin to Hobsonville Point Ferry Terminal
        leg1Promise = fetch(GOOGLE_ROUTES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs.duration,routes.legs.distanceMeters',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
            destination: {
              location: {
                latLng: {
                  latitude: HOBSONVILLE_FERRY_TERMINAL_COORDS[1],
                  longitude: HOBSONVILLE_FERRY_TERMINAL_COORDS[0],
                },
              },
            },
            travelMode: firstMileGoogleMode,
          }),
        }).then(async (res) => (res.ok ? res.json() : null)).catch(() => null);

        // Leg 2: Transit from Hobsonville Point Ferry Terminal to destination
        transitPromise = fetch(GOOGLE_ROUTES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.legs.duration,routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: HOBSONVILLE_FERRY_TERMINAL_COORDS[1],
                  longitude: HOBSONVILLE_FERRY_TERMINAL_COORDS[0],
                },
              },
            },
            destination: { location: { latLng: { latitude: destinationLat, longitude: destinationLng } } },
            travelMode: 'TRANSIT',
            departureTime,
            computeAlternativeRoutes: false,
            ...(Object.keys(transitPreferences).length > 0 ? { transitPreferences } : {}),
          }),
        }).then(async (res) => (res.ok ? res.json() : null)).catch(() => null);
      } else if (shouldFetchTransit) {
        transitPromise = fetch(GOOGLE_ROUTES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.legs.duration,routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
          },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
            destination: { location: { latLng: { latitude: destinationLat, longitude: destinationLng } } },
            travelMode: 'TRANSIT',
            departureTime,
            computeAlternativeRoutes: false,
            ...(Object.keys(transitPreferences).length > 0 ? { transitPreferences } : {}),
          }),
        }).then(async (res) => (res.ok ? res.json() : null)).catch(() => null);
      } else {
        transitPromise = Promise.resolve(null);
      }

      const [driveData, transitData, leg1Data] = (await Promise.all([
        drivePromise,
        transitPromise,
        leg1Promise,
      ])) as [
        GoogleComputeRoutesApiResponse | null,
        GoogleComputeRoutesApiResponse | null,
        GoogleComputeRoutesApiResponse | null
      ];

      // Parse Drive results
      if (driveData?.routes?.[0]) {
        const driveRoute = driveData.routes[0];
        let distMeters = driveRoute.distanceMeters;
        if (typeof distMeters !== 'number' && Array.isArray(driveRoute.legs)) {
          distMeters = driveRoute.legs.reduce((acc: number, leg: { distanceMeters?: number }) => acc + (leg.distanceMeters || 0), 0);
        }
        if (typeof distMeters === 'number' && distMeters > 0) {
          drivingDistanceMeters = distMeters;
          drivingDistanceKm = Math.round((distMeters / 1000) * 10) / 10;
        }

        let durSeconds = parseDurationSeconds(driveRoute.duration);
        if (durSeconds === 0 && Array.isArray(driveRoute.legs)) {
          for (const leg of driveRoute.legs) {
            durSeconds += parseDurationSeconds(leg.duration);
          }
        }
        if (durSeconds > 0) {
          drivingDurationMins = Math.round(durSeconds / 60);
        }
      }

      // Parse Transit results
      if (transitData?.routes?.[0]) {
        const route = transitData.routes[0];
        let totalSeconds = 0;
        if (route.duration) {
          totalSeconds = parseDurationSeconds(route.duration);
        }
        if (totalSeconds === 0 && Array.isArray(route.legs)) {
          for (const leg of route.legs) {
            totalSeconds += parseDurationSeconds(leg.duration);
          }
        }

        let totalTransitSeconds = 0;
        let totalTransitMins = 0;

        if (Array.isArray(route.legs)) {
          for (const leg of route.legs) {
            if (Array.isArray(leg.steps)) {
              for (const step of leg.steps) {
                if (step.travelMode === 'TRANSIT' || step.travelMode === 'FERRY') {
                  const rawDuration = step.staticDuration;
                  const stepSeconds = parseDurationSeconds(rawDuration);
                  const stepMins = rawDuration
                    ? Math.round(parseInt(rawDuration.replace('s', ''), 10) / 60)
                    : 0;

                  totalTransitSeconds += stepSeconds;
                  totalTransitMins += stepMins;

                  const lineName =
                    step.transitDetails?.transitLine?.nameShort ||
                    step.transitDetails?.transitLine?.shortName ||
                    step.transitDetails?.transitLine?.name ||
                    step.transitDetails?.headsign ||
                    'Transit';

                  const vehicleType = step.transitDetails?.transitLine?.vehicle?.type;
                  const depStop = step.transitDetails?.stopDetails?.departureStop?.name;
                  const arrStop = step.transitDetails?.stopDetails?.arrivalStop?.name;

                  const isFerryStep =
                    step.travelMode === 'FERRY' ||
                    vehicleType === 'FERRY' ||
                    lineName.toLowerCase().includes('ferry') ||
                    lineName.toUpperCase() === 'DEV' ||
                    (depStop && depStop.toLowerCase().includes('ferry')) ||
                    (arrStop && arrStop.toLowerCase().includes('ferry'));

                  if (lineName && !transitLines.includes(lineName)) {
                    transitLines.push(lineName);
                  }

                  transitSteps.push({
                    line: lineName,
                    durationMins: stepMins,
                    durationSeconds: stepSeconds,
                    departureStop: depStop,
                    arrivalStop: arrStop,
                    travelMode: isFerryStep ? 'FERRY' : (step.travelMode || 'TRANSIT'),
                    vehicleType: vehicleType || (isFerryStep ? 'FERRY' : undefined),
                  });
                }
              }
            }
          }
        }

        const pureTransitMins = totalTransitMins > 0
          ? totalTransitMins
          : (totalTransitSeconds > 0 ? Math.round(totalTransitSeconds / 60) : null);

        totalDurationMins = totalSeconds > 0
          ? Math.max(5, Math.round(totalSeconds / 60))
          : pureTransitMins;

        transitDurationMins = pureTransitMins ?? totalDurationMins;

        legCount = transitSteps.length > 0
          ? transitSteps.length
          : (Array.isArray(route.legs) ? route.legs.length : 1);
      }

      // BUG-63: If Ferry Waypoint Injection is active, parse Leg 1 and synthesize with Leg 2
      if (shouldInjectFerryWaypoint) {
        if (leg1Data?.routes?.[0]) {
          const l1 = leg1Data.routes[0];
          let dM = l1.distanceMeters;
          if (typeof dM !== 'number' && Array.isArray(l1.legs)) {
            dM = l1.legs.reduce((acc: number, leg: { distanceMeters?: number }) => acc + (leg.distanceMeters || 0), 0);
          }
          if (typeof dM === 'number' && dM > 0) {
            firstMileDistanceKm = Math.round((dM / 1000) * 10) / 10;
          }
          let durSec = parseDurationSeconds(l1.duration);
          if (durSec === 0 && Array.isArray(l1.legs)) {
            for (const leg of l1.legs) {
              durSec += parseDurationSeconds(leg.duration);
            }
          }
          if (durSec > 0) {
            firstMileDurationMins = Math.round(durSec / 60);
          }
        }
        if (firstMileDistanceKm === null) {
          firstMileDistanceKm = Math.round(Math.max(0.5, distToHobsonvilleTerminalKm * 1.34) * 10) / 10;
        }
        if (firstMileDurationMins === null) {
          firstMileDurationMins =
            firstMileMode === 'CYCLE'
              ? Math.max(3, Math.round((firstMileDistanceKm / 15) * 60))
              : firstMileMode === 'WALK'
              ? Math.max(5, Math.round((firstMileDistanceKm / 5) * 60))
              : Math.max(2, Math.round(firstMileDistanceKm * 2.2 + 1));
        }

        // Synthesize Leg 1 + Leg 2
        const leg2Duration = totalDurationMins ?? transitDurationMins ?? 35;
        transitDurationMins = transitDurationMins ?? 35;
        totalDurationMins = (firstMileDurationMins ?? 0) + leg2Duration;

        if (transitSteps.length === 0) {
          transitSteps.push({
            line: 'Hobsonville Ferry',
            durationMins: 35,
            durationSeconds: 2100,
            departureStop: 'Hobsonville Point Ferry Terminal',
            arrivalStop: 'Downtown Ferry Terminal',
            travelMode: 'FERRY',
            vehicleType: 'FERRY',
          });
          transitLines.push('Hobsonville Ferry');
        }
      }

      // If at least one requested route returned valid data, return success
      if (drivingDistanceKm !== null || transitDurationMins !== null) {
        // If driving was requested but failed upstream, use harbour-aware road distance fallback
        if (shouldFetchDrive && drivingDistanceKm === null) {
          const fallbackMetrics = estimateRoadMetrics([originLng, originLat], [destinationLng, destinationLat]);
          drivingDistanceKm = fallbackMetrics.distanceKm;
          drivingDistanceMeters = Math.round(fallbackMetrics.distanceKm * 1000);
          drivingDurationMins = fallbackMetrics.durationMins;
        }

        const result: GoogleRoutesResponse = {
          transitDurationMins,
          totalDurationMins,
          transitSteps,
          transitLines,
          legCount,
          drivingDistanceMeters,
          drivingDistanceKm,
          drivingDurationMins,
          firstMileDistanceKm,
          firstMileDurationMins,
          firstMileMode: waypointInjected ? firstMileMode : null,
          waypointInjected: waypointInjected ? true : undefined,
          waypointTerminal: waypointInjected ? waypointTerminal : undefined,
          source: 'google_routes_api',
          departureTime,
          ...(isDebug ? { debug: debugDetails } : {}),
        };

        return NextResponse.json(result, {
          headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
        });
      }
    } catch (err) {
      console.warn('[US-35] Google Routes API call failed, falling back:', err);
      if (isDebug && debugDetails) {
        debugDetails.caughtException = String(err);
      }
    }
  }

  // Graceful fallback: no API key or API call failed
  // Compute realistic road metrics (incorporating harbour-crossing bridge detour if applicable)
  const fallbackRoadMetrics = estimateRoadMetrics([originLng, originLat], [destinationLng, destinationLat]);

  // Multimodal Ferry Fallback (with Waypoint Injection for inland origins or direct terminal departure)
  if (transitModeParam === 'FERRY') {
    const hasFirstMile = shouldInjectFerryWaypoint;
    const leg1Dist = hasFirstMile
      ? Math.round(Math.max(0.5, distToHobsonvilleTerminalKm * 1.34) * 10) / 10
      : undefined;
    const leg1Dur = hasFirstMile
      ? (firstMileMode === 'CYCLE'
          ? Math.max(3, Math.round((leg1Dist! / 15) * 60))
          : firstMileMode === 'WALK'
          ? Math.max(5, Math.round((leg1Dist! / 5) * 60))
          : Math.max(2, Math.round(leg1Dist! * 2.2 + 1)))
      : undefined;

    const ferryMins = 35;
    // Downtown Ferry Terminal: [174.7680, -36.8430]
    const DOWNTOWN_FERRY_COORDS: [number, number] = [174.7680, -36.8430];
    const distDowntownToDestKm = haversineDistanceKm(DOWNTOWN_FERRY_COORDS, [destinationLng, destinationLat]);
    const needsDowntownConnection = distDowntownToDestKm > 1.2;

    const fallbackTransitSteps: TransitStepDetail[] = [
      {
        line: 'Hobsonville Ferry',
        durationMins: ferryMins,
        durationSeconds: ferryMins * 60,
        departureStop: 'Hobsonville Point Ferry Terminal',
        arrivalStop: 'Downtown Ferry Terminal',
        travelMode: 'FERRY',
        vehicleType: 'FERRY',
      },
    ];
    const fallbackLines: string[] = ['Hobsonville Ferry'];
    let leg2TransitMins = ferryMins;

    if (needsDowntownConnection) {
      const busMins = Math.max(8, Math.round(distDowntownToDestKm * 4 + 4));
      fallbackTransitSteps.push({
        line: 'InnerLink Bus',
        durationMins: busMins,
        durationSeconds: busMins * 60,
        departureStop: 'Queens Wharf / Customs St',
        arrivalStop: 'Parnell Rd',
        travelMode: 'TRANSIT',
        vehicleType: 'BUS',
      });
      fallbackLines.push('InnerLink Bus');
      leg2TransitMins += busMins;
    }

    const totalDur = (leg1Dur ?? 0) + leg2TransitMins + (needsDowntownConnection ? 5 : 0);

    const result: GoogleRoutesResponse = {
      transitDurationMins: leg2TransitMins,
      totalDurationMins: totalDur,
      transitSteps: fallbackTransitSteps,
      transitLines: fallbackLines,
      legCount: fallbackTransitSteps.length + (hasFirstMile ? 1 : 0),
      drivingDistanceMeters: Math.round(fallbackRoadMetrics.distanceKm * 1000),
      drivingDistanceKm: fallbackRoadMetrics.distanceKm,
      drivingDurationMins: fallbackRoadMetrics.durationMins,
      firstMileDistanceKm: leg1Dist,
      firstMileDurationMins: leg1Dur,
      firstMileMode: hasFirstMile ? firstMileMode : undefined,
      waypointInjected: hasFirstMile ? true : undefined,
      waypointTerminal: hasFirstMile ? 'Hobsonville Point Ferry Terminal' : undefined,
      source: 'fallback_none',
      departureTime,
      ...(isDebug ? { debug: debugDetails } : {}),
    };

    return NextResponse.json(result);
  }

  const result: GoogleRoutesResponse = {
    transitDurationMins: null,
    totalDurationMins: null,
    legCount: 0,
    drivingDistanceMeters: Math.round(fallbackRoadMetrics.distanceKm * 1000),
    drivingDistanceKm: fallbackRoadMetrics.distanceKm,
    drivingDurationMins: fallbackRoadMetrics.durationMins,
    source: 'fallback_none',
    departureTime,
    ...(isDebug ? { debug: debugDetails } : {}),
  };

  return NextResponse.json(result);
}

/**
 * Parses a Google Routes API duration string (e.g. "1800s" or "30m") into seconds.
 */
function parseDurationSeconds(duration: string | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/^(\d+)s$/);
  if (match) return parseInt(match[1], 10);
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);
  return 0;
}

