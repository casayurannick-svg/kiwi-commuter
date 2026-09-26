import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface GoogleRoutesTransitResponse {
  transitDurationMins: number | null;
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
 * across all legs and steps, accounting for real-world timetables and pedestrian transfers.
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
          'X-Goog-FieldMask': 'routes.duration,routes.legs.duration',
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
          // Sum total route duration across all legs (includes waiting time, transfers)
          let totalSeconds = 0;

          if (route.duration) {
            // Route-level duration is the most accurate total (includes transfers)
            const routeSecs = parseDurationSeconds(route.duration);
            if (routeSecs > 0) {
              totalSeconds = routeSecs;
            }
          }

          // Fallback: sum leg durations if route-level is unavailable
          if (totalSeconds === 0 && Array.isArray(route.legs)) {
            for (const leg of route.legs) {
              const legSecs = parseDurationSeconds(leg.duration);
              totalSeconds += legSecs;
            }
          }

          const transitDurationMins = totalSeconds > 0
            ? Math.max(5, Math.round(totalSeconds / 60))
            : null;

          const legCount = Array.isArray(route.legs) ? route.legs.length : 0;

          const result: GoogleRoutesTransitResponse = {
            transitDurationMins,
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
