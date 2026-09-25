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

  return (
    <div className="space-y-6">
      {/* Hero Arbitrage Banner */}
      <div
        className={`glass-panel-elevated rounded-2xl p-6 border relative overflow-hidden transition-all duration-300 ${
          isTransitWinner
            ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/40 shadow-emerald-950/30'
            : 'border-sky-500/50 bg-gradient-to-br from-sky-950/40 via-slate-900/90 to-blue-950/40'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs uppercase font-extrabold tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                  isTransitWinner
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
              >
                {isTransitWinner ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                Monthly Cost Arbitrage
              </span>
              {transit.isHopCapApplied && (
                <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  $50 7-Day Cap Active
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              {isTransitWinner ? (
                <span>
                  Save <span className="text-emerald-400">${monthlySavings.toLocaleString('en-NZ')}</span> / month on Public Transport
                </span>
              ) : (
                <span>
                  Driving is <span className="text-sky-400">${Math.abs(monthlySavings).toLocaleString('en-NZ')}</span> / month cheaper
                </span>
              )}
            </h3>

            <p className="text-sm text-slate-300 max-w-xl">
              {arbitrage.arbitrageTagline}
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap md:flex-col gap-3 justify-end shrink-0">
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-4 py-2.5 text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Annual Financial Delta</span>
              <span
                className={`text-xl font-black ${
                  isTransitWinner ? 'text-emerald-400' : 'text-sky-400'
                }`}
              >
                {isTransitWinner ? '+' : '-'}${Math.abs(annualSavings).toLocaleString('en-NZ')} / yr
              </span>
            </div>

            <div className="flex gap-2">
              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">CO₂ Cut</span>
                  <span className="text-xs font-bold text-slate-200">{co2SavedMonthlyKg} kg/mo</span>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block">Productive Time</span>
                  <span className="text-xs font-bold text-slate-200">{hoursReclaimedMonthly} hrs/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* DRIVING CARD */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-700/70 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-800 text-sky-400 rounded-xl">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Private Vehicle</h4>
                  <span className="text-xs text-slate-400">
                    {driving.distanceRoundTripKm} km round-trip daily
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Monthly Total</span>
                <span className="text-xl font-black text-rose-400">
                  ${driving.monthlyTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Driving Cost Items */}
            <div className="space-y-3 pt-4 text-sm">
              {/* Fuel */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <span>Fuel / Energy</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-100">${driving.monthlyFuelCost.toFixed(2)}</span>
                  <span className="text-[11px] text-slate-500 block">
                    ${driving.dailyFuelCost.toFixed(2)} / day
                  </span>
                </div>
              </div>

              {/* RUC */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>NZTA RUC (Road User Charges)</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-100">
                    ${driving.monthlyRucCost.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {driving.dailyRucCost > 0 ? `$${driving.dailyRucCost.toFixed(2)} / day` : 'Exempt / at pump'}
                  </span>
                </div>
              </div>

              {/* Parking */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <ParkingCircle className="w-4 h-4 text-sky-400" />
                  <span>Auckland CBD Parking</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-slate-100">
                    ${driving.monthlyParkingCost.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    ${driving.dailyParkingCost.toFixed(2)} / day
                  </span>
                </div>
              </div>

              {/* Maintenance */}
              {input.includeMaintenanceWear && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Coins className="w-4 h-4 text-slate-400" />
                    <span>NZ AA Wear, WOF & Tires</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-100">
                      ${driving.monthlyMaintenanceCost.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      ${driving.dailyMaintenanceCost.toFixed(2)} / day
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Weekly: <strong>${driving.weeklyTotal.toFixed(2)}</strong></span>
            <span>Annual: <strong>${driving.annualTotal.toFixed(0)}</strong></span>
          </div>
        </div>

        {/* TRANSIT CARD */}
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/40 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Auckland Transport (AT HOP)</h4>
                  <span className="text-xs text-emerald-400 font-medium">
                    {transit.zoneCount} {transit.zoneCount === 1 ? 'Zone' : 'Zones'} • {transit.primaryMode}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Monthly Total</span>
                <span className="text-xl font-black text-emerald-400">
                  ${transit.monthlyTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Transit Cost Items */}
            <div className="space-y-3 pt-4 text-sm">
              {/* Single trip */}
              <div className="flex items-center justify-between">
                <div className="text-slate-300">Single Journey Fare</div>
                <div className="text-right">
                  <span className="font-semibold text-slate-100">
                    ${transit.singleTripConcessionFare.toFixed(2)}
                  </span>
                  {transit.singleTripConcessionFare < transit.singleTripStandardFare && (
                    <span className="text-[11px] text-emerald-400 line-through block">
                      ${transit.singleTripStandardFare.toFixed(2)} std
                    </span>
                  )}
                </div>
              </div>

              {/* Daily Fare */}
              <div className="flex items-center justify-between">
                <div className="text-slate-300">Daily Return (2 Trips)</div>
                <span className="font-semibold text-slate-100">${transit.dailyFare.toFixed(2)}</span>
              </div>

              {/* AT 7-Day Cap Benefit */}
              <div className="p-3 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    AT 7-Day $50 Fare Cap
                  </span>
                  <span className="text-xs font-bold text-white">
                    ${transit.weeklyTotal.toFixed(2)} / wk
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {transit.isHopCapApplied ? (
                    <span className="text-emerald-300 font-medium">
                      Cap applied! Saves ${(transit.uncappedWeeklyFare - 50).toFixed(2)}/week over uncapped fares.
                    </span>
                  ) : (
                    <span>
                      Travels within standard cap. Cap automatically activates at $50/week.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Weekly Capped: <strong>${transit.weeklyTotal.toFixed(2)}</strong></span>
            <span>Annual: <strong>${transit.annualTotal.toFixed(0)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
