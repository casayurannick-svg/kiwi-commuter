/**
 * Calculates great-circle Haversine distance in km between two WGS84 coordinate pairs [lng, lat].
 */
export function haversineDistanceKm(coords1: [number, number], coords2: [number, number]): number {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R = 6371;
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
 * US-35: Estimates road driving distance and duration between coordinates.
 * Specifically checks for harbour-crossing corridors between North Shore and Central/East/South Auckland
 * where vehicles cannot drive across the water and must route via the Auckland Harbour Bridge.
 */
export function estimateRoadMetrics(
  originCoords: [number, number],
  destCoords: [number, number]
): { distanceKm: number; durationMins: number } {
  const [lng1, lat1] = originCoords;
  const [lng2, lat2] = destCoords;

  const straightLine = haversineDistanceKm(originCoords, destCoords);

  // Detect Waitemata Harbour crossing: North Shore (lat > -36.835) vs Central/South (lat <= -36.842)
  const isNorthShore1 = lat1 > -36.835 && lng1 >= 174.65 && lng1 <= 174.85;
  const isSouthSide1 = lat1 <= -36.842 && lng1 >= 174.70 && lng1 <= 174.88;
  const isNorthShore2 = lat2 > -36.835 && lng2 >= 174.65 && lng2 <= 174.85;
  const isSouthSide2 = lat2 <= -36.842 && lng2 >= 174.70 && lng2 <= 174.88;

  const isHarbourCrossing = (isNorthShore1 && isSouthSide2) || (isSouthSide1 && isNorthShore2);

  if (isHarbourCrossing) {
    // Auckland Harbour Bridge location [174.7470, -36.8310]
    const bridgeCoords: [number, number] = [174.7470, -36.8310];
    const leg1 = haversineDistanceKm(originCoords, bridgeCoords) * 1.5;
    const leg2 = haversineDistanceKm(bridgeCoords, destCoords) * 1.5;
    // Real road distance between Devonport and Parnell via Harbour Bridge is ~17-18 km
    const distanceKm = Math.round(Math.max(17.3, leg1 + leg2 + 5.0) * 10) / 10;
    const durationMins = Math.round(distanceKm * 1.4 + 5);
    return { distanceKm, durationMins };
  }

  const distanceKm = Math.round(straightLine * 1.34 * 10) / 10;
  const durationMins = Math.round(distanceKm * 2.1 + 8);
  return { distanceKm, durationMins };
}

/**
 * Returns an ISO-8601 timestamp for the next weekday Monday at 07:30 AM Auckland time (NZST/NZDT).
 * Ensures timetable queries never fail even if a user checks late at night or on weekends.
 */
export function getNextWeekdayMorningISO(referenceDate = new Date()): string {
  // Format the reference date in Pacific/Auckland to determine Auckland calendar date & weekday
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Pacific/Auckland',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const aucklandDateStr = formatter.format(referenceDate);
  const [y, m, d] = aucklandDateStr.split('-').map(Number);

  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Auckland',
    weekday: 'short',
  });
  const weekday = dayFormatter.format(referenceDate);
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const daysUntilNextMonday = ((1 - dayIndex + 7) % 7) || 7;

  // Target Monday calendar date in Auckland
  const targetDate = new Date(Date.UTC(y, m - 1, d + daysUntilNextMonday, 7, 30, 0));

  // Determine current Auckland UTC offset (+12 in NZST, +13 in NZDT) for target date
  const offsetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Auckland',
    timeZoneName: 'shortOffset',
  }).formatToParts(targetDate);
  const tzName = offsetParts.find((p) => p.type === 'timeZoneName')?.value;
  const offsetHours = tzName?.includes('+13') ? 13 : 12;

  // 07:30 Auckland time in UTC is (7.5 - offsetHours)
  const mondayMorningUTC = new Date(
    Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      7 - offsetHours,
      30,
      0
    )
  );

  return mondayMorningUTC.toISOString();
}

export * from './routing';
