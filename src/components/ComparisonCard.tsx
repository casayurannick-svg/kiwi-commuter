'use client';

import { ArbitrageResult, CommuteInput } from '@/types';
import {
  Bus,
  Car,
  Clock,
  Coins,
  Fuel,
  Leaf,
  ParkingCircle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React from 'react';

interface ComparisonCardProps {
  arbitrage: ArbitrageResult;
  input: CommuteInput;
}
export default function ComparisonCard({ arbitrage, input }: ComparisonCardProps) {
  const { driving, transit, co2SavedMonthlyKg, timeMetrics } = arbitrage;

  const delta = Math.round(Math.abs(driving.monthlyTotal - transit.monthlyTotal));
  const annualDelta = Math.round(delta * 12);
  const isTransitCheaper = transit.monthlyTotal < driving.monthlyTotal;
  const isDrivingCheaper = driving.monthlyTotal < transit.monthlyTotal;
  const isBreakEven = delta < 1;

  let headline = 'Costs are roughly identical';
  let subline = 'Both commute options cost about the same each month.';
  let headlineColor = 'text-zinc-100';
  const badgeLabel = 'MONTHLY VERDICT';
  let badgeColor = 'text-zinc-400 bg-zinc-800/60 border-zinc-700';

  if (isTransitCheaper && !isBreakEven) {
    headline = `You save $${delta}/month on public transport`;
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to driving`;
    headlineColor = 'text-emerald-400';
    badgeColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
  } else if (isDrivingCheaper && !isBreakEven) {
    headline = `You save $${delta}/month driving`;
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to public transport`;
    headlineColor = 'text-amber-400';
    badgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/30';
  }

  // US-16: Time Valuation Mini-Receipt Balance Sheet calculations
  const hourlyTimeValue = input.hourlyTimeValue ?? 0;
  const cashDelta = delta;
  const monthlyHoursSaved = Math.abs(timeMetrics?.monthlyTimeDeltaHours ?? 0);
  const monetizedTimeCost = Math.round(
    Math.abs(timeMetrics?.monetizedMonthlyTimeCost ?? (monthlyHoursSaved * hourlyTimeValue))
  );

  // Time saving comparison: difference in one-way commute duration
  const oneWayDrive = timeMetrics?.oneWayDriveMinutes ?? arbitrage.drivingTimeMins;
  const oneWayTransit = timeMetrics?.oneWayTransitMinutes ?? arbitrage.transitTimeMins;
  const isDriveFaster = oneWayDrive < oneWayTransit;
  const isTransitFaster = oneWayTransit < oneWayDrive;

  // Determine if the financially winning mode is slower or faster
  let isWinningModeSlower = false;
  let isWinningModeFaster = false;
  if (isTransitCheaper) {
    isWinningModeSlower = isDriveFaster; // driving is faster => transit is slower
    isWinningModeFaster = isTransitFaster; // transit is faster
  } else if (isDrivingCheaper) {
    isWinningModeSlower = isTransitFaster; // transit is faster => driving is slower
    isWinningModeFaster = isDriveFaster; // driving is faster
  }

  const trueBenefit = isWinningModeSlower
    ? cashDelta - monetizedTimeCost
    : isWinningModeFaster
    ? cashDelta + monetizedTimeCost
    : cashDelta;

  const timeBadgeLabel = isDriveFaster
    ? `⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo driving`
    : isTransitFaster
    ? `⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo on transit`
    : `⚡ Same commute time`;

  return (
    <div className="space-y-3">
      {/* Hero Arbitrage Banner (Clean Minimalist Metrics) */}
      <div
        className={`glass-panel rounded-2xl p-3.5 sm:p-4 border transition-all ${
          isTransitCheaper && !isBreakEven
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-900/95'
            : isDrivingCheaper && !isBreakEven
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-900/95'
            : 'border-slate-700 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/95'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
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
              {transit.isHopCapApplied && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  $50/wk Cap
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

        {/* US-16: Time Valuation Balance Sheet ("Mini-Receipt") */}
        {hourlyTimeValue > 0 && (
          <div className="mt-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 sm:p-4 text-sm">
            <h4 className="text-zinc-400 mb-2 font-medium flex items-center gap-1.5">
              <span>⏱️ Time Valuation (${hourlyTimeValue}/hr)</span>
            </h4>
            <div className="space-y-1.5">
              {/* Row 1: Cash Saved */}
              <div className="flex justify-between items-center tabular-nums">
                <span className="text-zinc-300">Cash Saved</span>
                <span className="text-zinc-100 font-semibold">+${cashDelta}</span>
              </div>

              {/* Row 2: Time Impact */}
              <div className="flex justify-between items-center tabular-nums">
                {isWinningModeSlower ? (
                  <>
                    <span className="text-zinc-300">Time Cost (Slower commute)</span>
                    <span className="text-rose-400 font-semibold">-${monetizedTimeCost}</span>
                  </>
                ) : isWinningModeFaster ? (
                  <>
                    <span className="text-zinc-300">Time Gained (Faster commute)</span>
                    <span className="text-emerald-400 font-semibold">+${monetizedTimeCost}</span>
                  </>
                ) : (
                  <>
                    <span className="text-zinc-300">Time Impact (Same commute time)</span>
                    <span className="text-zinc-400 font-semibold">$0</span>
                  </>
                )}
              </div>

              {/* Row 3: True Benefit */}
              <div className="border-t border-zinc-800/80 pt-2 mt-2 font-medium flex justify-between items-center tabular-nums">
                <span className="text-zinc-200">Your True Benefit</span>
                <span
                  className={
                    trueBenefit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                  }
                >
                  {trueBenefit >= 0 ? '+' : '-'}${Math.abs(Math.round(trueBenefit))} /mo
                </span>
              </div>
            </div>
          </div>
        )}
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

          {/* Tight List Items */}
          <div className="space-y-1.5 text-xs">
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
                RUC ({driving.dailyRucCost > 0 ? '$0.076/km' : 'Exempt'}):
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                {driving.monthlyRucCost > 0 ? `$${driving.monthlyRucCost.toFixed(0)}/mo` : '$0'}
              </span>
            </div>

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
                <Bus className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-white">AT HOP Transit</span>
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
              <span className="text-slate-400">Single Fare:</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                ${transit.singleTripConcessionFare.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Daily Return (2x):</span>
              <span className="font-semibold text-slate-200 tabular-nums">
                ${transit.dailyFare.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                AT HOP Cap:
              </span>
              <span className="font-semibold text-emerald-300 tabular-nums">
                {transit.isHopCapApplied ? '$50/wk applied' : `$${transit.weeklyTotal.toFixed(2)}/wk`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Corridor:</span>
              <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                Zone {transit.zoneCount} • {transit.primaryMode}
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{transit.isHopCapApplied ? 'Capped fare active' : 'Under $50 cap'}</span>
            <span className="tabular-nums">Weekly: ${transit.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
