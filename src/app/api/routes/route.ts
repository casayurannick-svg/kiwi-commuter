import { NextResponse } from 'next/server';

const GOOGLE_ROUTES_API_KEY = process.env.GOOGLE_ROUTES_API_KEY || '';
const GOOGLE_ROUTES_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface GoogleRoutesTransitResponse {
  transitDurationMins: number | null;
  legCount: number;
  source: 'google_routes_api' | 'fallback_none';
  departureTime?: string;
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
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const originLng = parseFloat(searchParams.get('originLng') || '');
  const originLat = parseFloat(searchParams.get('originLat') || '');
  const destinationLng = parseFloat(searchParams.get('destinationLng') || '');
  const destinationLat = parseFloat(searchParams.get('destinationLat') || '');

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

  // Attempt Google Routes API if key is configured
  if (GOOGLE_ROUTES_API_KEY) {
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
          allowedTravelModes: ['BUS', 'RAIL', 'FERRY'],
          routingPreference: 'FEWER_TRANSFERS',
        },
      };

      const response = await fetch(GOOGLE_ROUTES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_ROUTES_API_KEY,
          // Request only the duration fields to minimise billing
          'X-Goog-FieldMask': 'routes.duration,routes.legs.duration,routes.legs.steps.staticDuration,routes.legs.steps.travelMode',
        },
        body: JSON.stringify(requestBody),
        next: { revalidate: 3600 }, // Cache for 1 hour – transit schedules are stable
      });

      if (response.ok) {
        const data = await response.json();

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
          };

          return NextResponse.json(result, {
            headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
          });
        }
      } else {
        const errText = await response.text().catch(() => 'unknown');
        console.warn(`[US-21] Google Routes API returned ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.warn('[US-21] Google Routes API call failed, falling back:', err);
    }
  }

  // Graceful fallback: no API key or API call failed
  const result: GoogleRoutesTransitResponse = {
    transitDurationMins: null,
    legCount: 0,
    source: 'fallback_none',
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
  // Advance to next Monday
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(8, 0, 0, 0); // 08:00 local
  // Auckland is UTC+12 (UTC+13 NZDT) — express as UTC offset
  // We use 08:00 NZST (UTC+12) → 20:00 UTC previous day
  const utcHour = monday.getUTCHours();
  const offset = -12; // Auckland is UTC+12, so subtract to get UTC
  monday.setUTCHours(utcHour + offset);
  return monday.toISOString();
}
