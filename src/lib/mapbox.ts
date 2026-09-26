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

/**
 * Searches Auckland addresses using Mapbox Geocoding API with Auckland bounding box
 * Falls back to SUBURB_CENTROIDS when offline or without token
 */
export async function searchAucklandAddresses(
  query: string,
  proximity: [number, number] = [174.7645, -36.8485]
): Promise<GeocodingResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) return [];

  // Try Mapbox Geocoding API if token is configured
  if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cleanQuery)}.json?country=nz&bbox=174.3,-37.4,175.3,-36.4&proximity=${proximity[0]},${proximity[1]}&types=address,poi,neighborhood,locality,place&limit=6&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (res.ok) {
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
          return (data.features as MapboxFeatureItem[]).map((f) => ({
            id: f.id,
            placeName: f.place_name,
            text: f.text,
            coordinates: f.center,
            suburbName:
              f.context?.find(
                (c) => c.id.startsWith('locality') || c.id.startsWith('neighborhood')
              )?.text || f.text,
          }));
        }
      }
    } catch (e) {
      console.warn('Mapbox Geocoding API failed, using fallback:', e);
    }
  }

  // Fallback: match against Auckland suburb centroids
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

/**
 * Calculates straight line distance in km using Haversine formula
 */
function calculateHaversineDistanceKm(
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

/**
 * Generates synthetic road-deflected waypoints representing Auckland arterial and motorway corridors
 */
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
    // Add realistic road curve deflection (simulating Auckland motorway corridors)
    const curveDeflection = Math.sin(t * Math.PI) * 0.015;
    const lng = startLng + dx * t + curveDeflection * (dy > 0 ? 1 : -1);
    const lat = startLat + dy * t + curveDeflection * (dx > 0 ? -1 : 1);
    waypoints.push([Number(lng.toFixed(5)), Number(lat.toFixed(5))]);
  }

  return waypoints;
}

/**
 * Fetches driving route geometry from Mapbox Directions API, with seamless Auckland corridor synthetic fallback
 */
export async function fetchDrivingRoute(
  origin: [number, number],
  destination: [number, number]
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

  // Attempt Mapbox Directions API if public token is configured
  if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0];
        if (route && Array.isArray(route.geometry?.coordinates) && route.geometry.coordinates.length > 0) {
          return {
            coordinates: route.geometry.coordinates,
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMinutes: Math.round(route.duration / 60),
          };
        }
      }
    } catch (e) {
      console.warn('Mapbox Directions API failed, using synthetic fallback:', e);
    }
  }

  // Realistic Auckland road network fallback calculation
  const straightLine = calculateHaversineDistanceKm(origin, destination);
  // Auckland urban routing factor ~1.28x straight line distance
  const distanceKm = Math.round(Math.max(2.0, straightLine * 1.28) * 10) / 10;
  // Average peak urban driving speed ~35 km/h
  const durationMinutes = Math.max(5, Math.round((distanceKm / 35) * 60));
  const coordinates = generateSyntheticAucklandRoute(origin, destination);

  return {
    coordinates,
    distanceKm,
    durationMinutes,
  };
}

/**
 * Backward compatibility wrapper returning GeoJSON Feature for suburbs
 */
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
