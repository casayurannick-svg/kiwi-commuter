/**
 * Auckland Transport Ferry Fare Tier Matrix
 *
 * Tier 1: Inner Harbor ($7.80)
 * Includes Devonport, Bayswater, Birkenhead, Te Onewa Northcote Point
 *
 * Tier 2: Mid Harbor ($10.40)
 * Includes Half Moon Bay, Hobsonville Point, Beach Haven, West Harbour
 *
 * Tier 3: Outer Harbor ($13.80)
 * Includes Gulf Harbour, Pine Harbour
 */

export type FerryFareTier = 'INNER_HARBOR' | 'MID_HARBOR' | 'OUTER_HARBOR';

export interface FerryFareTierDefinition {
  tier: FerryFareTier;
  name: string;
  rate: number;
  capEligible: boolean;
  suburbs: string[];
  coordinates?: [number, number][];
}

export const FERRY_FARE_TIERS: Record<FerryFareTier, FerryFareTierDefinition> = {
  INNER_HARBOR: {
    tier: 'INNER_HARBOR',
    name: 'Inner Harbor',
    rate: 7.80,
    capEligible: true,
    suburbs: [
      'devonport',
      'devonport-ferry',
      'devonport-ferry-terminal',
      'bayswater',
      'bayswater-ferry',
      'birkenhead',
      'birkenhead-ferry',
      'birkenhead-ferry-terminal',
      'te-onewa-northcote-point',
      'northcote-point',
      'northcote-point-ferry',
      'northcote',
    ],
    coordinates: [
      [174.7950, -36.8330], // Devonport
      [174.7700, -36.8250], // Bayswater
      [174.7260, -36.8200], // Birkenhead
      [174.7500, -36.8270], // Northcote Point
    ],
  },
  MID_HARBOR: {
    tier: 'MID_HARBOR',
    name: 'Mid Harbor',
    rate: 10.40,
    capEligible: true,
    suburbs: [
      'hobsonville',
      'hobsonville-point',
      'hobsonville-point-ferry',
      'hobsonville-point-ferry-terminal',
      'hobsonville-ferry',
      'hobh',
      'half-moon-bay',
      'half-moon-bay-ferry',
      'half-moon-bay-ferry-terminal',
      'hmb',
      'beach-haven',
      'beach-haven-ferry',
      'beach-haven-wharf',
      'west-harbour',
      'west-harbour-ferry',
      'west-harbour-marina',
      'wh-ferry',
    ],
    coordinates: [
      [174.6590, -36.7920], // Hobsonville Point Suburb Centroid
      [174.6680, -36.7980], // Hobsonville Point Ferry Terminal
      [174.9030, -36.8770], // Half Moon Bay Suburb Centroid
      [174.9020, -36.8830], // Half Moon Bay Ferry Terminal
      [174.7000, -36.7970], // Beach Haven
      [174.6980, -36.7970], // Beach Haven Wharf
      [174.6300, -36.8150], // West Harbour
    ],
  },
  OUTER_HARBOR: {
    tier: 'OUTER_HARBOR',
    name: 'Outer Harbor',
    rate: 13.80,
    capEligible: false,
    suburbs: [
      'gulf-harbour',
      'gulf-harbour-ferry',
      'pine-harbour',
      'pine-harbour-ferry',
    ],
    coordinates: [
      [174.7870, -36.6130], // Gulf Harbour
      [175.0250, -36.8830], // Pine Harbour
    ],
  },
};

