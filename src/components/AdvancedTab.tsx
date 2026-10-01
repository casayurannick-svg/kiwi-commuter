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
 * 5. "How costs add up." (MonthlySavingsChart)
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

      {/* 5 Collapsible Disclosure Rows (Collapsed by default) */}
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

        {/* Row 5: Year by Year Cost Stacking */}
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
