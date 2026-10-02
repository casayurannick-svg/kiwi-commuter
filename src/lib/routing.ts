import { JourneyLeg, TransitStepDetail } from '@/types';

export type PrimaryTransitMode = 'train' | 'ferry' | 'bus' | 'ebike' | 'scooter' | 'walk' | 'drive';

export interface PrimaryTransitModeOptions {
  /**
   * Strategy for selecting the primary transit mode:
   * - 'duration' (default): Selects mode with longest duration. Uses hierarchy as tiebreaker.
   * - 'hierarchy': Strictly selects highest ranking mode in hierarchy (Train > Ferry > Bus).
   */
  strategy?: 'duration' | 'hierarchy';
  /**
   * Output casing format:
   * - 'lowercase' (default): returns 'train', 'ferry', 'bus' (useful for nouns e.g. "The train would save you...")
   * - 'titlecase': returns 'Train', 'Ferry', 'Bus' (useful for UI labels)
   */
  format?: 'lowercase' | 'titlecase';
}

/**
 * Rigid mode hierarchy ranking (higher value = higher priority)
 * Hierarchy: Train > Ferry > Bus > E-Bike > Scooter > Walk > Drive
 */
export const TRANSIT_MODE_HIERARCHY: Record<PrimaryTransitMode, number> = {
  train: 30,
  ferry: 20,
  bus: 10,
  ebike: 8,
  scooter: 5,
  walk: 1,
  drive: 0,
};

/**
 * Normalizes any vehicle, mode, or line string into a canonical PrimaryTransitMode.
 */
export function normalizeTransitMode(raw?: string | null): PrimaryTransitMode | null {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();

  if (
    s === 'train' ||
    s === 'rail' ||
    s === 'heavy_rail' ||
    s === 'subway' ||
    s === 'metro' ||
    s.includes('train') ||
    s.includes('line')
  ) {
    return 'train';
  }

  if (s === 'ferry' || s === 'boat' || s === 'ship' || s.includes('ferry') || s.includes('wharf')) {
    return 'ferry';
  }

  if (s === 'ebike' || s === 'e-bike' || s === 'cycle' || s === 'bike') {
    return 'ebike';
  }

  if (s === 'scooter' || s === 'zap' || s.includes('scoot')) {
    return 'scooter';
  }

  if (s === 'bus' || s.includes('bus') || s.includes('link') || s.startsWith('nx')) {
    return 'bus';
  }

  if (s === 'walk' || s.includes('walk') || s === 'footprints') {
    return 'walk';
  }

  if (s === 'drive' || s === 'car') {
    return 'drive';
  }

  return null;
}

export type GenericLegInput =
  | JourneyLeg
  | TransitStepDetail
  | string
  | {
      mode?: string;
      vehicleType?: string;
      travelMode?: string;
      line?: string;
      durationMins?: number;
      durationSeconds?: number;
      duration?: number;
      type?: string;
      transitSteps?: TransitStepDetail[];
    };

interface FlattenedTransitStep {
  mode: PrimaryTransitMode;
  durationMins: number;
}

/**
 * Extracts and flattens all transit steps from the provided legs array.
 * If legs contain nested transitSteps, those individual sub-steps are extracted.
 */
function extractSteps(legs: unknown): FlattenedTransitStep[] {
  if (!Array.isArray(legs) || legs.length === 0) return [];

  const steps: FlattenedTransitStep[] = [];

  for (const item of legs) {
    if (!item) continue;

    if (typeof item === 'string') {
      const mode = normalizeTransitMode(item);
      if (mode) steps.push({ mode, durationMins: 0 });
      continue;
    }

    if (typeof item === 'object') {
      const obj = item as Record<string, unknown>;

      // If this leg contains nested transitSteps, extract them directly
      if (Array.isArray(obj.transitSteps) && obj.transitSteps.length > 0) {
        for (const subStep of obj.transitSteps) {
          const subObj = subStep as Record<string, unknown>;
          const mode =
            normalizeTransitMode(subObj.vehicleType as string) ||
            normalizeTransitMode(subObj.travelMode as string) ||
            normalizeTransitMode(subObj.line as string) ||
            normalizeTransitMode(subObj.mode as string);

          const dur =
            typeof subObj.durationMins === 'number'
              ? subObj.durationMins
              : typeof subObj.durationSeconds === 'number'
              ? Math.round(subObj.durationSeconds / 60)
              : typeof subObj.duration === 'number'
              ? subObj.duration
              : 0;

          if (mode) {
            steps.push({ mode, durationMins: dur });
          }
        }
        continue;
      }

      // Check standard leg properties
      const rawMode =
        (obj.vehicleType as string) ||
        (obj.mode as string) ||
        (obj.travelMode as string) ||
        (obj.line as string);

      const mode = normalizeTransitMode(rawMode);
      const isFirstOrLastMileWalkOrDrive =
        (obj.type === 'FIRST_MILE' || obj.type === 'LAST_MILE') &&
        (mode === 'walk' || mode === 'drive');

      const dur =
        typeof obj.durationMins === 'number'
          ? obj.durationMins
          : typeof obj.durationSeconds === 'number'
          ? Math.round(obj.durationSeconds / 60)
          : typeof obj.duration === 'number'
          ? obj.duration
          : 0;

      if (mode) {
        // Tag first/last-mile walk/drive with negative rank if needed, or push with actual mode
        steps.push({
          mode,
          durationMins: isFirstOrLastMileWalkOrDrive ? 0 : dur,
        });
      }
    }
  }

  return steps;
}