function haversineDistance(c1: [number, number], c2: [number, number]): number {
  const [lon1, lat1] = c1;
  const [lon2, lat2] = c2;
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
 * Resolves the Ferry Fare Tier based on suburb identifier, terminal name, line name, or coordinates.
 */
export function getFerryFareTier(
  identifierOrCoords?: string | [number, number] | null
): FerryFareTierDefinition {
  if (!identifierOrCoords) {
    return FERRY_FARE_TIERS.INNER_HARBOR;
  }

  if (
    Array.isArray(identifierOrCoords) &&
    identifierOrCoords.length === 2 &&
    typeof identifierOrCoords[0] === 'number' &&
    typeof identifierOrCoords[1] === 'number'
  ) {
    const coords = identifierOrCoords as [number, number];
    let closestTierDef: FerryFareTierDefinition | null = null;
    let minDistance = Infinity;

    for (const tierKey of ['OUTER_HARBOR', 'MID_HARBOR', 'INNER_HARBOR'] as FerryFareTier[]) {
      const tierDef = FERRY_FARE_TIERS[tierKey];
      if (tierDef.coordinates) {
        for (const target of tierDef.coordinates) {
          const dist = haversineDistance(coords, target);
          if (dist < minDistance) {
            minDistance = dist;
            closestTierDef = tierDef;
          }
        }
      }
    }
    if (closestTierDef && minDistance <= 5.0) {
      return closestTierDef;
    }
    return FERRY_FARE_TIERS.INNER_HARBOR;
  }

  const str = String(identifierOrCoords).toLowerCase().trim();
  const normalized = str.replace(/[_\s]+/g, '-');

  // Outer Harbor check
  for (const s of FERRY_FARE_TIERS.OUTER_HARBOR.suburbs) {
    if (normalized.includes(s) || s.includes(normalized) || str.includes(s.replace(/-/g, ' '))) {
      return FERRY_FARE_TIERS.OUTER_HARBOR;
    }
  }

  // Mid Harbor check
  for (const s of FERRY_FARE_TIERS.MID_HARBOR.suburbs) {
    if (normalized.includes(s) || s.includes(normalized) || str.includes(s.replace(/-/g, ' '))) {
      return FERRY_FARE_TIERS.MID_HARBOR;
    }
  }

  // Inner Harbor check
  for (const s of FERRY_FARE_TIERS.INNER_HARBOR.suburbs) {
    if (normalized.includes(s) || s.includes(normalized) || str.includes(s.replace(/-/g, ' '))) {
      return FERRY_FARE_TIERS.INNER_HARBOR;
    }
  }

  return FERRY_FARE_TIERS.INNER_HARBOR;
}

/**
 * Resolves the Ferry Fare Tier across origin/destination suburbs, lines, steps, and coordinates.
 */
export function resolveFerryFareTier(params: {
  originSuburbId?: string;
  destinationSuburbId?: string;
  originCoordinates?: [number, number];
  destinationCoordinates?: [number, number];
  transitSteps?: Array<{ line?: string; departureStop?: string; arrivalStop?: string }>;
  transitLines?: string[];
}): FerryFareTierDefinition {
  // Check suburb IDs first
  if (params.originSuburbId) {
    const tier = getFerryFareTier(params.originSuburbId);
    if (tier.tier !== 'INNER_HARBOR') return tier;
  }
  if (params.destinationSuburbId) {
    const tier = getFerryFareTier(params.destinationSuburbId);
    if (tier.tier !== 'INNER_HARBOR') return tier;
  }

  // Check lines
  if (params.transitLines) {
    for (const l of params.transitLines) {
      const tier = getFerryFareTier(l);
      if (tier.tier !== 'INNER_HARBOR') return tier;
    }
  }

  // Check transit steps
  if (params.transitSteps) {
    for (const step of params.transitSteps) {
      if (step.line) {
        const tier = getFerryFareTier(step.line);
        if (tier.tier !== 'INNER_HARBOR') return tier;
      }
      if (step.departureStop) {
        const tier = getFerryFareTier(step.departureStop);
        if (tier.tier !== 'INNER_HARBOR') return tier;
      }
      if (step.arrivalStop) {
        const tier = getFerryFareTier(step.arrivalStop);
        if (tier.tier !== 'INNER_HARBOR') return tier;
      }
    }
  }

  // Check coordinates
  if (params.originCoordinates) {
    const tier = getFerryFareTier(params.originCoordinates);
    if (tier.tier !== 'INNER_HARBOR') return tier;
  }
  if (params.destinationCoordinates) {
    const tier = getFerryFareTier(params.destinationCoordinates);
    if (tier.tier !== 'INNER_HARBOR') return tier;
  }

  return FERRY_FARE_TIERS.INNER_HARBOR;
}

export const INNER_HARBOR_FERRY_FARE = 7.80;
export const MID_HARBOR_FERRY_FARE = 10.40;
export const OUTER_HARBOR_FERRY_FARE = 13.80;

// Aliases with British English spelling
export const INNER_HARBOUR_FERRY_FARE = 7.80;
export const MID_HARBOUR_FERRY_FARE = 10.40;
export const OUTER_HARBOUR_FERRY_FARE = 13.80;

export const FERRY_FARES = {
  innerHarbor: 7.80,
  midHarbor: 10.40,
  outerHarbor: 13.80,
  innerHarbour: 7.80,
  midHarbour: 10.40,
  outerHarbour: 13.80,
  INNER_HARBOR: 7.80,
  MID_HARBOR: 10.40,
  OUTER_HARBOR: 13.80,
  INNER_HARBOUR: 7.80,
  MID_HARBOUR: 10.40,
  OUTER_HARBOUR: 13.80,
} as const;

export * from '@/config/fares.config';
