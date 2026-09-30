'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { CommuteInput } from '@/types';
import { parseCommuteFromParams, serializeCommuteToParams } from '@/lib/urlParams';
import { FuelBenchmarkDto } from '@/lib/supabase';

export const DEFAULT_COMMUTE_INPUT: CommuteInput = {
  originSuburbId: 'epsom',
  destinationSuburbId: 'cbd',
  daysPerWeek: 3,
  vehicleType: 'petrol91',
  powertrain: 'PETROL_91',
  parkingDailyRate: 22.0,
  parkingDaysPerWeek: 3,
  parkingTier: 'CBD_EARLY_BIRD',
  concession: 'adult',
  includeMaintenanceWear: true,
  carpoolPassengers: 1,
  annualWof: 85,
  annualRego: 173,
  insuranceEnabled: true,
  defaultInsurance: 1311,
};

export interface UseCommuteFormOptions {
  initialFuelPrices?: FuelBenchmarkDto;
  initialValues?: Partial<CommuteInput>;
}

export type UseCommuteFormReturn = [
  CommuteInput,
  React.Dispatch<React.SetStateAction<CommuteInput>>
] & {
  commuteInput: CommuteInput;
  setCommuteInput: React.Dispatch<React.SetStateAction<CommuteInput>>;
};

/**
 * Custom React hook managing KiwiCommuter form state and URL query parameter synchronization.
 *
 * Technical Requirements:
 * 1. Lazy-initializes form state from URL parameters to prevent hydration mismatches.
 * 2. Implements guard refs (hasHydratedRef, isSyncingFromPopstateRef) to prevent premature re-serialization of state back to the URL.
 * 3. Applies a 300ms debounce on URL updates.
 * 4. Uses window.history.replaceState to update the URL without clobbering the user's active inputs or spamming browser history.
 * 5. Maps legacy parameter aliases (powertrain, distance, parking rates) to ensure backward compatibility for old shared links.
 */
export function useCommuteForm(options: UseCommuteFormOptions = {}): UseCommuteFormReturn {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Guard refs to prevent premature re-serialization of state back to the URL
  const hasHydratedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingFromPopstateRef = useRef(false);

  // 1. Lazy-initialize the form state from URL parameters to prevent hydration mismatches
  const [commuteInput, setCommuteInput] = useState<CommuteInput>(() => {
    const base: CommuteInput = {
      ...DEFAULT_COMMUTE_INPUT,
      fuelPriceOverride: options.initialFuelPrices?.regular_91,
      ...options.initialValues,
    };

    if (searchParams && searchParams.toString()) {
      return parseCommuteFromParams(searchParams, base);
    }
    if (typeof window !== 'undefined' && window.location.search) {
      const windowParams = new URLSearchParams(window.location.search);
      return parseCommuteFromParams(windowParams, base);
    }
    return base;
  });

  // 2. Mark initial hydration complete on mount
  useEffect(() => {
    hasHydratedRef.current = true;
  }, []);

  // 3. Handle browser back/forward navigation (popstate) without feedback loop
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      isSyncingFromPopstateRef.current = true;
      const currentUrlParams = new URLSearchParams(window.location.search);
      setCommuteInput((prev) => parseCommuteFromParams(currentUrlParams, prev));
      setTimeout(() => {
        isSyncingFromPopstateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 4. Debounced synchronization (300ms) from state to URL on user interaction
  useEffect(() => {
    // Guard: only serialize to URL after initial mount has completed
    if (!hasHydratedRef.current) return;
    // Guard: do not echo back to URL when state change originated from browser popstate
    if (isSyncingFromPopstateRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (typeof window === 'undefined') return;

      const params = serializeCommuteToParams(commuteInput);
      const queryString = params.toString();
      const newSearch = queryString ? `?${queryString}` : '';
      const currentSearch = window.location.search;

      // Only invoke history replaceState if query string actually changed
      if (currentSearch !== newSearch) {
        const currentPath = pathname || window.location.pathname || '/';
        const newUrl = `${currentPath}${newSearch}`;
        window.history.replaceState(null, '', newUrl);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [commuteInput, pathname]);

  const tuple = [commuteInput, setCommuteInput] as const;
  return Object.assign([...tuple] as [CommuteInput, React.Dispatch<React.SetStateAction<CommuteInput>>], {
    commuteInput,
    setCommuteInput,
  });
}

export default useCommuteForm;
