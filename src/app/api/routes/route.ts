import { NextResponse } from 'next/server';
import { estimateRoadMetrics } from '@/lib/routes';

export const dynamic = 'force-dynamic';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface TransitStepDetail {
  line: string;
  durationMins: number;
  departureStop?: string;
  arrivalStop?: string;
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

  source: 'google_routes_api' | 'fallback_none';
  departureTime?: string;
  debug?: Record<string, unknown>;
}

export type GoogleRoutesTransitResponse = GoogleRoutesResponse;

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
  const isDebug = searchParams.get('debug') === '1' || searchParams.get('debug') === 'true';

  // Validate coordinates
  if ([originLng, originLat, destinationLng, destinationLat].some(isNaN)) {
    return NextResponse.json(
      { error: 'Missing or invalid coordinates. Provide originLng, originLat, destinationLng, destinationLat.' },
      { status: 400 }
    );
  }

  // Use provided departure time or compute next weekday morning (Auckland time)
  let departureTime = searchParams.get('departureTime');
  if (!departureTime) {
    departureTime = getNextWeekdayMorningISO();
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
    };
  }

  const shouldFetchDrive = travelModeParam === 'DRIVE' || travelModeParam === 'BOTH';
  const shouldFetchTransit = travelModeParam === 'TRANSIT' || travelModeParam === 'BOTH';

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

      // 1. Fetch Driving Route if requested
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

      // 2. Fetch Transit Route if requested
      const transitPromise = shouldFetchTransit
        ? fetch(GOOGLE_ROUTES_ENDPOINT, {
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
              transitPreferences: {
                routingPreference: 'FEWER_TRANSFERS',
              },
            }),
          }).then(async (res) => (res.ok ? res.json() : null)).catch(() => null)
        : Promise.resolve(null);

      const [driveData, transitData] = await Promise.all([drivePromise, transitPromise]);

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
                if (step.travelMode === 'TRANSIT') {
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

                  if (lineName && !transitLines.includes(lineName)) {
                    transitLines.push(lineName);
                  }

                  transitSteps.push({
                    line: lineName,
                    durationMins: stepMins,
                    departureStop: step.transitDetails?.stopDetails?.departureStop?.name,
                    arrivalStop: step.transitDetails?.stopDetails?.arrivalStop?.name,
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

  const result: GoogleRoutesResponse = {
    transitDurationMins: null,
    totalDurationMins: null,
    legCount: 0,
    drivingDistanceMeters: Math.round(fallbackRoadMetrics.distanceKm * 1000),
    drivingDistanceKm: fallbackRoadMetrics.distanceKm,
    drivingDurationMins: fallbackRoadMetrics.durationMins,
    source: 'fallback_none',
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

/**
 * Returns an ISO-8601 timestamp for the next weekday Monday at 08:00 Auckland time (UTC+12).
 */
function getNextWeekdayMorningISO(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilNextMonday = ((1 - day + 7) % 7) || 7;
  const target = new Date(now.getTime() + daysUntilNextMonday * 24 * 60 * 60 * 1000);
  const sundayBefore = new Date(target.getTime() - 24 * 60 * 60 * 1000);
  sundayBefore.setUTCHours(20, 0, 0, 0); // 20:00 UTC Sunday = 08:00 Monday NZST
  if (sundayBefore.getTime() <= now.getTime()) {
    sundayBefore.setTime(sundayBefore.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return sundayBefore.toISOString();
}

