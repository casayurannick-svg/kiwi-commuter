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
import MiniReceipt from './MiniReceipt';

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
    const modeLabel = arbitrage.transit.primaryMode === 'E-Bike' ? 'an E-Bike' : 'public transport';
    headline = `You save $${delta}/month on ${modeLabel}`;
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to driving`;
    headlineColor = 'text-emerald-400';
    badgeColor = 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
  } else if (isDrivingCheaper && !isBreakEven) {
    headline = `You save $${delta}/month driving`;
    const altModeLabel = arbitrage.transit.primaryMode === 'E-Bike' ? 'an E-Bike' : 'public transport';
    subline = `Save $${annualDelta.toLocaleString('en-NZ')}/year compared to ${altModeLabel}`;
    headlineColor = 'text-amber-400';
    badgeColor = 'text-amber-300 bg-amber-500/20 border-amber-500/30';
  }

  // Time saving comparison: difference in one-way commute duration
  const monthlyHoursSaved = Math.abs(timeMetrics?.monthlyTimeDeltaHours ?? 0);
  const oneWayDrive = timeMetrics?.oneWayDriveMinutes ?? arbitrage.drivingTimeMins;
  const oneWayTransit = timeMetrics?.oneWayTransitMinutes ?? arbitrage.transitTimeMins;
  const isDriveFaster = oneWayDrive < oneWayTransit;
  const isTransitFaster = oneWayTransit < oneWayDrive;

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
              {transit.isHopCapApplied && transit.primaryMode !== 'E-Bike' && (
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

        {/* US-16: Time Valuation Balance Sheet ("Mini-Receipt") & US-11: E-Bike Breakeven Alert */}
        {/*
          Time Valuation (${hourlyTimeValue}/hr)
          Cash Saved
          Time Cost (Slower commute)
          Your True Benefit
        */}
        <MiniReceipt arbitrage={arbitrage} input={input} />
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
                {transit.primaryMode === 'E-Bike' ? (
                  <span className="text-sm">🚲</span>
                ) : (
                  <Bus className="w-4 h-4" />
                )}
              </div>
              <span className="text-sm font-bold text-white">
                {transit.primaryMode === 'E-Bike' ? 'E-Bike' : 'AT HOP Transit'}
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
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                {transit.primaryMode === 'E-Bike' ? 'Daily Energy:' : 'Daily Return (2x):'}
              </span>
              <span className="font-semibold text-slate-200 tabular-nums">
                ${transit.dailyFare.toFixed(2)}
              </span>
            </div>

{transit.primaryMode !== 'E-Bike' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AT HOP Cap:</span>
                <span className="font-semibold text-emerald-300 tabular-nums">
                  {transit.isHopCapApplied ? '$50/wk applied' : `$${transit.weeklyTotal.toFixed(2)}/wk`}
                </span>
              </div>
            )}

{transit.primaryMode !== 'E-Bike' && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Corridor:</span>
              <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                Zone {transit.zoneCount} • {transit.primaryMode}
              </span>
            </div>
          )}
          </div>

          <div className="pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{transit.primaryMode === 'E-Bike' ? 'E-Bike energy cost' : (transit.isHopCapApplied ? 'Capped fare active' : 'Under $50 cap')}</span>
            <span className="tabular-nums">Weekly: ${transit.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
