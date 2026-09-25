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
  const { driving, transit, monthlySavings, annualSavings, co2SavedMonthlyKg, hoursReclaimedMonthly } =
    arbitrage;

  const isTransitWinner = monthlySavings > 0;
  const absMonthlyDelta = Math.round(Math.abs(monthlySavings));
  const absAnnualDelta = Math.round(Math.abs(annualSavings));

  return (
    <div className="space-y-4">
      {/* Hero Arbitrage Banner (Clean Minimalist Metrics) */}
      <div
        className={`glass-panel rounded-2xl p-5 sm:p-6 border transition-all ${
          isTransitWinner
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/30 via-slate-900/90 to-slate-900/95'
            : 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-slate-900/90 to-slate-900/95'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isTransitWinner
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {isTransitWinner ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                Monthly Arbitrage
              </span>
              {transit.isHopCapApplied && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  $50/wk Cap
                </span>
              )}
            </div>

            {/* Large metric headline */}
            <div className="text-2xl sm:text-3xl font-black tracking-tight tabular-nums">
              {isTransitWinner ? (
                <span className="text-emerald-400">
                  +${absMonthlyDelta.toLocaleString('en-NZ')}/mo with AT Transit
                </span>
              ) : (
                <span className="text-amber-400">
                  +${absMonthlyDelta.toLocaleString('en-NZ')}/mo Driving
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Badges (Single Row on Mobile) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs">
            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl text-left">
              <span className="text-[10px] text-slate-400 block font-medium">Annual Delta</span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  isTransitWinner ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {isTransitWinner ? '+' : '-'}${absAnnualDelta.toLocaleString('en-NZ')}/yr
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">CO₂ Saved</span>
                <span className="text-xs font-bold text-slate-200 tabular-nums">{co2SavedMonthlyKg} kg/mo</span>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Time Gained</span>
                <span className="text-xs font-bold text-slate-200 tabular-nums">{hoursReclaimedMonthly}h/mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Breakdown Cards (Tight List Items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* DRIVING CARD */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
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
          <div className="space-y-2 text-xs">
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

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{driving.distanceRoundTripKm} km daily</span>
            <span className="tabular-nums">Weekly: ${driving.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>

        {/* TRANSIT CARD */}
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
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
          <div className="space-y-2 text-xs">
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

          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{transit.isHopCapApplied ? 'Capped fare active' : 'Under $50 cap'}</span>
            <span className="tabular-nums">Weekly: ${transit.weeklyTotal.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
