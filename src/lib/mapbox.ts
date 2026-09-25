import { RouteGeometry, Suburb } from '@/types';
import { estimateRouteMetrics } from '@/config/suburbs';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

export async function getDirectionsRoute(
  origin: Suburb,
  destination: Suburb
): Promise<RouteGeometry> {
  const [startLng, startLat] = origin.coordinates;
  const [endLng, endLat] = destination.coordinates;

  const fallbackMetrics = estimateRouteMetrics(origin, destination);

  if (MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith('pk.')) {
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        const route = data.routes?.[0];
        if (route && route.geometry?.coordinates) {
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: route.geometry.coordinates,
            },
            properties: {
              distanceKm: Math.round((route.distance / 1000) * 10) / 10,
              durationMins: Math.round(route.duration / 60),
            },
          };
        }
      }
    } catch (e) {
      console.warn('Mapbox Directions API failed, using synthetic fallback:', e);
    }
  }

  // Generate a realistic arc / path interpolation between coordinates
  const waypoints: [number, number][] = [];
  const steps = 18;
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
