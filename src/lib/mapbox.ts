import { RouteGeometry, Suburb } from '@/types';
import { estimateRouteMetrics, SUBURB_CENTROIDS } from '@/config/suburbs';

export function normalizeMapboxToken(token: string): string {
  const clean = (token || '').trim().replace(/^["']|["']$/g, '');
  if (clean.startsWith('ppk.')) return clean.slice(1);
  return clean;
}

const MAPBOX_TOKEN = normalizeMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '');

export interface GeocodingResult {
  id: string;
  placeName: string;
  text: string;
  coordinates: [number, number]; // [lng, lat]
  suburbName?: string;
}

export interface AddressSearchOptions {
  transitMode?: string;
  proximity?: [number, number];
}

export const HOBSONVILLE_FERRY_TERMINAL: GeocodingResult = {
  id: 'hobsonville-point-ferry',
  placeName: 'Hobsonville Point Ferry Terminal, Hobsonville, Auckland',
  text: 'Hobsonville Point Ferry Terminal',
  coordinates: [174.6680, -36.7980],
  suburbName: 'Hobsonville Point',
};

export const HOBSONVILLE_TOWN_CENTRE: GeocodingResult = {
  id: 'hobsonville-town-centre',
  placeName: 'Hobsonville Town Centre, Hobsonville, Auckland',
  text: 'Hobsonville Town Centre',
  coordinates: [174.6590, -36.7920],
  suburbName: 'Hobsonville Point',
};

/**
 * Searches Auckland addresses using Mapbox Geocoding API with Auckland bounding box
 * Throws on API rate-limits/errors so the UI soft-failure banner activates.
 */
export async function searchAucklandAddresses(
  query: string,
  proximityOrOptions?: [number, number] | AddressSearchOptions | string,
  options?: AddressSearchOptions
): Promise<GeocodingResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  let proximity: [number, number] = [174.7645, -36.8485];
  let transitMode: string | undefined;

  if (Array.isArray(proximityOrOptions)) {
    proximity = proximityOrOptions;
    if (options && typeof options === 'object') {
      transitMode = options.transitMode;
    }
  } else if (typeof proximityOrOptions === 'object' && proximityOrOptions !== null) {
    if (proximityOrOptions.proximity) proximity = proximityOrOptions.proximity;
    transitMode = proximityOrOptions.transitMode;
  } else if (typeof proximityOrOptions === 'string') {
    transitMode = proximityOrOptions;
  }

  const isFerryMode = transitMode?.toUpperCase() === 'FERRY';
  const isHobsonvilleQuery = cleanQuery.toLowerCase().includes('hobsonville');

  // Try Mapbox Geocoding API if token is configured
  const activeToken = normalizeMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '') || MAPBOX_TOKEN;
  if (activeToken && activeToken.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json?country=nz&bbox=174.3,-37.4,175.3,-36.4&proximity=${proximity[0]},${proximity[1]}&types=address,poi,neighborhood,locality,place&limit=6&access_token=${activeToken}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error(`Mapbox Geocoding API Error: HTTP ${res.status}`);
      }

      const data = await res.json();
      interface MapboxFeatureContext {
        id: string;
        text: string;
      }

      interface MapboxFeatureItem {
        id: string;
        place_name: string;
        text: string;
        center: [number, number];
        context?: MapboxFeatureContext[];
      }

      if (Array.isArray(data.features) && data.features.length > 0) {
        const apiResults = (data.features as MapboxFeatureItem[]).map((f) => ({
          id: f.id,
          placeName: f.place_name,
          text: f.text,
          coordinates: f.center,
          suburbName:
            f.context?.find(
              (c) => c.id.startsWith('locality') || c.id.startsWith('neighborhood')
            )?.text || f.text,
        }));

        if (isHobsonvilleQuery) {
          if (isFerryMode) {
            const withoutTerminal = apiResults.filter(
              (r) => r.id !== HOBSONVILLE_FERRY_TERMINAL.id && !r.text.toLowerCase().includes('ferry')
            );
            return [HOBSONVILLE_FERRY_TERMINAL, ...withoutTerminal].slice(0, 6);
          } else {
            const withoutTerminal = apiResults.filter(
              (r) => r.id !== HOBSONVILLE_FERRY_TERMINAL.id && !r.text.toLowerCase().includes('ferry')
            );
            return [HOBSONVILLE_TOWN_CENTRE, ...withoutTerminal].slice(0, 6);
          }
        }

        return apiResults;
      }
    } catch (e) {
      console.error('Mapbox Geocoding API call failed:', e);
      throw e; // Rethrow to notify frontend error boundary
    }
  }

  // Fallback: match against Auckland suburb centroids & snap points when no token configured
  if (isHobsonvilleQuery) {
    if (isFerryMode) {
      return [HOBSONVILLE_FERRY_TERMINAL, HOBSONVILLE_TOWN_CENTRE];
    } else {
      return [HOBSONVILLE_TOWN_CENTRE, HOBSONVILLE_FERRY_TERMINAL];
    }
  }

  const lower = cleanQuery.toLowerCase();
  const matched = SUBURB_CENTROIDS.filter((s) => s.name.toLowerCase().includes(lower));
  return matched.slice(0, 6).map((s) => ({
    id: `suburb-${s.id}`,
    placeName: `${s.name}, Auckland`,
    text: s.name,
    coordinates: s.coordinates,
    suburbName: s.name,
  }));
}

