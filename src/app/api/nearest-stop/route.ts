import { findNearestTransitStation } from '@/lib/stations';
import { LocalTransitStop } from '@/types';
import { NextResponse } from 'next/server';

const AT_API_KEY =
  process.env.AT_API_KEY ||
  process.env.AT_API_SUBSCRIPTION_KEY ||
  process.env.OCP_APIM_SUBSCRIPTION_KEY ||
  '';
const AT_API_BASE = 'https://api.at.govt.nz';

/**
 * Calculates straight-line distance in km using Haversine formula
 */
function calculateDistanceKm(
  [lon1, lat1]: [number, number],
  [lon2, lat2]: [number, number]
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ATGtfsStopItem {
  type: string;
  id: string;
  attributes: {
    stop_id: string;
    stop_code?: string;
    stop_name: string;
    stop_lat: number;
    stop_lon: number;
    location_type?: number;
    vehicle_type?: number;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lngParam = searchParams.get('lng');
  const latParam = searchParams.get('lat');

  if (!lngParam || !latParam) {
    return NextResponse.json(
      { error: 'Missing lng or lat query parameter' },
      { status: 400 }
    );
  }

  const lng = parseFloat(lngParam);
  const lat = parseFloat(latParam);

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json(
      { error: 'Invalid lng or lat coordinate values' },
      { status: 400 }
    );
  }

  let nearestStop: LocalTransitStop | null = null;

  // 1. Query live AT GTFS API if API key is configured
  if (AT_API_KEY) {
    try {
      const response = await fetch(`${AT_API_BASE}/gtfs/v3/stops`, {
        headers: {
          'Ocp-Apim-Subscription-Key': AT_API_KEY,
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86400 }, // Cache feed for 24h
      });

      if (response.ok) {
        const json = await response.json();
        const stops: ATGtfsStopItem[] = Array.isArray(json?.data) ? json.data : [];

        let minDistanceKm = Infinity;
        for (const item of stops) {
          const stopLat = item.attributes?.stop_lat;
          const stopLon = item.attributes?.stop_lon;

          if (typeof stopLat === 'number' && typeof stopLon === 'number') {
            const dist = calculateDistanceKm([lng, lat], [stopLon, stopLat]);
            if (dist < minDistanceKm) {
              minDistanceKm = dist;
              nearestStop = {
                id: item.id || item.attributes.stop_id,
                code: item.attributes.stop_code || item.attributes.stop_id,
                name: item.attributes.stop_name,
                coordinates: [stopLon, stopLat],
                distanceKm: Math.round(dist * 100) / 100,
                locationType: item.attributes.location_type,
                vehicleType: item.attributes.vehicle_type,
                source: 'at_gtfs_api',
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('AT GTFS API lookup failed, using local station fallback:', e);
    }
  }

  // 2. Fallback to local station directory if AT GTFS API was unavailable or returned no stops
  if (!nearestStop) {
    const fallbackStation = findNearestTransitStation([lng, lat]);
    nearestStop = {
      id: fallbackStation.id,
      code: fallbackStation.id,
      name: fallbackStation.name,
      coordinates: fallbackStation.coordinates,
      distanceKm: fallbackStation.distanceKm,
      locationType: 1,
      source: 'local_fallback',
    };
  }

  return NextResponse.json({
    success: true,
    stop: nearestStop,
    source: nearestStop.source,
    origin: [lng, lat],
  });
}
