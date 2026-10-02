'use client';

import React, { useState, useId } from 'react';
import { CommuteInput, CommuteComparisonResult } from '@/types';
import { calculateCarFreeSavings } from '@/lib/calculator';
import { ChevronDown, Sparkles, AlertCircle } from 'lucide-react';

export interface CarFreeCardProps {
  commuteInput: CommuteInput;
  arbitrage: CommuteComparisonResult;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * CarFreeCard (STORY-8)
 * Expandable card on the Summary tab calculating total annual savings
 * if the user sells their car completely, accounting for non-commute driving
 * and alternative transport allowances (taxis/rentals).
 */
export default function CarFreeCard({
  commuteInput,
  arbitrage,
  defaultExpanded = false,
  className = '',
}: CarFreeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [otherDrivingKm, setOtherDrivingKm] = useState<number>(5000);
  const [allowance, setAllowance] = useState<number>(300);

  const otherKmInputId = useId();
  const allowanceInputId = useId();

  // Safely guard user input numbers
  const safeOtherKm = Math.max(
    0,
    typeof otherDrivingKm === 'number' && !isNaN(otherDrivingKm) ? otherDrivingKm : 0
  );
  const safeAllowance = Math.max(
    0,
    typeof allowance === 'number' && !isNaN(allowance) ? allowance : 0
  );

  // Compute car-free savings breakdown
  const savings = calculateCarFreeSavings(commuteInput, arbitrage, {
    otherDrivingKm: safeOtherKm,
    allowance: safeAllowance,
  });

  const roundedC = Math.round(savings.carCostTotal);
  const roundedF = Math.round(savings.annualTransitFare);
  const roundedA = Math.round(savings.allowance);
  const roundedX = roundedC - roundedF - roundedA;

  const formattedC = roundedC.toLocaleString('en-NZ');
  const formattedF = roundedF.toLocaleString('en-NZ');
  const formattedA = roundedA.toLocaleString('en-NZ');
  const formattedX = roundedX.toLocaleString('en-NZ');

  return (
    <div
      data-testid="car-free-card"
      className={`rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all duration-150 ${className}`}
    >
      {/* 1. Collapsed Header Toggle */}
      <button
        type="button"
        id="car-free-header"
        data-testid="car-free-toggle"
        aria-expanded={isExpanded}
        aria-controls="car-free-content"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16]"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
            Thinking of selling the car? See what going car-free could save.
          </span>
        </div>

        <div
          className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-transform duration-200 ${
            isExpanded ? 'rotate-180 bg-slate-800 text-slate-200' : 'bg-slate-800/60 text-slate-300'
          }`}
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </button>

      {/* 2. Expanded Content Area */}
      {isExpanded && (
        <div
          id="car-free-content"
          data-testid="car-free-content"
          role="region"
          aria-labelledby="car-free-header"
          className="border-t border-slate-800/60 p-4 sm:p-6 bg-slate-950/40 space-y-5 animate-fadeIn"
        >
          {/* Other driving input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-slate-800/60 bg-slate-900/50">
            <div>
              <label
                htmlFor={otherKmInputId}
                className="block text-sm font-semibold text-white"
              >
                Other driving (km a year)
              </label>
              <span className="text-xs text-slate-300">
                Weekend trips, errands, and non-commute travel
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id={otherKmInputId}
                data-testid="car-free-other-km-input"
                type="number"
                min="0"
                step="500"
                value={otherDrivingKm}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOtherDrivingKm(isNaN(val) ? 0 : val);
                }}
                onInput={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  setOtherDrivingKm(isNaN(val) ? 0 : val);
                }}
                className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-mono text-white text-right focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-xs text-slate-300 font-mono">km a year</span>
            </div>
          </div>

          {/* Line Items Breakdown */}
          <div className="space-y-3 pt-1">
            {/* Line Item 1 */}
            <div
              data-testid="car-free-stop-paying"
              className="flex items-center justify-between text-sm sm:text-base py-1 border-b border-slate-800/40"
            >
              <span className="text-slate-200 font-medium">
                You&apos;d stop paying for the car: ${formattedC}
              </span>
              <span
                data-testid="car-free-c-value"
                className="font-mono font-semibold text-emerald-400"
              >
                +${formattedC}
              </span>
            </div>

            {/* Line Item 2 */}
            <div
              data-testid="car-free-transit-fares"
              className="flex items-center justify-between text-sm sm:text-base py-1 border-b border-slate-800/40"
            >
              <span className="text-slate-200 font-medium">
                Minus commute fares for the year: ${formattedF}
              </span>
              <span
                data-testid="car-free-f-value"
                className="font-mono font-semibold text-amber-400"
              >
                -${formattedF}
              </span>
            </div>

            {/* Line Item 3 / Editable Allowance Input */}
            <div
              data-testid="car-free-allowance"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-1 border-b border-slate-800/40"
            >
              <div>
                <label
                  htmlFor={allowanceInputId}
                  data-testid="car-free-allowance-label"
                  className="text-sm sm:text-base font-medium text-slate-200"
                >
                  Taxis, rentals and other trips: ${formattedA}
                </label>
                <div className="text-xs text-slate-300">
                  Allowance for rideshares, car rentals, or casual trips
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-center">
                <span className="text-sm font-mono text-slate-300">$</span>
                <input
                  id={allowanceInputId}
                  data-testid="car-free-allowance-input"
                  aria-label="Taxis, rentals and other trips"
                  type="number"
                  min="0"
                  step="50"
                  value={allowance}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAllowance(isNaN(val) ? 0 : val);
                  }}
                  onInput={(e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    setAllowance(isNaN(val) ? 0 : val);
                  }}
                  className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm font-mono text-white text-right focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 6. Result Sentence */}
          <div
            data-testid="car-free-result-container"
            className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 flex items-center justify-between gap-3"
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Annual Car-Free Net Savings
              </div>
              <div
                data-testid="car-free-result"
                className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5"
              >
                Going car-free could save about ${formattedX} a year.
              </div>
            </div>
            <div
              data-testid="car-free-x-value"
              className="text-xl sm:text-2xl font-black font-mono text-emerald-400 shrink-0"
            >
              ${formattedX}
            </div>
          </div>

          {/* 7. Caveat Text */}
          <div className="flex items-start gap-2 pt-1 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" aria-hidden="true" />
            <p data-testid="car-free-caveat">
              Based on the full yearly cost of the car. Includes insurance, registration, maintenance, and non-commute driving, offset by annual public transit fares and an allowance for alternative transport.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
