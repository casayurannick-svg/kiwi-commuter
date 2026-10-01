import { CommuteVerdict, VerdictOptions, VerdictState } from '@/types/commute';

export * from '@/types/commute';

/**
 * STORY-2: Pure Verdict Engine & Copy Bank Rules (Sections 6 & 7)
 *
 * Evaluates weekly avoidable car cost (stops.total) vs weekly transit fare (transitCost)
 * and daily commute durations to produce plain-language verdict states.
 *
 * Band rule:
 *   band = Math.max(3, 0.10 * Math.max(stopsWeekly, transitWeekly))
 *
 * States:
 * 1. Transit cheaper:
 *    transitWeekly < (stopsWeekly - band)
 *    headline: "The bus would save you about $X a week"
 *    support: "That's roughly $Y a year, and the bus takes N minutes longer each day."
 *    (Round X to whole dollars, Y = X * 52 annual weeks).
 *
 * 2. About the same (wash):
 *    Math.abs(stopsWeekly - transitWeekly) <= band
 *    headline: "Pretty much a wash"
 *    support: "You'd stop paying $S a week for the car and pay $T in fares."
 *    Append time clause "The bus takes N minutes longer each day." ONLY if (transitMinutesDaily - carMinutesDaily) > 20.
 *
 * 3. Driving cheaper:
 *    stopsWeekly < (transitWeekly - band)
 *    headline: "Driving is cheaper by about $X a week"
 *    support: "And it saves you N minutes a day."
 *
 * Format rules:
 * - Use sentence case, contractions, "a week" / "a year" (never "/week" or "/year").
 * - Whole dollars for X, S, and T in verdict text, no hardcoded dollars.
 *
 * @param stopsWeekly Weekly avoidable car cost (stops.total: fuel, RUC, parking, distance wear)
 * @param transitWeekly Weekly transit fare (transitCost / weeklyTotal)
 * @param carMinutesDaily Daily round-trip car duration in minutes
 * @param transitMinutesDaily Daily round-trip transit duration in minutes
 * @param options Optional configuration (modeLabel, annualWeeks)
 */
export function calculateVerdict(
  stopsWeekly: number,
  transitWeekly: number,
  carMinutesDaily: number,
  transitMinutesDaily: number,
  options?: VerdictOptions
): CommuteVerdict {
  const band = Math.max(3, 0.10 * Math.max(stopsWeekly, transitWeekly));
  const diff = stopsWeekly - transitWeekly;
  const absDiff = Math.abs(diff);
  const timeDeltaDaily = Math.round(transitMinutesDaily - carMinutesDaily);
  const annualWeeks = options?.annualWeeks ?? 52;
  const modeName = options?.modeLabel ? options.modeLabel.toLowerCase() : 'bus';

  let state: VerdictState;
  let headline = '';
  let support = '';
  let savingsWeekly = 0;
  let savingsAnnual = 0;

  if (transitWeekly < stopsWeekly - band) {
    // State 1: Transit cheaper
    state = 'transit_cheaper';
    const X = Math.round(stopsWeekly - transitWeekly);
    const Y = X * annualWeeks;
    savingsWeekly = X;
    savingsAnnual = Y;
    headline = `The ${modeName} would save you about $${X} a week`;
    const timeClause =
      timeDeltaDaily > 0
        ? `, and the ${modeName} takes ${timeDeltaDaily} minutes longer each day.`
        : '.';
    support = `That's roughly $${Y.toLocaleString('en-NZ')} a year${timeClause}`;
  } else if (stopsWeekly < transitWeekly - band) {
    // State 3: Driving cheaper
    state = 'driving_cheaper';
    const X = Math.round(transitWeekly - stopsWeekly);
    const Y = X * annualWeeks;
    savingsWeekly = X;
    savingsAnnual = Y;
    headline = `Driving is cheaper by about $${X} a week`;
    const timeSaved = Math.max(0, timeDeltaDaily);
    support = `And it saves you ${timeSaved} minutes a day.`;
  } else {
    // State 2: About the same (wash)
    state = 'about_the_same';
    const S = Math.round(stopsWeekly);
    const T = Math.round(transitWeekly);
    savingsWeekly = 0;
    savingsAnnual = 0;
    headline = 'Pretty much a wash';
    const baseSupport = `You'd stop paying $${S} a week for the car and pay $${T} in fares.`;
    if (timeDeltaDaily > 20) {
      support = `${baseSupport} The ${modeName} takes ${timeDeltaDaily} minutes longer each day.`;
    } else {
      support = baseSupport;
    }
  }

  return {
    state,
    headline,
    support,
    band: Math.round(band * 100) / 100,
    differenceWeekly: Math.round(absDiff * 100) / 100,
    savingsWeekly,
    savingsAnnual,
    timeDeltaMinutesDaily: timeDeltaDaily,
    isWash: state === 'about_the_same',
    isTransitCheaper: state === 'transit_cheaper',
    isDrivingCheaper: state === 'driving_cheaper',
  };
}