export interface RouteGeometryResponse {
  coordinates: [number, number][]; // LineString coords [lng, lat]
  distanceKm: number;
  durationMinutes: number;
}

export function calculateHaversineDistanceKm(
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

function generateSyntheticAucklandRoute(
  [startLng, startLat]: [number, number],
  [endLng, endLat]: [number, number]
): [number, number][] {
  const waypoints: [number, number][] = [];
  const steps = 20;
  const dx = endLng - startLng;
  const dy = endLat - startLat;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curveDeflection = Math.sin(t * Math.PI) * 0.015;
    const lng = startLng + dx * t + curveDeflection * (dy > 0 ? 1 : -1);
    const lat = startLat + dy * t + curveDeflection * (dx > 0 ? -1 : 1);
    waypoints.push([Number(lng.toFixed(5)), Number(lat.toFixed(5))]);
  }

  return waypoints;
}

/**
 * Fetches route geometry and metrics from Mapbox Directions API.
 * Throws on rate limits/failures so the UI error boundary triggers properly.
 */
export async function fetchDirectionsRoute(
  origin: [number, number],
  destination: [number, number],
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<RouteGeometryResponse | null> {
  if (
    !Array.isArray(origin) ||
    !Array.isArray(destination) ||
    origin.length !== 2 ||
    destination.length !== 2
  ) {
    return null;
  }

  const [startLng, startLat] = origin;
  const [endLng, endLat] = destination;

  if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) {
    return null;
  }

  if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      
      if (!res.ok) {
        throw new Error(`Mapbox Directions API Error: HTTP ${res.status}`);
      }

      const data = await res.json();
      const route = data.routes?.[0];
      if (route && Array.isArray(route.geometry?.coordinates) && route.geometry.coordinates.length > 0) {
        return {
          coordinates: route.geometry.coordinates,
          distanceKm: Math.round((route.distance / 1000) * 10) / 10,
          durationMinutes: Math.round(route.duration / 60),
        };
      }
      throw new Error('No valid routes returned from Mapbox Directions');
    } catch (e) {
      console.error(`Mapbox Directions API (${profile}) failed:`, e);
      throw e; // Rethrow so caller catches and triggers UI error boundary
    }
  }

  // Fallback only if no Mapbox token is configured
  const straightLine = calculateHaversineDistanceKm(origin, destination);
  const factor = profile === 'walking' ? 1.2 : 1.28;
  const distanceKm = Math.round(Math.max(0.1, straightLine * factor) * 10) / 10;

  let durationMinutes: number;
  if (profile === 'walking') {
    durationMinutes = Math.max(1, Math.round((distanceKm / 5) * 60));
  } else if (profile === 'cycling') {
    durationMinutes = Math.max(1, Math.round((distanceKm / 15) * 60));
  } else {
    durationMinutes = Math.max(3, Math.round((distanceKm / 35) * 60));
  }

  const coordinates = generateSyntheticAucklandRoute(origin, destination);

  return {
    coordinates,
    distanceKm,
    durationMinutes,
  };
}

export async function fetchDrivingRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<RouteGeometryResponse | null> {
  return fetchDirectionsRoute(origin, destination, 'driving');
}

export async function getDirectionsRoute(
  origin: Suburb,
  destination: Suburb
): Promise<RouteGeometry> {
  const fallbackMetrics = estimateRouteMetrics(origin, destination);
  const route = await fetchDrivingRoute(origin.coordinates, destination.coordinates);

  if (route) {
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.coordinates,
      },
      properties: {
        distanceKm: route.distanceKm,
        durationMins: route.durationMinutes,
      },
    };
  }

  const waypoints = generateSyntheticAucklandRoute(origin.coordinates, destination.coordinates);
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: waypoints,
    },
    properties: {
      distanceKm: fallbackMetrics.distanceKm,
      durationMins: fallbackMetrics.drivingTimePeakMins,
    },
  };
}