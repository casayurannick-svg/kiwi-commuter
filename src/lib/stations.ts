import nearestPoint from '@turf/nearest-point';
import { point } from '@turf/helpers';
import stationsData from '../data/at-stations.json';
import { TransitStation } from '@/types';

export interface StationProperties {
  id: string;
  name: string;
  mode: string;
  zone: number;
  region: string;
  hasParkAndRide: boolean;
  distanceToPoint?: number;
}

export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonFeature<G, P> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export interface GeoJsonFeatureCollection<G, P> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<G, P>[];
}

export const AT_STATIONS_GEOJSON = stationsData as unknown as GeoJsonFeatureCollection<
  GeoJsonPoint,
  StationProperties
>;

/**
 * Finds the nearest Auckland Transport station to given [lng, lat] coordinates
 */
export function findNearestTransitStation(coords: [number, number]): TransitStation {
  if (!Array.isArray(coords) || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
    // Default fallback to Waitematā (Britomart)
    return {
      id: 'waitemata-britomart',
      name: 'Waitematā (Britomart)',
      mode: 'Train',
      zone: 1,
      region: 'Auckland Central',
      hasParkAndRide: false,
      coordinates: [174.7675, -36.8442],
      distanceKm: 0.0,
    };
  }

  const target = point(coords);
  const nearest = nearestPoint(
    target,
    AT_STATIONS_GEOJSON as unknown as Parameters<typeof nearestPoint>[1]
  );

  const props = nearest.properties;
  const stationCoords = nearest.geometry.coordinates as [number, number];
  const distanceKm = Math.round((props.distanceToPoint ?? 0) * 10) / 10;

  return {
    id: props.id,
    name: props.name,
    mode: props.mode,
    zone: props.zone,
    region: props.region,
    hasParkAndRide: props.hasParkAndRide,
    coordinates: stationCoords,
    distanceKm,
  };
}

/**
 * Returns all Auckland Transport stations as an array
 */
export function getAllStations(): TransitStation[] {
  return AT_STATIONS_GEOJSON.features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    mode: f.properties.mode,
    zone: f.properties.zone,
    region: f.properties.region,
    hasParkAndRide: f.properties.hasParkAndRide,
    coordinates: f.geometry.coordinates as [number, number],
    distanceKm: 0,
  }));
}
