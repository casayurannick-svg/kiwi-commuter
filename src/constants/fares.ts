/**
 * Auckland Transport Ferry Fare Tier Matrix
 *
 * Tier 1: Inner Harbor ($7.80)
 * Includes Devonport, Bayswater, Birkenhead, Te Onewa Northcote Point
 *
 * Tier 2: Mid Harbor ($10.40)
 * Includes Half Moon Bay, Hobsonville Point, Beach Haven
 *
 * Tier 3: Outer Harbor ($13.80)
 * Includes Gulf Harbour, Pine Harbour, West Harbour
 */

export interface FerryFareTierDefinition {
  tier: 'INNER_HARBOR' | 'MID_HARBOR' | 'OUTER_HARBOR';
  name: string;
  rate: number;
  capEligible: boolean;
  suburbs: string[];
}

export const FERRY_FARE_TIERS: Record<'INNER_HARBOR' | 'MID_HARBOR' | 'OUTER_HARBOR', FerryFareTierDefinition> = {
  INNER_HARBOR: {
    tier: 'INNER_HARBOR',
    name: 'Inner Harbor',
    rate: 7.80,
    capEligible: true,
    suburbs: ['devonport', 'bayswater', 'birkenhead', 'te-onewa-northcote-point'],
  },
  MID_HARBOR: {
    tier: 'MID_HARBOR',
    name: 'Mid Harbor',
    rate: 10.40,
    capEligible: true,
    suburbs: ['half-moon-bay', 'hobsonville-point', 'beach-haven'],
  },
  OUTER_HARBOR: {
    tier: 'OUTER_HARBOR',
    name: 'Outer Harbor',
    rate: 13.80,
    capEligible: false,
    suburbs: ['gulf-harbour', 'pine-harbour', 'west-harbour'],
  },
};

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