/**
 * BUG-15: Identifies the primary transit mode for a multimodal journey.
 *
 * Evaluation Rules:
 * 1. Filters down to active transit modes (Train, Ferry, Bus, E-Bike, Scooter).
 * 2. If 'strategy' is 'hierarchy', chooses the mode with the highest rank (Train > Ferry > Bus).
 * 3. Default: Calculates cumulative duration per mode. Selects the mode with the longest duration.
 *    If durations are tied or 0, breaks the tie using the rigid hierarchy (Train > Ferry > Bus).
 *
 * @param legs Array of JourneyLegs, TransitStepDetails, or generic transit step objects
 * @param options Configuration for strategy ('duration' | 'hierarchy') and format ('lowercase' | 'titlecase')
 * @returns Primary transit mode string (e.g. 'train' or 'Train')
 */
export function getPrimaryTransitMode(
  legs?: unknown,
  options?: PrimaryTransitModeOptions
): string {
  const steps = extractSteps(legs);
  const strategy = options?.strategy ?? 'duration';
  const format = options?.format ?? 'lowercase';

  // If no steps found, default to 'bus'
  if (steps.length === 0) {
    return format === 'titlecase' ? 'Bus' : 'bus';
  }

  // Filter to public transit / micro-mobility modes (exclude pure walk/drive unless only walk exists)
  const transitSteps = steps.filter(
    (s) => s.mode !== 'walk' && s.mode !== 'drive'
  );
  const candidates = transitSteps.length > 0 ? transitSteps : steps;

  // Aggregate total duration and presence per mode
  const modeDurations: Partial<Record<PrimaryTransitMode, number>> = {};
  for (const step of candidates) {
    modeDurations[step.mode] = (modeDurations[step.mode] ?? 0) + step.durationMins;
  }

  const uniqueModes = Object.keys(modeDurations) as PrimaryTransitMode[];

  if (uniqueModes.length === 1) {
    const single = uniqueModes[0];
    return format === 'titlecase' ? toTitleCase(single) : single;
  }

  let selectedMode: PrimaryTransitMode;

  if (strategy === 'hierarchy') {
    // Strictly sort by hierarchy rank descending
    uniqueModes.sort((a, b) => {
      const rankA = TRANSIT_MODE_HIERARCHY[a] ?? 0;
      const rankB = TRANSIT_MODE_HIERARCHY[b] ?? 0;
      return rankB - rankA;
    });
    selectedMode = uniqueModes[0];
  } else {
    // Sort by duration descending. If durations are equal, use hierarchy rank as tiebreaker.
    uniqueModes.sort((a, b) => {
      const durA = modeDurations[a] ?? 0;
      const durB = modeDurations[b] ?? 0;
      if (durA !== durB) {
        return durB - durA; // Longest duration first
      }
      // Tie-breaker: Rigid hierarchy (Train > Ferry > Bus)
      const rankA = TRANSIT_MODE_HIERARCHY[a] ?? 0;
      const rankB = TRANSIT_MODE_HIERARCHY[b] ?? 0;
      return rankB - rankA;
    });
    selectedMode = uniqueModes[0];
  }

  return format === 'titlecase' ? toTitleCase(selectedMode) : selectedMode;
}

/**
 * Returns human-readable UI title/label for a transit mode.
 */
export function getPrimaryTransitModeLabel(mode: string): string {
  const norm = normalizeTransitMode(mode) || 'bus';
  return toTitleCase(norm);
}

function toTitleCase(mode: string): string {
  switch (mode) {
    case 'train':
      return 'Train';
    case 'ferry':
      return 'Ferry';
    case 'bus':
      return 'Bus';
    case 'ebike':
      return 'E-Bike';
    case 'scooter':
      return 'Scooter';
    case 'walk':
      return 'Walk';
    case 'drive':
      return 'Drive';
    default: {
      const s = String(mode);
      return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }
  }
}
