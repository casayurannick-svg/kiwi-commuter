'use client';

import { ArbitrageResult, CalculationMode, CommuteInput } from '@/types';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import {
  Bus,
  Car,
  Clock,
  Coins,
  Fuel,
  Info,
  Leaf,
  ParkingCircle,
  ShieldCheck,
  Ship,
  Train,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import MiniReceipt from './MiniReceipt';
import Tooltip from './Tooltip';

interface ComparisonCardProps {
  arbitrage: ArbitrageResult;
  input: CommuteInput;
  calculationMode?: CalculationMode;
  onCalculationModeChange?: (mode: CalculationMode) => void;
}

export default function ComparisonCard({
  arbitrage,
  input,
  calculationMode: propCalculationMode,
  onCalculationModeChange,
}: ComparisonCardProps) {
  const [localMode, setLocalMode] = useState<CalculationMode>(
    propCalculationMode || input.calculationMode || 'FUEL'
  );

  useEffect(() => {
    if (propCalculationMode) {
      setLocalMode(propCalculationMode);
    } else if (input.calculationMode) {
      setLocalMode(input.calculationMode);
    }
  }, [propCalculationMode, input.calculationMode]);

  const activeMode = propCalculationMode || localMode;

  const handleToggleMode = (newMode: CalculationMode) => {
    setLocalMode(newMode);
    onCalculationModeChange?.(newMode);
  };

  const activeArbitrage = useMemo(() => {
    if (activeMode === (input.calculationMode || 'FUEL')) {
      return arbitrage;
    }
    return calculateCommuteArbitrage({ ...input, calculationMode: activeMode });
  }, [arbitrage, input, activeMode]);

  const { driving, transit, co2SavedMonthlyKg, timeMetrics } = activeArbitrage;
  const passengers = Math.max(1, input.carpoolPassengers || transit.passengers || 1);

  // BUG-54: Derive transport mode label and icon dynamically by inspecting the mode types
  // of the actual legs in the returned route array, rather than relying on URL transitMode parameter.
  const transitModeInfo = useMemo(() => {
    if (transit.primaryMode === 'E-Bike' || input.transitMode === 'EBIKE') {
      return { mode: 'E-Bike', label: 'E-Bike', isEbike: true, isFerry: false, isTrain: false, isBus: false };
    }

    const actualTransitLeg = activeArbitrage.journeyLegs?.find((l) => l.type === 'TRANSIT');
    const returnedSteps = input.transitSteps ?? actualTransitLeg?.transitSteps;
    const hasReturnedSteps = Array.isArray(returnedSteps) && returnedSteps.length > 0;

    if (hasReturnedSteps) {
      const hasFerry = returnedSteps.some(
        (s) =>
          s.travelMode === 'FERRY' ||
          s.vehicleType === 'FERRY' ||
          s.line?.toLowerCase().includes('ferry') ||
          s.line?.toUpperCase() === 'DEV' ||
          s.departureStop?.toLowerCase().includes('wharf') ||
          s.arrivalStop?.toLowerCase().includes('wharf') ||
          s.departureStop?.toLowerCase().includes('ferry') ||
          s.arrivalStop?.toLowerCase().includes('ferry')
      );

      if (hasFerry) {
        return { mode: 'Ferry', label: 'AT HOP Ferry', isEbike: false, isFerry: true, isTrain: false, isBus: false };
      }

      const hasTrain = returnedSteps.some(
        (s) => s.travelMode === 'TRAIN' || s.vehicleType === 'TRAIN' || s.line?.toLowerCase().includes('train')
      );
      if (hasTrain) {
        return { mode: 'Train', label: 'AT HOP Train', isEbike: false, isFerry: false, isTrain: true, isBus: false };
      }

      // If actual steps exist and none are ferry or train, it is strictly an all-bus route!
      return { mode: 'Bus', label: 'AT HOP Transit', isEbike: false, isFerry: false, isTrain: false, isBus: true };
    }

    // Fall back to actual transit leg mode or transit.primaryMode when no detailed steps array is available
    if (actualTransitLeg?.mode === 'FERRY' || transit.primaryMode === 'Ferry') {
      return { mode: 'Ferry', label: 'AT HOP Ferry', isEbike: false, isFerry: true, isTrain: false, isBus: false };
    }
    if (actualTransitLeg?.mode === 'TRAIN' || transit.primaryMode === 'Train') {
      return { mode: 'Train', label: 'AT HOP Train', isEbike: false, isFerry: false, isTrain: true, isBus: false };
    }
    return { mode: 'Bus', label: 'AT HOP Transit', isEbike: false, isFerry: false, isTrain: false, isBus: true };
  }, [transit.primaryMode, input.transitMode, input.transitSteps, activeArbitrage.journeyLegs]);

  // BUG-43: E-Bike and E-Scooter are single-rider — suppress (X pax) badges for these modes.
  const isEbikeOrScooterMode =
    transitModeInfo.isEbike ||
    input.transitMode === 'MICROMOBILITY_TRANSIT' ||
    input.transitMode === 'Scooter & Ride' ||
    input.transitMode === 'Scooter & Transit';
  const showPaxBadge = !isEbikeOrScooterMode && passengers > 1;

  const delta = Math.round(Math.abs(driving.monthlyTotal - transit.monthlyTotal));
  const annualDelta = Math.round(delta * 12);
  const isTransitCheaper = transit.monthlyTotal < driving.monthlyTotal;
  const isDrivingCheaper = driving.monthlyTotal < transit.monthlyTotal;
  const isBreakEven = delta < 1;

  let headline = 'Costs are roughly identical';
  let subline = 'Both commute options cost about the same each month.';
  let headlineColor = 'text-zinc-100';
  const badgeLabel = 'MONTHLY SUMMARY';
  let badgeColor = 'text-zinc-400 bg-zinc-800/60 border-zinc-700';

  if (isTransitCheaper && !isBreakEven) {
    const modeLabel = transitModeInfo.isEbike ? 'an E-Bike' : transitModeInfo.isFerry ? 'the ferry' : 'public transport';
    headline = `You save $${delta}/month on ${modeLabel}`;
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to driving`;
    headlineColor = 'text-emerald-400';
    badgeColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
  } else if (isDrivingCheaper && !isBreakEven) {
    headline = `You save $${delta}/month driving`;
    const altModeLabel = transitModeInfo.isEbike ? 'an E-Bike' : transitModeInfo.isFerry ? 'the ferry' : 'public transport';
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to ${altModeLabel}`;
    headlineColor = 'text-amber-400';
    badgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/30';
  }

  // Time saving comparison: difference in one-way commute duration
  const monthlyHoursSaved = Math.abs(timeMetrics?.monthlyTimeDeltaHours ?? 0);
  const oneWayDrive = timeMetrics?.oneWayDriveMinutes ?? activeArbitrage.drivingTimeMins;
  const oneWayTransit = timeMetrics?.oneWayTransitMinutes ?? activeArbitrage.transitTimeMins;
  const isDriveFaster = oneWayDrive < oneWayTransit;
  const isTransitFaster = oneWayTransit < oneWayDrive;
  const oneWayTimeDelta = Math.abs(oneWayTransit - oneWayDrive);

  const timeBadgeLabel = isDriveFaster
    ? `⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo driving`
    : isTransitFaster
    ? `⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo on transit`
    : `⚡ Same commute time`;

  // US-34: Dynamic Trade-off Badge Calculation
  let tradeoffBadgeText = '';
  let tradeoffBadgeColor = '';

  if (isBreakEven) {
    if (oneWayTimeDelta === 0) {
      tradeoffBadgeText = '⚖️ Identical Cost & Travel Time';
      tradeoffBadgeColor = 'text-slate-300 bg-slate-800/80 border-slate-700';
    } else if (isDriveFaster) {
      tradeoffBadgeText = `⚖️ Similar Cost · Drive is ${oneWayTimeDelta}m faster`;
      tradeoffBadgeColor = 'text-slate-300 bg-slate-800/80 border-slate-700';
    } else {
      tradeoffBadgeText = `⚖️ Similar Cost · Transit is ${oneWayTimeDelta}m faster`;
      tradeoffBadgeColor = 'text-slate-300 bg-slate-800/80 border-slate-700';
    }
  } else if (isTransitCheaper) {
    if (isTransitFaster) {
      tradeoffBadgeText = oneWayTimeDelta === 0
        ? `⚡ Win-Win: Saves $${delta}/mo on transit (same travel time)`
        : `⚡ Win-Win: Saves $${delta}/mo & ${oneWayTimeDelta}m faster on transit`;
      tradeoffBadgeColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40';
    } else if (isDriveFaster) {
      tradeoffBadgeText = `⚖️ Trade-off: Save $${delta}/mo (+${oneWayTimeDelta}m travel time)`;
      tradeoffBadgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
    } else {
      tradeoffBadgeText = `⚡ Win-Win: Saves $${delta}/mo on transit (same travel time)`;
      tradeoffBadgeColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40';
    }
  } else {
    // isDrivingCheaper
    if (isDriveFaster) {
      tradeoffBadgeText = oneWayTimeDelta === 0
        ? `⚡ Win-Win: Drive saves $${delta}/mo (same travel time)`
        : `⚡ Win-Win: Drive saves $${delta}/mo & ${oneWayTimeDelta}m faster`;
      tradeoffBadgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
    } else if (isTransitFaster) {
      tradeoffBadgeText = `⚖️ Trade-off: Save $${delta}/mo driving (+${oneWayTimeDelta}m drive time)`;
      tradeoffBadgeColor = 'text-sky-300 bg-sky-500/20 border-sky-500/40';
    } else {
      tradeoffBadgeText = `⚡ Win-Win: Drive saves $${delta}/mo (same travel time)`;
      tradeoffBadgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/40';
    }
  }

  return (
    <div className="space-y-3">
      {/* Hero Arbitrage Banner (Clean Minimalist Metrics & Hero Split UI) */}
      <div
        className={`glass-panel rounded-2xl p-3.5 sm:p-4 border transition-all ${
          isTransitCheaper && !isBreakEven
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-900/95'
            : isDrivingCheaper && !isBreakEven
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-900/95'
            : 'border-slate-700 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/95'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3.5 border-b border-slate-800/80">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeColor}`}
              >
                {isTransitCheaper && !isBreakEven ? (
                  <TrendingDown className="w-3 h-3" />
                ) : isDrivingCheaper && !isBreakEven ? (
                  <TrendingUp className="w-3 h-3" />
                ) : null}
                {badgeLabel}
              </span>
              {/* Dynamic Trade-off Badge (US-34) */}
              <span
                data-testid="tradeoff-badge"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${tradeoffBadgeColor}`}
              >
                {tradeoffBadgeText}
              </span>
              {transit.isHopCapApplied && transit.primaryMode !== 'E-Bike' && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {showPaxBadge ? `$${50 * passengers}/wk Cap (${passengers} pax)` : '$50/wk Cap'}
                </span>
              )}
            </div>

            {/* Large metric headline & plain-language subline */}
            <div>
              <div className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums ${headlineColor}`}>
                {headline}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">
                {subline}
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges (Single Row on Mobile) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs">
            <div className="bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl text-left">
              <span className="text-[10px] text-slate-400 block font-medium">Annual Delta</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isTransitCheaper && !isBreakEven
                    ? 'text-emerald-400'
                    : isDrivingCheaper && !isBreakEven
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                {isBreakEven
                  ? '$0/yr'
                  : `${isTransitCheaper ? '+' : '-'}$${annualDelta.toLocaleString('en-NZ')}/yr`}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">CO₂ Saved</span>
                <span className="text-xs font-bold text-slate-200 tabular-nums">{co2SavedMonthlyKg} kg/mo</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Travel Time</span>
                <span className="text-xs font-bold text-slate-200 tabular-nums">{timeBadgeLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* US-34: Hero Summary Split UI (Two-Column Side-by-Side Comparison) */}
        <div className="relative pt-3 pb-1">
          {/* Desktop "VS" badge centered between columns */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center justify-center w-7 h-7 rounded-full bg-slate-950 border border-slate-700/80 text-[10px] font-black text-slate-400 shadow-lg">
            VS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="hero-split-grid">
            {/* Drive Summary Panel */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                isDrivingCheaper && !isBreakEven
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : 'bg-slate-950/40 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-800/90 text-sky-400 rounded-lg">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Private Vehicle</span>
                    <span className="text-[10px] text-slate-400">
                      {oneWayDrive} mins one-way • {driving.distanceRoundTripKm} km/day
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-rose-400 tabular-nums block leading-tight">
                    ${driving.monthlyTotal.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-400">/mo (${driving.dailyTotal.toFixed(2)}/day)</span>
                </div>
              </div>

              {/* Quick cost drivers */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                {activeMode === 'IRD_TRUE_COST' ? (
                  <span className="truncate">IRD Rate: ${(driving.monthlyIrdCost ?? driving.monthlyTotal).toFixed(0)}</span>
                ) : (
                  <span className="truncate">Fuel: ${driving.monthlyFuelCost.toFixed(0)}</span>
                )}
                {driving.monthlyParkingCost > 0 && (
                  <span className="truncate">Parking: ${driving.monthlyParkingCost.toFixed(0)}</span>
                )}
                {activeMode !== 'IRD_TRUE_COST' && driving.monthlyRucCost > 0 && (
                  <span className="truncate">RUC: ${driving.monthlyRucCost.toFixed(0)}</span>
                )}
                {activeMode !== 'IRD_TRUE_COST' && ((driving.monthlyFixedCosts ?? driving.monthlyFixedCost ?? 0) > 0) && (
                  <span className="truncate">Fixed: ${(driving.monthlyFixedCosts ?? driving.monthlyFixedCost ?? 0).toFixed(0)}</span>
                )}
                <span>${driving.weeklyTotal.toFixed(0)}/wk</span>
              </div>
            </div>

            {/* Transit Summary Panel */}
            <div
              data-testid="at-hop-transit-summary"
              className={`p-3 rounded-xl border transition-all ${
                isTransitCheaper && !isBreakEven
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-950/40 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-500/30">
                    {transitModeInfo.isEbike ? (
                      <span className="text-sm">🚲</span>
                    ) : transitModeInfo.isFerry ? (
                      <Ship className="w-4 h-4" />
                    ) : transitModeInfo.isTrain ? (
                      <Train className="w-4 h-4" />
                    ) : (
                      <Bus className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {transitModeInfo.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {oneWayTransit} mins one-way • {transitModeInfo.isEbike ? 'Active Commute' : `${transitModeInfo.mode}`}
                    </span>
                  </div>
                </div>
                 <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-emerald-400 tabular-nums block leading-tight">
                    ${transit.monthlyTotal.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    /mo (${transit.dailyFare.toFixed(2)}/day{showPaxBadge ? ` · ${passengers} pax` : ''})
                  </span>
                </div>
              </div>

              {/* Quick cost drivers */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span data-testid="single-fare-value">
                  Single: ${transit.singleTripConcessionFare.toFixed(2)}
                  {showPaxBadge && ` (${passengers} pax)`}
                </span>
                <span>
                  {transit.primaryMode === 'E-Bike'
                    ? 'Zero fares'
                    : transit.isHopCapApplied
                    ? (showPaxBadge ? `$${50 * passengers} cap (${passengers}x)` : '$50 cap active')
                    : (showPaxBadge ? `Under $${50 * passengers} cap` : 'Under $50 cap')}
                </span>
                <span data-testid="weekly-transit-cost">${transit.weeklyTotal.toFixed(2)}/wk</span>
              </div>
            </div>
          </div>
        </div>

        {/* US-16: Time Valuation Balance Sheet ("Mini-Receipt") & US-11: E-Bike Breakeven Alert */}
        {/*
          Time Valuation (${hourlyTimeValue}/hr)
          Cash Saved
          Time Cost (Slower commute)
          Your True Benefit
        */}
        <MiniReceipt arbitrage={activeArbitrage} input={{ ...input, calculationMode: activeMode }} />
      </div>

      {/* Side-by-Side Breakdown Cards (Tight List Items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* DRIVING CARD */}
        <div className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-800 text-sky-400 rounded-lg">
                <Car className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">Private Vehicle</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-rose-400 tabular-nums">
                ${driving.monthlyTotal.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400 block">/mo</span>
            </div>
          </div>

          {/* FEAT-60: IRD True Cost Mileage Mode Toggle */}
          <div className="flex items-center justify-between py-1.5 px-2.5 bg-slate-900/70 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-300">
                IRD True Cost
              </span>
              <Tooltip
                avoidCollisions={true}
                align="start"
                content="Includes depreciation, WOF, Rego, maintenance, and insurance."
              >
                <button
                  type="button"
                  aria-label="IRD True Cost info"
                  className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 focus:outline-none focus:text-slate-200"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </button>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 font-medium">
                {activeMode === 'IRD_TRUE_COST' ? 'IRD Rate' : 'Fuel Only'}
              </span>
              <button
                type="button"
                role="switch"
                data-testid="ird-mode-toggle"
                aria-checked={activeMode === 'IRD_TRUE_COST'}
                aria-label="Toggle IRD True Cost mode"
                onClick={() =>
                  handleToggleMode(activeMode === 'IRD_TRUE_COST' ? 'FUEL' : 'IRD_TRUE_COST')
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  activeMode === 'IRD_TRUE_COST' ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    activeMode === 'IRD_TRUE_COST' ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Tight List Items */}
          <div className="space-y-1.5 text-xs">
            {activeMode === 'IRD_TRUE_COST' ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Coins className="w-3 h-3 text-emerald-400" />
                    IRD Mileage ($1.20/km):
                  </span>
                  <span className="font-semibold text-slate-200 tabular-nums">
                    ${(driving.monthlyIrdCost ?? driving.monthlyTotal).toFixed(0)}/mo
                  </span>
                </div>

                {driving.monthlyParkingCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ParkingCircle className="w-3 h-3 text-sky-400" />
                      Parking:
                    </span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      ${driving.monthlyParkingCost.toFixed(0)}/mo
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Fuel className="w-3 h-3 text-amber-400" />
                    Fuel:
                  </span>
                  <span className="font-semibold text-slate-200 tabular-nums">
                    ${driving.monthlyFuelCost.toFixed(0)}/mo
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-amber-400" />
                    RUC ({driving.dailyRucCost > 0 ? (input.powertrain === 'PHEV' || input.power === 'PHEV' || input.vehicleType === 'phev' ? '$0.038/km' : '$0.076/km') : 'Exempt'}):
                  </span>
                  <span className="font-semibold text-slate-200 tabular-nums">
                    {driving.monthlyRucCost > 0 ? `$${driving.monthlyRucCost.toFixed(0)}/mo` : '$0'}
                  </span>
                </div>

                {/* US-38: Fixed Ownership Costs (WOF, Rego, Insurance) */}
                {((driving.monthlyFixedCosts ?? driving.monthlyFixedCost ?? 0) > 0) && (
                  <div className="flex items-center justify-between" data-testid="fixed-costs-line-item">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      Fixed Costs (Ins/Rego/WOF):
                    </span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      ${(driving.monthlyFixedCosts ?? driving.monthlyFixedCost ?? 0).toFixed(0)}/mo
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <ParkingCircle className="w-3 h-3 text-sky-400" />
                    Parking:
                  </span>
                  <span className="font-semibold text-slate-200 tabular-nums">
                    ${driving.monthlyParkingCost.toFixed(0)}/mo
                  </span>
                </div>

                {input.includeMaintenanceWear && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Coins className="w-3 h-3 text-slate-400" />
                      Wear & WOF:
                    </span>
                    <span className="font-semibold text-slate-200 tabular-nums">
                      ${driving.monthlyMaintenanceCost.toFixed(0)}/mo
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{driving.distanceRoundTripKm} km daily</span>
            <span className="tabular-nums">Weekly: ${driving.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>

        {/* TRANSIT CARD */}
        <div className="glass-panel rounded-2xl p-3.5 sm:p-4 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-950/60 text-emerald-400 rounded-lg border border-emerald-500/30">
                {transitModeInfo.isEbike ? (
                  <span className="text-sm">🚲</span>
                ) : transitModeInfo.isFerry ? (
                  <Ship className="w-4 h-4" />
                ) : transitModeInfo.isTrain ? (
                  <Train className="w-4 h-4" />
                ) : (
                  <Bus className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-bold text-white">
                {transitModeInfo.label}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-400 tabular-nums">
                ${transit.monthlyTotal.toFixed(0)}
              </span>
              <span className="text-[10px] text-slate-400 block">/mo</span>
            </div>
          </div>

          {/* Tight List Items */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                {transit.primaryMode === 'E-Bike' ? 'Energy / Trip:' : 'Single Fare:'}
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                ${transit.singleTripConcessionFare.toFixed(2)}
                {showPaxBadge && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({passengers} pax)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                {transit.primaryMode === 'E-Bike' ? 'Daily Energy:' : 'Daily Return (2x):'}
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                ${transit.dailyFare.toFixed(2)}
                {showPaxBadge && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    ({passengers} pax)
                  </span>
                )}
              </span>
            </div>

{transit.primaryMode !== 'E-Bike' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AT HOP Cap:</span>
                <span className="font-semibold text-emerald-300 tabular-nums">
                  {transit.isHopCapApplied
                    ? (showPaxBadge ? `$${50 * passengers}/wk (${passengers}x $50)` : '$50/wk applied')
                    : `$${transit.weeklyTotal.toFixed(2)}/wk`}
                </span>
              </div>
            )}

{!transitModeInfo.isEbike && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Corridor:</span>
              <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                {transitModeInfo.isFerry
                  ? (input.isWaihekeRoute || input.originSuburbId === 'waiheke' ? 'Waiheke Ferry' : 'Inner Harbour Ferry')
                  : `Zone ${transit.zoneCount} • ${transitModeInfo.mode}`}
              </span>
            </div>
          )}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>
              {transit.primaryMode === 'E-Bike'
                ? 'E-Bike energy cost'
                : transit.isHopCapApplied
                ? (passengers > 1 ? `Capped fare active ($${50 * passengers}/wk)` : 'Capped fare active')
                : (passengers > 1 ? `Under $${50 * passengers} cap` : 'Under $50 cap')}
            </span>
            <span className="tabular-nums">Weekly: ${transit.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
