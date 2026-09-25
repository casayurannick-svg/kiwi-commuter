'use client';

import CommuteForm from '@/components/CommuteForm';
import ComparisonCard from '@/components/ComparisonCard';
import FuelRadarWidget from '@/components/FuelRadarWidget';
import MonthlySavingsChart from '@/components/MonthlySavingsChart';
import RouteMap from '@/components/RouteMap';
import { getSuburbById } from '@/config/suburbs';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { FuelBenchmarkDto } from '@/lib/supabase';
import { parseCommuteFromParams, serializeCommuteToParams } from '@/lib/urlParams';
import { CommuteInput } from '@/types';
import {
  Bus,
  Check,
  Share2,
} from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface DashboardClientProps {
  initialFuelPrices?: FuelBenchmarkDto;
}

export default function DashboardClient({ initialFuelPrices }: DashboardClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [commuteInput, setCommuteInput] = useState<CommuteInput>(() => {
    const base: CommuteInput = {
      originSuburbId: 'epsom',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 22.0,
      parkingDaysPerWeek: 3,
      parkingTier: 'CBD_EARLY_BIRD',
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
      fuelPriceOverride: initialFuelPrices?.regular_91,
    };
    if (searchParams && searchParams.toString()) {
      return parseCommuteFromParams(searchParams, base);
    }
    return base;
  });

  // Keep browser URL search params synchronized on input changes
  useEffect(() => {
    const params = serializeCommuteToParams(commuteInput);
    const queryString = params.toString();
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
    if (typeof window !== 'undefined' && window.location.search !== (queryString ? `?${queryString}` : '')) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [commuteInput, pathname]);

  const origin = useMemo(() => getSuburbById(commuteInput.originSuburbId), [commuteInput.originSuburbId]);
  const destination = useMemo(
    () => getSuburbById(commuteInput.destinationSuburbId),
    [commuteInput.destinationSuburbId]
  );

  const arbitrage = useMemo(() => calculateCommuteArbitrage(commuteInput), [commuteInput]);

  const handleShareLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success && typeof document !== 'undefined') {
      try {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        success = true;
      } catch {
        success = false;
      }
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setIsCopied(true);
    setToastMessage(success ? 'Comparison link copied to clipboard!' : 'Failed to copy link');

    toastTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      setToastMessage(null);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white safe-pb">
      {/* Top Navbar / Header (Minimalist & Functional) */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Kiwi Commuter
              </h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">
                Auckland driving vs AT transit cost arbitrage.
              </p>
            </div>
          </div>

          {/* Minimal Badges & Share Link */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleShareLink}
              className="min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition active:scale-95"
              title="Copy shareable link with current commute parameters"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Body (Mobile First Responsive Stack & Desktop 2-Column Grid) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:gap-5 items-start">
          {/* Left Column (Desktop cols 1..5: CommuteForm + FuelRadarWidget) */}
          <div className="contents lg:flex lg:flex-col lg:col-span-5 lg:gap-4 w-full">
            <div className="order-1 w-full">
              <CommuteForm input={commuteInput} onChange={setCommuteInput} onInputChange={setCommuteInput} />
            </div>
            <div className="order-5 w-full">
              <FuelRadarWidget initialFuelData={initialFuelPrices} />
            </div>
          </div>

          {/* Right Column (Desktop cols 6..12: ComparisonCard + RouteMap + MonthlySavingsChart) */}
          <div className="contents lg:flex lg:flex-col lg:col-span-7 lg:gap-4 w-full">
            <div className="order-2 w-full">
              <ComparisonCard arbitrage={arbitrage} input={commuteInput} />
            </div>
            <div className="order-3 w-full">
              <RouteMap
                origin={origin}
                destination={destination}
                distanceKm={arbitrage.distanceKm}
                drivingTimeMins={arbitrage.drivingTimeMins}
                transitTimeMins={arbitrage.transitTimeMins}
              />
            </div>
            <div className="order-4 w-full">
              <MonthlySavingsChart arbitrage={arbitrage} />
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer with Compact Inline Links */}
      <footer className="border-t border-slate-800/80 px-4 sm:px-6 py-4 text-xs text-slate-400 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-300">Kiwi Commuter</span>
            <span>·</span>
            <a
              href="https://www.nzta.govt.nz/vehicles/licensing-rego/road-user-charges/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 underline underline-offset-2 transition"
            >
              Waka Kotahi RUC
            </a>
            <span>·</span>
            <a
              href="https://at.govt.nz/bus-train-ferry/fares-discounts"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 underline underline-offset-2 transition"
            >
              AT 2026 Fares
            </a>
            <span>·</span>
            <a
              href="https://www.mbie.govt.nz/building-and-energy/energy-and-natural-resources/energy-statistics-and-modelling/energy-statistics/weekly-fuel-price-monitoring/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 underline underline-offset-2 transition"
            >
              MBIE Data
            </a>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900/95 border border-emerald-500/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-200"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
