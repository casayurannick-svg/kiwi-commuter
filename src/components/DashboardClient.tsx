'use client';

import DonationButton from '@/components/DonationButton';
import Tabs from '@/components/Tabs';
import SummaryTab from '@/components/SummaryTab';
import CompareTab from '@/components/CompareTab';
import AdvancedTab from '@/components/AdvancedTab';
import { getSuburbById } from '@/config/suburbs';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { FuelBenchmarkDto } from '@/lib/supabase';
import ShareButton from '@/components/ShareButton';
import FeedbackButton from '@/components/FeedbackButton';
import FeedbackModal from '@/components/FeedbackModal';
import KiwiPathwayIcon from '@/components/icons/KiwiPathwayIcon';
import SetupModal from '@/components/SetupModal';
import { SetupResult } from '@/components/SetupFlow';
import { useCommuteForm } from '@/hooks/useCommuteForm';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, MessageSquare } from 'lucide-react';

interface DashboardClientProps {
  initialFuelPrices?: FuelBenchmarkDto;
}

export default function DashboardClient({ initialFuelPrices }: DashboardClientProps) {
  const searchParams = useSearchParams();
  const { commuteInput, setCommuteInput } = useCommuteForm({ initialFuelPrices });
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // STORY-7: Returning users bypass the setup modal
  const isReturningUser = useMemo(() => {
    if (!searchParams) return false;
    return searchParams.toString().length > 0;
  }, [searchParams]);

  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean>(() => isReturningUser);
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(() => !isReturningUser);
  const [setupInitialStep, setSetupInitialStep] = useState<number>(1);

  const handleSetupComplete = (result: SetupResult) => {
    setCommuteInput((prev) => ({
      ...prev,
      originSuburbId: result.originSuburbId,
      destinationSuburbId: result.destinationSuburbId,
      originAddress: result.originAddress ?? prev.originAddress,
      destinationAddress: result.destinationAddress ?? prev.destinationAddress,
      originCoordinates: result.originCoordinates ?? prev.originCoordinates,
      destinationCoordinates: result.destinationCoordinates ?? prev.destinationCoordinates,
      daysPerWeek: result.daysPerWeek,
      vehicleType: result.vehicleType,
      powertrain: result.powertrain,
      power: result.powertrain,
      hasCar: result.hasCar,
      parkingDailyRate: result.parkingDailyRate,
      parkingTier: result.parkingTier ?? (result.parkingDailyRate === 0 ? 'FREE' : 'CUSTOM'),
      isParkingAssumed: result.isParkingAssumed,
    }));
    setHasCompletedSetup(true);
    setIsSetupOpen(false);
  };

  const handleEditCommute = (step: number = 1) => {
    setSetupInitialStep(step);
    setIsSetupOpen(true);
  };

  const origin = useMemo(() => getSuburbById(commuteInput.originSuburbId), [commuteInput.originSuburbId]);
  const destination = useMemo(
    () => getSuburbById(commuteInput.destinationSuburbId),
    [commuteInput.destinationSuburbId]
  );

  const arbitrage = useMemo(() => calculateCommuteArbitrage(commuteInput), [commuteInput]);

  // US-21 & US-35: Fetch real-world transit & driving metrics from Google Routes API.
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
        if (commuteInput.transitMode) {
          params.set('transitMode', commuteInput.transitMode);
        }
        if (commuteInput.firstMileMode) {
          params.set('firstMileMode', commuteInput.firstMileMode);
        }
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
          const newFirstMileDist =
            typeof data.firstMileDistanceKm === 'number'
              ? data.firstMileDistanceKm
              : prev.firstMileDistanceKm;
          const newFirstMileDur =
            typeof data.firstMileDurationMins === 'number'
              ? data.firstMileDurationMins
              : prev.firstMileDurationMins;
          const newFirstMileMode =
            typeof data.firstMileMode === 'string' && data.firstMileMode
              ? (data.firstMileMode as 'DRIVE' | 'CYCLE' | 'SCOOTER' | 'WALK')
              : prev.firstMileMode;

          if (
            prev.drivingDistanceKm === newDrivingDist &&
            prev.drivingTimeMins === newDrivingTime &&
            prev.transitTimeMins === newTransitTime &&
            prev.transitRideDurationMins === newTransitRide &&
            prev.firstMileDistanceKm === newFirstMileDist &&
            prev.firstMileDurationMins === newFirstMileDur &&
            prev.firstMileMode === newFirstMileMode
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
            firstMileDistanceKm: newFirstMileDist,
            firstMileDurationMins: newFirstMileDur,
            firstMileMode: newFirstMileMode,
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
    commuteInput.firstMileMode,
    origin?.coordinates,
    destination?.coordinates,
    setCommuteInput,
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

          {/* Minimal Badges, Feedback Button, Donation Button & Share Link */}
          <div className="flex items-center gap-1.5 shrink-0">
            <FeedbackButton onClick={() => setIsFeedbackOpen(true)} variant="header" />
            <DonationButton variant="header" />
            <ShareButton commuteInput={commuteInput} />
          </div>
        </div>
      </header>

      {/* Sticky Tab Navigation Shell (STORY-3) */}
      <Tabs
        activeTab={commuteInput.activeTab || 'summary'}
        onTabChange={(tab) => setCommuteInput((prev) => ({ ...prev, activeTab: tab, tab }))}
      />

      {/* Main Workspace Body (Mobile First Responsive Stack & Desktop 2-Column Grid) */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-6">
        {/* Tab Panel: Summary (STORY-4 Layered Disclosure UI) */}
        <div
          role="tabpanel"
          id="panel-summary"
          aria-labelledby="tab-summary"
          className={commuteInput.activeTab === 'summary' || !commuteInput.activeTab ? 'block' : 'hidden'}
        >
          <SummaryTab
            commuteInput={commuteInput}
            setCommuteInput={setCommuteInput}
            arbitrage={arbitrage}
            onChangeTab={(tab) => setCommuteInput((prev) => ({ ...prev, activeTab: tab, tab }))}
            onEditCommute={handleEditCommute}
          />
        </div>

        {/* Tab Panel: Compare (STORY-5 Side-by-Side Cost Base Analysis) */}
        <div
          role="tabpanel"
          id="panel-compare"
          aria-labelledby="tab-compare"
          className={commuteInput.activeTab === 'compare' ? 'block' : 'hidden'}
        >
          <CompareTab
            commuteInput={commuteInput}
            setCommuteInput={setCommuteInput}
            arbitrage={arbitrage}
          />
        </div>

        {/* Tab Panel: Advanced (STORY-6 Collapsible Disclosure Rows) */}
        <div
          role="tabpanel"
          id="panel-advanced"
          aria-labelledby="tab-advanced"
          className={commuteInput.activeTab === 'advanced' ? 'block' : 'hidden'}
        >
          <AdvancedTab
            commuteInput={commuteInput}
            setCommuteInput={setCommuteInput}
            arbitrage={arbitrage}
            initialFuelPrices={initialFuelPrices}
            origin={origin}
            destination={destination}
          />
        </div>
      </main>

      {/* Minimal Footer with Compact Inline Links */}
      <footer className="border-t border-slate-800/80 px-4 sm:px-6 py-4 text-xs text-slate-400 mt-8 pb-20 md:pb-4">
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
          <div className="flex items-center gap-2 shrink-0">
            <FeedbackButton onClick={() => setIsFeedbackOpen(true)} variant="footer" />
            <DonationButton variant="footer" />
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Action Bar for Core Controls (Mobile viewports only, hidden on md+) */}
      <div
        data-testid="mobile-action-bar"
        className="md:hidden sticky bottom-0 z-50 bg-[#090d16]/95 backdrop-blur-md border-t border-slate-800/90 px-4 py-2.5 shadow-2xl safe-pb"
      >
        <div className="flex items-center justify-between gap-2.5 max-w-lg mx-auto">
          {/* Primary Calculation / Route Edit Action */}
          <button
            type="button"
            data-testid="mobile-edit-commute-btn"
            onClick={() => handleEditCommute(1)}
            aria-label="Edit commute calculation parameters"
            className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/50 transition active:scale-[0.98]"
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>Recalculate Commute</span>
          </button>

          {/* Core Feedback Action */}
          <button
            type="button"
            data-testid="mobile-feedback-btn"
            onClick={() => setIsFeedbackOpen(true)}
            aria-label="Report Feedback"
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/70 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] shrink-0"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs">Feedback</span>
          </button>

          {/* Share Action */}
          <ShareButton
            commuteInput={commuteInput}
            className="min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-semibold transition active:scale-[0.98] shrink-0"
          />
        </div>
      </div>

      {/* In-App Feedback Reporter Modal */}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

      {/* First-Run Onboarding & Route Editor Setup Modal (STORY-7, FIX-CHANGE-ROUTE) */}
      <SetupModal
        isOpen={isSetupOpen}
        onComplete={handleSetupComplete}
        onClose={() => setIsSetupOpen(false)}
        initialFrom={commuteInput.originAddress || origin?.name}
        initialTo={commuteInput.destinationAddress || destination?.name}
        initialStep={setupInitialStep}
        isFirstRun={!hasCompletedSetup}
      />
    </div>
  );
}