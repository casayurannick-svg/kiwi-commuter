// Haversine formula to calculate distance in kilometers between two lat/lng points
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightLine = R * c;
  
  // Apply a road network circuity factor (~1.3x for urban Auckland grid/winding roads)
  return straightLine * 1.3;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface TransportCostResult {
  distanceKm: number;
  carCost: number;
  publicTransitCost: number;
  ebikeCost: number;
  carTimeMinutes: number;
  transitTimeMinutes: number;
  ebikeTimeMinutes: number;
}

export function calculateTransportCosts(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): TransportCostResult {
  const distanceKm = calculateDistanceKm(lat1, lon1, lat2, lon2);

  // Assumptions for Auckland:
  // 1. Car: ~$0.85/km total operating cost (AA average including fuel, wear & tear, insurance)
  const carCost = distanceKm * 0.85;
  
  // 2. Public Transit (AT HOP): Base fare + zone scaling (rough average ~NZD $4.50 - $8.00 per trip)
  const publicTransitCost = Math.min(10.50, Math.max(3.80, 2.50 + (distanceKm * 0.35)));

  // 3. E-Bike: Electricity & battery degradation (~$0.05 per km)
  const ebikeCost = distanceKm * 0.05;

  // Time estimates (Auckland average speeds)
  // Car: ~30 km/h urban average speed accounting for traffic
  const carTimeMinutes = Math.round((distanceKm / 30) * 60);
  // Public Transit: Slower due to stops and transfers (~20 km/h effective)
  const transitTimeMinutes = Math.round((distanceKm / 20) * 60) + 10;
  // E-Bike: ~22 km/h average commuter speed
  const ebikeTimeMinutes = Math.round((distanceKm / 22) * 60);

  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    carCost: parseFloat(carCost.toFixed(2)),
    publicTransitCost: parseFloat(publicTransitCost.toFixed(2)),
    ebikeCost: parseFloat(ebikeCost.toFixed(2)),
    carTimeMinutes,
    transitTimeMinutes,
    ebikeTimeMinutes,
  };
}
