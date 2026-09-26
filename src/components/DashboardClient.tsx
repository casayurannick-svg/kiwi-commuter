'use client';

import CommuteForm from '@/components/CommuteForm';
import ComparisonCard from '@/components/ComparisonCard';
import DonationButton from '@/components/DonationButton';
import FuelRadarWidget from '@/components/FuelRadarWidget';
import JourneyTimeline from '@/components/JourneyTimeline';
import MonthlySavingsChart from '@/components/MonthlySavingsChart';
import RouteMap from '@/components/RouteMap';
import { getSuburbById } from '@/config/suburbs';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { FuelBenchmarkDto } from '@/lib/supabase';
import { parseCommuteFromParams, serializeCommuteToParams } from '@/lib/urlParams';
import { CommuteInput } from '@/types';
import ShareButton from '@/components/ShareButton';
import KiwiPathwayIcon from '@/components/icons/KiwiPathwayIcon';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

interface DashboardClientProps {
  initialFuelPrices?: FuelBenchmarkDto;
}

export default function DashboardClient({ initialFuelPrices }: DashboardClientProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

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
      annualWof: 85,
      annualRego: 173,
      insuranceEnabled: true,
      defaultInsurance: 1311,
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

  // US-36: Keep commuteInput in sync if searchParams updates from external navigation / popstate
  useEffect(() => {
    const rawSearch = searchParams?.toString() || (typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : '');
    if (rawSearch) {
      const currentUrlParams = new URLSearchParams(rawSearch);
      setCommuteInput((prev) => {
        const parsed = parseCommuteFromParams(currentUrlParams, prev);
        const prevParams = serializeCommuteToParams(prev).toString();
        const nextParams = serializeCommuteToParams(parsed).toString();
        if (prevParams !== nextParams) {
          return parsed;
        }
        return prev;
      });
    }
  }, [searchParams]);

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

  // US-21 & US-35: Fetch real-world transit & driving metrics from Google Routes API.
  // Injects drivingDistanceKm and drivingTimeMins into commuteInput so calculations reflect actual road routing (e.g. ~17-18 km for Devonport to Parnell).
  useEffect(() => {
    const originCoords = commuteInput.originCoordinates || origin?.coordinates;
    const destinationCoords = commuteInput.destinationCoordinates || destination?.coordinates;

    if (!originCoords || !destinationCoords) {
      return;
    }

    let cancelled = false;

    const fetchRouteMetrics = async () => {
      try {
        const params = new URLSearchParams({
          originLng: String(originCoords[0]),
          originLat: String(originCoords[1]),
          destinationLng: String(destinationCoords[0]),
          destinationLat: String(destinationCoords[1]),
        });
        const res = await fetch(`/api/routes?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        setCommuteInput((prev) => {
          const newDrivingDist =
            typeof data.drivingDistanceKm === 'number' && data.drivingDistanceKm > 0
              ? data.drivingDistanceKm
              : prev.drivingDistanceKm;
          const newDrivingTime =
            typeof data.drivingDurationMins === 'number' && data.drivingDurationMins > 0
              ? data.drivingDurationMins
              : prev.drivingTimeMins;
          const newTransitTime =
            prev.transitMode !== 'EBIKE' && typeof data.totalDurationMins === 'number' && data.totalDurationMins > 0
              ? data.totalDurationMins
              : prev.transitMode !== 'EBIKE' && typeof data.transitDurationMins === 'number' && data.transitDurationMins > 0
              ? data.transitDurationMins
              : prev.transitTimeMins;
          const newTransitRide =
            prev.transitMode !== 'EBIKE' && typeof data.transitDurationMins === 'number' && data.transitDurationMins > 0
              ? data.transitDurationMins
              : prev.transitRideDurationMins;

          if (
            prev.drivingDistanceKm === newDrivingDist &&
            prev.drivingTimeMins === newDrivingTime &&
            prev.transitTimeMins === newTransitTime &&
            prev.transitRideDurationMins === newTransitRide
          ) {
            return prev;
          }

          return {
            ...prev,
            drivingDistanceKm: newDrivingDist,
            drivingTimeMins: newDrivingTime,
            transitTimeMins: newTransitTime,
            transitRideDurationMins: newTransitRide,
            transitSteps: data.transitSteps ?? prev.transitSteps,
            transitLines: data.transitLines ?? prev.transitLines,
          };
        });
      } catch (err) {
        console.warn('[US-35] /api/routes fetch failed, using static estimate:', err);
      }
    };

    fetchRouteMetrics();

    return () => {
      cancelled = true;
    };
  }, [
    commuteInput.originCoordinates,
    commuteInput.destinationCoordinates,
    commuteInput.originSuburbId,
    commuteInput.destinationSuburbId,
    commuteInput.transitMode,
    origin?.coordinates,
    destination?.coordinates,
  ]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white safe-pb">
      {/* Top Navbar / Header (Minimalist & Functional) */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KiwiPathwayIcon className="h-8 w-8 text-emerald-500 shrink-0" aria-label="Kiwi Commuter" />
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Kiwi Commuter
              </h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">
                The daily commute calculator for driving and public transport.
              </p>
            </div>
          </div>

          {/* Minimal Badges, Donation Button & Share Link */}
          <div className="flex items-center gap-1.5 shrink-0">
            <DonationButton variant="header" />
            <ShareButton commuteInput={commuteInput} />
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

          {/* Right Column (Desktop cols 6..12: ComparisonCard + JourneyTimeline + RouteMap + MonthlySavingsChart) */}
          <div className="contents lg:flex lg:flex-col lg:col-span-7 lg:gap-4 w-full">
            <div className="order-2 w-full">
              <ComparisonCard arbitrage={arbitrage} input={commuteInput} />
            </div>
            <div className="order-3 w-full">
              <JourneyTimeline
                arbitrage={arbitrage}
                input={commuteInput}
                onFirstMileModeChange={(mode) =>
                  setCommuteInput((prev) => ({ ...prev, firstMileMode: mode }))
                }
              />
            </div>
            <div className="order-4 w-full">
              <RouteMap
                origin={origin}
                destination={destination}
                distanceKm={arbitrage.distanceKm}
                drivingTimeMins={arbitrage.drivingTimeMins}
                transitTimeMins={arbitrage.transitTimeMins}
              />
            </div>
            <div className="order-5 w-full">
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
          <div className="shrink-0">
            <DonationButton variant="footer" />
          </div>
        </div>
      </footer>
    </div>
  );
}
