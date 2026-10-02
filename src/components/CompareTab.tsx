'use client';

import React, { useMemo, useState } from 'react';
import { CommuteInput, CommuteComparisonResult } from '@/types';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import CostBarChart, { CompareBarItem, CompareTimeframe } from '@/components/CostBarChart';
import { Car, Zap, Bus } from 'lucide-react';

export interface CompareTabProps {
  commuteInput: CommuteInput;
  setCommuteInput?: React.Dispatch<React.SetStateAction<CommuteInput>>;
  arbitrage: CommuteComparisonResult;
  className?: string;
}

/**
 * CompareTab (STORY-5)
 * Side-by-side comparative analysis of Your car, An electric car, and Bus and train.
 * Eliminates mixed cost bases via an explicit "Include costs I'd pay anyway" toggle
 * and timeframe multiplier controls (Weekly, Monthly, Yearly).
 */
export default function CompareTab({
  commuteInput,
  arbitrage,
  className = '',
}: CompareTabProps) {
  const [timeframe, setTimeframe] = useState<CompareTimeframe>('weekly');
  const [includeFixedCosts, setIncludeFixedCosts] = useState<boolean>(false);

  // Extrapolate EV comparison scenario using the single cost model
  const evArbitrage = useMemo(() => {
    return calculateCommuteArbitrage({
      ...commuteInput,
      calculationMode: 'FUEL',
      calcMode: 'FUEL',
      vehicleType: 'bev',
      powertrain: 'BEV',
      power: 'BEV',
      propulsion: 'BEV',
      consumptionOverride: commuteInput.evEfficiency ?? 15,
      fuelPriceOverride: commuteInput.kwhRate ?? 0.33,
    });
  }, [commuteInput]);

  // Timeframe multipliers applied to weekly baseline outputs
  const multiplier =
    timeframe === 'weekly' ? 1 : timeframe === 'monthly' ? 52 / 12 : 52;

  const unitSuffix =
    timeframe === 'weekly' ? ' a week' : timeframe === 'monthly' ? ' a month' : ' a year';

  const unitLabel =
    timeframe === 'weekly' ? 'a week' : timeframe === 'monthly' ? 'a month' : 'a year';

  // Cost Base: When toggle is OFF -> stops.total (avoidable). When ON -> fullCost (stops + stays).
  const carBase = includeFixedCosts ? arbitrage.fullCost : arbitrage.stops.total;
  const evBase = includeFixedCosts ? evArbitrage.fullCost : evArbitrage.stops.total;
  const transitBase = arbitrage.transitCost;

  const carAmount = Math.round(carBase * multiplier * 100) / 100;
  const evAmount = Math.round(evBase * multiplier * 100) / 100;
  const transitAmount = Math.round(transitBase * multiplier * 100) / 100;

  // The three required comparative bars
  const chartItems: CompareBarItem[] = [
    {
      key: 'car',
      label: 'Your car',
      amount: carAmount,
      icon: Car,
      barColor: 'bg-blue-500',
      textColor: 'text-blue-400',
      subtext: includeFixedCosts
        ? `Includes avoidable stops ($${(Math.round(arbitrage.stops.total * multiplier * 100) / 100).toFixed(2)}) + fixed stays ($${(Math.round(arbitrage.stays.total * multiplier * 100) / 100).toFixed(2)})`
        : 'Fuel, RUC (if diesel), parking, and distance wear',
    },
    {
      key: 'ev',
      label: 'An electric car, if you bought one',
      amount: evAmount,
      icon: Zap,
      barColor: 'bg-cyan-400',
      textColor: 'text-cyan-400',
      subtext: includeFixedCosts
        ? `Includes electricity & EV RUC ($${(Math.round(evArbitrage.stops.total * multiplier * 100) / 100).toFixed(2)}) + fixed stays ($${(Math.round(evArbitrage.stays.total * multiplier * 100) / 100).toFixed(2)})`
        : 'Electricity (at off-peak rates), EV RUC ($0.076/km), parking, and distance wear',
    },
    {
      key: 'transit',
      label: 'Bus and train',
      amount: transitAmount,
      icon: Bus,
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      subtext: 'Auckland Transport standard fare or $50 a week rolling cap',
    },
  ];

  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 py-2 ${className}`}>
      {/* 1. Header with exact H2 heading & controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How your options stack up
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Compare recurring operating and ownership costs across transport modes.
          </p>
        </div>

        {/* 2. Timeframe Switch: Weekly | Monthly | Yearly */}
        <div
          role="group"
          aria-label="Cost timeframe selector"
          className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto"
        >
          {(['weekly', 'monthly', 'yearly'] as CompareTimeframe[]).map((t) => {
            const isActive = timeframe === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTimeframe(t)}
                className={`min-h-[32px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold capitalize transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-950'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Unified Cost-Base Toggle: "Include costs I'd pay anyway" */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-white tracking-tight">
              Include costs I&apos;d pay anyway
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Insurance, rego and age depreciation continue whether or not you drive.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          id="toggle-fixed-costs"
          aria-checked={includeFixedCosts}
          onClick={() => setIncludeFixedCosts((prev) => !prev)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16] ${
            includeFixedCosts ? 'bg-emerald-500' : 'bg-slate-700'
          }`}
        >
          <span className="sr-only">Include costs I&apos;d pay anyway</span>
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              includeFixedCosts ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 4. CostBarChart Component */}
      <CostBarChart
        items={chartItems}
        unitSuffix={unitSuffix}
        includeFixedCosts={includeFixedCosts}
      />

      {/* 5. Cost Summary & Copy Rule Enforcement */}
      {includeFixedCosts ? (
        // When toggle is ON: Labeled "What your commute costs in total", NEVER mentioning "savings"
        <div className="p-4 sm:p-5 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <span className="font-semibold text-white">What your commute costs in total: </span>
          <span>
            Driving your car costs ${carAmount.toFixed(2)} {unitLabel}, an electric car costs ${evAmount.toFixed(2)} {unitLabel}, and public transit costs ${transitAmount.toFixed(2)} {unitLabel}. Fixed costs (insurance, registration, warrant of fitness, and depreciation) are apportioned to your regular commute.
          </span>
        </div>
      ) : (
        // When toggle is OFF: Avoidable costs comparison
        <div className="p-4 sm:p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-400">Avoidable Commute Comparison: </span>
          <span>
            Comparing only avoidable costs (fuel, energy, RUC, parking, and distance wear), transit is{' '}
            {carAmount > transitAmount ? (
              <span className="font-semibold text-white">
                ${(carAmount - transitAmount).toFixed(2)} {unitLabel} cheaper than driving
              </span>
            ) : (
              <span className="font-semibold text-white">
                comparable to driving
              </span>
            )}
            . Switching to an electric car reduces avoidable vehicle operating costs by{' '}
            <span className="font-semibold text-cyan-300">
              ${Math.max(0, carAmount - evAmount).toFixed(2)} {unitLabel}
            </span>
            .
          </span>
        </div>
      )}
    </div>
  );
}
