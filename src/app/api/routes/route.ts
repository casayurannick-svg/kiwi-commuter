import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface TransitStepDetail {
  line: string;
  durationMins: number;
  departureStop?: string;
  arrivalStop?: string;
}

export interface GoogleRoutesTransitResponse {
  transitDurationMins: number | null; // Pure in-vehicle transit duration (sum of all transit steps, e.g. 36 mins)
  totalDurationMins: number | null; // Total door-to-door journey time (e.g. 56 mins)
  transitSteps?: TransitStepDetail[]; // Breakdown of each transit step (e.g. 25B 31m, OuterLink 5m)
  transitLines?: string[]; // Names of transit lines (e.g. ['25B', 'OuterLink'])
  legCount: number;
  source: 'google_routes_api' | 'fallback_none';
  departureTime?: string;
  debug?: Record<string, unknown>;
}

/**
 * US-21: Google Routes API – Transit Duration Endpoint
 *
 * Accepts [originLng, originLat] and [destinationLng, destinationLat] as query params.
 * Calls the Google Routes API (v2) with travelMode TRANSIT and sums the duration
 * across all transit steps and legs, accounting for real-world timetables and pedestrian transfers.
 * Falls back gracefully if coordinates are missing or the API key is not configured.
 *
 * Query params:
 *   - originLng, originLat   – WGS84 origin coordinates
 *   - destinationLng, destinationLat – WGS84 destination coordinates
 *   - departureTime – optional ISO-8601 departure time (default: next Monday 08:00 NZST)
 *   - debug – optional boolean ('1' or 'true') for diagnostic details
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const originLng = parseFloat(searchParams.get('originLng') || '');
  const originLat = parseFloat(searchParams.get('originLat') || '');
  const destinationLng = parseFloat(searchParams.get('destinationLng') || '');
  const destinationLat = parseFloat(searchParams.get('destinationLat') || '');
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
    };
  }

  // Attempt Google Routes API if key is configured
  if (apiKey) {
    try {
      const requestBody = {
        origin: {
          location: {
            latLng: { latitude: originLat, longitude: originLng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destinationLat, longitude: destinationLng },
          },
        },
        travelMode: 'TRANSIT',
        departureTime,
        computeAlternativeRoutes: false,
        transitPreferences: {
          routingPreference: 'FEWER_TRANSFERS',
        },
      };

      const response = await fetch(GOOGLE_ROUTES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.legs.duration,routes.legs.steps.duration,routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
        },
        body: JSON.stringify(requestBody),
      });

      if (isDebug && debugDetails) {
        debugDetails.googleStatus = response.status;
      }

      if (response.ok) {
        const data = await response.json();

        if (isDebug && debugDetails) {
          debugDetails.routesCount = Array.isArray(data.routes) ? data.routes.length : 0;
          debugDetails.firstRouteDuration = data.routes?.[0]?.duration;
        }

        const route = data.routes?.[0];
        if (route) {
          // 1. Total route-level duration (includes waiting time, pedestrian transfers)
          let totalSeconds = 0;
          if (route.duration) {
            totalSeconds = parseDurationSeconds(route.duration);
          }
          if (totalSeconds === 0 && Array.isArray(route.legs)) {
            for (const leg of route.legs) {
              totalSeconds += parseDurationSeconds(leg.duration);
            }
          }

          // 2. Extract and sum ALL transit steps (in-vehicle ride time)
          let totalTransitSeconds = 0;
          let totalTransitMins = 0;
          const transitSteps: TransitStepDetail[] = [];
          const transitLines: string[] = [];

          if (Array.isArray(route.legs)) {
            for (const leg of route.legs) {
              if (Array.isArray(leg.steps)) {
                for (const step of leg.steps) {
                  if (step.travelMode === 'TRANSIT') {
                    // Raw duration string from Google (e.g. "1860s")
                    const rawDuration = step.duration || step.staticDuration;
                    const stepSeconds = parseDurationSeconds(rawDuration);
                    // Convert to minutes via Math.round(parseInt(d.replace('s', '')) / 60)
                    const stepMins = rawDuration
                      ? Math.round(parseInt(rawDuration.replace('s', ''), 10) / 60)
                      : 0;

                    // CRITICAL: Ensure ALL transit steps are summed together (duration += stepDuration),
                    // rather than overwriting a variable in a loop where the last step (e.g. 5 mins on OuterLink)
                    // replaces earlier legs (e.g. 31 mins on 25B).
                    totalTransitSeconds += stepSeconds;
                    totalTransitMins += stepMins;

                    const lineName =
                      step.transitDetails?.transitLine?.shortName ||
                      step.transitDetails?.transitLine?.name ||
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

          // Pure in-vehicle transit duration: sum of all transit steps
          const pureTransitMins = totalTransitMins > 0
            ? totalTransitMins
            : (totalTransitSeconds > 0 ? Math.round(totalTransitSeconds / 60) : null);

          // Total door-to-door duration
          const totalDurationMins = totalSeconds > 0
            ? Math.max(5, Math.round(totalSeconds / 60))
            : pureTransitMins;

          // For transitDurationMins, return pure transit duration if transit steps exist,
          // otherwise fall back to total duration
          const transitDurationMins = pureTransitMins ?? totalDurationMins;

          const legCount = transitSteps.length > 0
            ? transitSteps.length
            : (Array.isArray(route.legs) ? route.legs.length : 1);

          const result: GoogleRoutesTransitResponse = {
            transitDurationMins,
            totalDurationMins,
            transitSteps,
            transitLines,
            legCount,
            source: 'google_routes_api',
            departureTime,
            ...(isDebug ? { debug: debugDetails } : {}),
          };

          return NextResponse.json(result, {
            headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
          });
        }
      } else {
        const errText = await response.text().catch(() => 'unknown');
        console.warn(`[US-21] Google Routes API returned ${response.status}: ${errText}`);
        if (isDebug && debugDetails) {
          debugDetails.googleError = errText;
        }
      }
    } catch (err) {
      console.warn('[US-21] Google Routes API call failed, falling back:', err);
      if (isDebug && debugDetails) {
        debugDetails.caughtException = String(err);
      }
    }
  }

  // Graceful fallback: no API key or API call failed
  const result: GoogleRoutesTransitResponse = {
    transitDurationMins: null,
    totalDurationMins: null,
    legCount: 0,
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
  // Format is like "1800s"
  const match = duration.match(/^(\d+)s$/);
  if (match) return parseInt(match[1], 10);
  // Fallback: only accept pure numeric strings (e.g. "2400") — reject mixed like "30m"
  if (/^\d+$/.test(duration)) return parseInt(duration, 10);
  return 0;
}

/**
 * Returns an ISO-8601 timestamp for the next weekday Monday at 08:00 Auckland time (UTC+12).
 * Used as a stable default departure time for transit routing.
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
