import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  AT_INNER_HARBOUR_FERRY_FARE,
  CONCESSION_MULTIPLIERS,
  INNER_HARBOUR_FERRY_FARE,
  WAIHEKE_FERRY_FARES,
} from '@/config/fares.config';
import { ConcessionType, FareConcession, TransitStepDetail } from '@/types';

export {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  AT_INNER_HARBOUR_FERRY_FARE,
  CONCESSION_MULTIPLIERS,
  INNER_HARBOUR_FERRY_FARE,
  WAIHEKE_FERRY_FARES,
};

/**
 * Checks if a given transit step implies an Inner Harbour or regional ferry service.
 */
export function isFerryStep(step: TransitStepDetail): boolean {
  if (step.travelMode === 'FERRY' || step.vehicleType === 'FERRY') {
    return true;
  }
  const lineLower = (step.line || '').toLowerCase();
  const depLower = (step.departureStop || '').toLowerCase();
  const arrLower = (step.arrivalStop || '').toLowerCase();

  return (
    lineLower.includes('ferry') ||
    lineLower === 'dev' ||
    depLower.includes('ferry') ||
    arrLower.includes('ferry') ||
    depLower.includes('wharf') ||
    arrLower.includes('wharf')
  );
}

/**
 * Checks if an entire transit journey should be classified as an Inner Harbour Ferry route.
 * Bypasses standard bus/train zonal fares and applies the statutory $7.80 base fare.
 */
export function isInnerHarbourFerryRoute(params: {
  transitMode?: string;
  primaryTransitMode?: string;
  originSuburbId?: string;
  destinationSuburbId?: string;
  transitSteps?: TransitStepDetail[];
  transitLines?: string[];
  isWaihekeRoute?: boolean;
}): boolean {
  if (params.isWaihekeRoute) {
    return false;
  }

  const originId = params.originSuburbId?.toLowerCase();
  const destId = params.destinationSuburbId?.toLowerCase();

  if (originId === 'waiheke' || destId === 'waiheke') {
    return false;
  }

  // Check if any step explicitly uses travelMode: FERRY or implies a ferry
  if (params.transitSteps?.some(isFerryStep)) {
    return true;
  }

  // Check transit lines
  if (
    params.transitLines?.some(
      (line) => line.toLowerCase().includes('ferry') || line.toUpperCase() === 'DEV'
    )
  ) {
    return true;
  }

  // Check explicit transit mode
  if (params.transitMode === 'FERRY' || params.transitMode === 'Ferry') {
    return true;
  }

  // Suburb primary mode or harbour-crossing terminal suburbs
  const harbourSuburbs = ['devonport', 'bayswater', 'birkenhead', 'half-moon-bay', 'hobsonville-point'];
  if (
    (!params.transitMode &&
      (params.primaryTransitMode === 'Ferry' ||
        harbourSuburbs.includes(originId || '') ||
        harbourSuburbs.includes(destId || '')))
  ) {
    return true;
  }

  return false;
}

/**
 * Calculates the single-trip standard and concession fares for a given transit route.
 * Handles the February 2026 AT HOP price hike and Inner Harbour Ferry classification.
 */
export function calculateSingleTripTransitFare(params: {
  zoneCount: number;
  isFerry: boolean;
  isWaiheke: boolean;
  concession: ConcessionType;
  fareConcession?: FareConcession;
}): {
  singleTripStandardFare: number;
  singleTripConcessionFare: number;
  isCapEligible: boolean;
} {
  const { zoneCount, isFerry, isWaiheke, concession, fareConcession } = params;

  if (isFerry && isWaiheke) {
    const standard = WAIHEKE_FERRY_FARES.singleTripStandard;
    const concessionFare = WAIHEKE_FERRY_FARES.concessionFares[concession] ?? standard;
    return {
      singleTripStandardFare: standard,
      singleTripConcessionFare: Math.round(concessionFare * 100) / 100,
      isCapEligible: false,
    };
  }

  if (isFerry) {
    // US-10: Inner Harbour Ferry fare of $7.80
    const standard = INNER_HARBOUR_FERRY_FARE;
    let concessionFare = standard;

    if (fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[fareConcession]) {
      if (fareConcession === 'TERTIARY') {
        concessionFare = standard * 0.8;
      } else if (fareConcession === 'CHILD') {
        concessionFare = standard * 0.5;
      }
    } else {
      const concessionInfo = CONCESSION_MULTIPLIERS[concession] || CONCESSION_MULTIPLIERS.adult;
      concessionFare = standard * concessionInfo.multiplier;
    }

    return {
      singleTripStandardFare: standard,
      singleTripConcessionFare: Math.round(concessionFare * 100) / 100,
      isCapEligible: true,
    };
  }

  // Standard Zonal Bus/Train
  const standard = AT_HOP_ZONE_FARES[zoneCount] || 3.00;
  let concessionFare = standard;

  if (fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[fareConcession]) {
    concessionFare = AT_HOP_ZONE_FARES_BY_CONCESSION[fareConcession][zoneCount] ?? standard;
  } else {
    const concessionInfo = CONCESSION_MULTIPLIERS[concession] || CONCESSION_MULTIPLIERS.adult;
    concessionFare = standard * concessionInfo.multiplier;
  }

  return {
    singleTripStandardFare: standard,
    singleTripConcessionFare: Math.round(concessionFare * 100) / 100,
    isCapEligible: true,
  };
}
