export type VerdictState = 'transit_cheaper' | 'about_the_same' | 'driving_cheaper';

export interface CommuteVerdict {
  state: VerdictState;
  headline: string;
  support: string;
  band: number;
  differenceWeekly: number;
  savingsWeekly: number;
  savingsAnnual: number;
  timeDeltaMinutesDaily: number;
  isWash: boolean;
  isTransitCheaper: boolean;
  isDrivingCheaper: boolean;
}

export interface VerdictOptions {
  modeLabel?: string;
  annualWeeks?: number;
}
