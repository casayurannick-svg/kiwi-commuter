'use client';

import React from 'react';
import { CommuteInput, CommuteComparisonResult, Suburb } from '@/types';
import { FuelBenchmarkDto } from '@/lib/supabase';
import AdvancedRow from '@/components/AdvancedRow';
import EvRoiSandbox from '@/components/EvRoiSandbox';
import FuelRadarWidget from '@/components/FuelRadarWidget';
import CommuteForm from '@/components/CommuteForm';
import JourneyTimeline from '@/components/JourneyTimeline';
import RouteMap from '@/components/RouteMap';
import MonthlySavingsChart from '@/components/MonthlySavingsChart';

export interface AdvancedTabProps {
  commuteInput: CommuteInput;
  setCommuteInput?: React.Dispatch<React.SetStateAction<CommuteInput>>;
  arbitrage: CommuteComparisonResult;
  initialFuelPrices?: FuelBenchmarkDto;
  origin?: Suburb;
  destination?: Suburb;
  className?: string;
}

/**
 * AdvancedTab (STORY-6)
 * Collapsible layered disclosure rows for detailed widgets:
 * 1. "Would an electric car pay off?" (EV ROI Sandbox)
 * 2. "Fuel prices today." (Fuel Radar / MBIE & RUC)
 * 3. "Use your own numbers." (CommuteForm / Custom inputs)
 * 4. "Your trip, step by step." (JourneyTimeline & RouteMap)
 * 5. "What is your time worth?" (STORY-13: Hourly wage / opportunity cost)
 * 6. "How costs add up." (MonthlySavingsChart)
 */
export default function AdvancedTab({
  commuteInput,
  setCommuteInput,
  arbitrage,
  initialFuelPrices,
  origin,
  destination,
  className = '',
}: AdvancedTabProps) {
  return (
    <div className={`w-full max-w-4xl mx-auto space-y-6 py-2 ${className}`}>
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-slate-800/80 pb-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Advanced assumptions &amp; detailed breakdown
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Fine-tune rates, inspect journey legs, and model electric vehicle payback timelines.
        </p>
      </div>

      {/* 6 Collapsible Disclosure Rows (Collapsed by default) */}
      <div className="space-y-4">
        {/* Row 1: EV Sandbox */}
        <AdvancedRow
          id="ev-sandbox"
          title="Would an electric car pay off?"
          hint="Try a price, a trade-in and how long you'd keep it."
          defaultExpanded={false}
        >
          <EvRoiSandbox
            input={commuteInput}
            onChange={setCommuteInput}
          />
        </AdvancedRow>

        {/* Row 2: Fuel Prices & RUC */}
        <AdvancedRow
          id="fuel-prices"
          title="Fuel prices today."
          hint="Pump prices and road user charges."
          defaultExpanded={false}
        >
          <FuelRadarWidget initialFuelData={initialFuelPrices} />
        </AdvancedRow>

        {/* Row 3: Custom Number Inputs */}
        <AdvancedRow
          id="custom-numbers"
          title="Use your own numbers."
          hint="Change fuel, parking and fares."
          defaultExpanded={false}
        >
          <CommuteForm
            input={commuteInput}
            calculationMode={commuteInput.calculationMode}
            onChange={setCommuteInput}
            onInputChange={setCommuteInput}
          />
        </AdvancedRow>

        {/* Row 4: Trip Step by Step & Map */}
        <AdvancedRow
          id="trip-steps"
          title="Your trip, step by step."
          hint="Walking, bus and driving legs."
          defaultExpanded={false}
        >
          <div className="space-y-4">
            <JourneyTimeline
              arbitrage={arbitrage}
              input={commuteInput}
              onFirstMileModeChange={(mode) =>
                setCommuteInput?.((prev) => ({ ...prev, firstMileMode: mode }))
              }
            />
            {origin && destination && (
              <div className="pt-2">
                <RouteMap
                  origin={origin}
                  destination={destination}
                  distanceKm={arbitrage.distanceKm}
                  drivingTimeMins={arbitrage.drivingTimeMins}
                  transitTimeMins={arbitrage.transitTimeMins}
                />
              </div>
            )}
          </div>
        </AdvancedRow>

        {/* Row 5: STORY-13 — Value of your time (hourly wage → opportunity cost) */}
        <AdvancedRow
          id="time-value"
          title="What is your time worth?"
          hint="Quantify the cost of a slower commute."
          defaultExpanded={false}
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              If transit takes longer than driving, enter your hourly wage to see the annual
              dollar value of that extra time. Based on{' '}
              <span className="font-medium text-white">47 active commute weeks</span> per year.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label
                htmlFor="hourly-time-value"
                className="text-sm font-medium text-slate-200 shrink-0"
              >
                Value of your time ($ per hour)
              </label>
              <div className="relative max-w-[180px]">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">
                  $
                </span>
                <input
                  id="hourly-time-value"
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="e.g., 34.25"
                  value={commuteInput.hourlyTimeValue ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = raw === '' ? undefined : parseFloat(raw);
                    setCommuteInput?.((prev) => ({
                      ...prev,
                      hourlyTimeValue: isNaN(parsed as number) ? undefined : parsed,
                    }));
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 pl-7 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  aria-label="Hourly wage for time opportunity cost calculation"
                />
              </div>
            </div>
            {/* Live opportunity cost preview */}
            {arbitrage.timeMetrics && (commuteInput.hourlyTimeValue ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
                {arbitrage.timeMetrics.annualOpportunityCost > 0 ? (
                  <p className="text-xs sm:text-sm text-slate-200">
                    <span className="font-semibold text-amber-400">Time cost: </span>
                    Transit costs you an extra{' '}
                    <span className="font-bold text-white">
                      ${arbitrage.timeMetrics.annualOpportunityCost.toLocaleString('en-NZ', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>{' '}
                    a year in time (
                    {Math.round(arbitrage.timeMetrics.monthlyTimeDeltaHours * 12)} hrs/yr
                    at ${(commuteInput.hourlyTimeValue ?? 0).toFixed(2)}/hr over 47 weeks).
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-slate-300">
                    <span className="font-semibold text-emerald-400">No time penalty: </span>
                    Transit is not slower than driving for your route — no opportunity cost applies.
                  </p>
                )}
              </div>
            )}
          </div>
        </AdvancedRow>

        {/* Row 6: Year by Year Cost Stacking */}
        <AdvancedRow
          id="cost-stacking"
          title="How costs add up."
          hint="Year by year, side by side."
          defaultExpanded={false}
        >
          <MonthlySavingsChart arbitrage={arbitrage} />
        </AdvancedRow>
      </div>
    </div>
  );
}
