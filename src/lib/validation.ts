/**
 * EECA / Rightcar Real-World Fuel & Energy Efficiency Benchmarks (STORY-9)
 * Used for non-blocking plausibility checks on user efficiency overrides.
 *
 * References:
 * - EECA (Energy Efficiency and Conservation Authority New Zealand)
 * - Rightcar NZ Fuel Economy & EV Energy Consumption Datasets
 * - Petrol: 5 - 11 L/100km
 * - Diesel: 6 - 11 L/100km
 * - Hybrid (HEV / PHEV): 3 - 6 L/100km
 * - Electric (BEV): 12 - 22 kWh/100km
 */

export interface EfficiencyBenchmark {
  min: number;
  max: number;
  unit: string;
  category: 'petrol' | 'diesel' | 'hybrid' | 'ev';
  warningMessage: string;
}

export const EECA_BENCHMARKS: Record<'petrol' | 'diesel' | 'hybrid' | 'ev', EfficiencyBenchmark> = {
  petrol: {
    min: 5,
    max: 11,
    unit: 'L/100km',
    category: 'petrol',
    warningMessage: 'Petrol cars usually use 5-11 L/100km. Are you sure?',
  },
  diesel: {
    min: 6,
    max: 11,
    unit: 'L/100km',
    category: 'diesel',
    warningMessage: 'Diesel vehicles usually use 6-11 L/100km. Are you sure?',
  },
  hybrid: {
    min: 3,
    max: 6,
    unit: 'L/100km',
    category: 'hybrid',
    warningMessage: 'Hybrids usually use 3-6 L/100km. Are you sure?',
  },
  ev: {
    min: 12,
    max: 22,
    unit: 'kWh/100km',
    category: 'ev',
    warningMessage: 'Electric cars usually use 12-22 kWh/100km. Are you sure?',
  },
};

/**
 * Normalizes a vehicle type string or powertrain into one of the four benchmark categories:
 * 'petrol', 'diesel', 'hybrid', or 'ev'.
 */
export function resolveBenchmarkCategory(
  vehicleType?: string
): 'petrol' | 'diesel' | 'hybrid' | 'ev' | null {
  if (!vehicleType) return null;
  const normalized = vehicleType.toLowerCase().trim();

  if (normalized.includes('phev') || normalized.includes('hev') || normalized.includes('hybrid')) {
    return 'hybrid';
  }
  if (normalized.includes('bev') || normalized === 'ev' || normalized.includes('electric')) {
    return 'ev';
  }
  if (normalized.includes('diesel')) {
    return 'diesel';
  }
  if (normalized.includes('petrol') || normalized.includes('91') || normalized.includes('95') || normalized.includes('ice')) {
    return 'petrol';
  }
  return null;
}

/**
 * Validates vehicle efficiency against EECA / Rightcar real-world benchmarks.
 * Returns a gentle, conversational warning string if outside the standard range.
 * Returns null if the value is within plausible limits or if input is empty/undefined.
 *
 * @param vehicleType Vehicle powertrain or type ('petrol91', 'diesel', 'hev', 'bev', etc.)
 * @param value Fuel economy (L/100km) or EV efficiency (kWh/100km)
 */
export function checkEfficiencyPlausibility(
  vehicleType: string | undefined,
  value: number | null | undefined
): string | null {
  if (value === null || value === undefined || isNaN(value) || value <= 0) {
    return null;
  }

  const category = resolveBenchmarkCategory(vehicleType);
  if (!category) return null;

  const benchmark = EECA_BENCHMARKS[category];
  if (value < benchmark.min || value > benchmark.max) {
    return benchmark.warningMessage;
  }

  return null;
}
