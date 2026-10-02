'use client';

import React, { useMemo, useState } from 'react';
import { CommuteInput, TcoInput } from '@/types';
import { calculateTcoArbitrage } from '@/lib/calculator';
import { Zap, Fuel, DollarSign, Calendar, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export interface EvRoiSandboxProps {
  input: CommuteInput;
  onChange?: (updated: CommuteInput) => void;
}

/**
 * Format the EV break-even verdict into plain language without hardcoding numbers.
 * Generates natural sentences based on real calculations (STORY-6).
 */
export function formatEvVerdictSentence(
  annualMileage: number,
  annualSavings: number,
  initialCapitalDelta: number,
  breakEvenYears: number | null
): string {
  const formattedMileage = Math.round(annualMileage).toLocaleString('en-NZ');

  // Trade-in equals or exceeds purchase price
  if (initialCapitalDelta <= 0) {
    return 'An electric car would pay for itself immediately as your trade-in covers the purchase.';
  }

  // Operating costs never recover capital delta within a realistic human ownership timeframe
  if (annualSavings <= 0 || breakEvenYears === null || breakEvenYears >= 20) {
    return `At about ${formattedMileage} km a year, an electric car wouldn't pay itself back for decades.`;
  }

  // Achievable break-even within < 20 years
  const roundedYears = Math.round(breakEvenYears);
  const yearsPhrase = roundedYears <= 1 ? '1 year' : `${roundedYears} years`;
  return `An electric car would pay for itself in about ${yearsPhrase}.`;
}

export function EvRoiSandbox({ input, onChange }: EvRoiSandboxProps) {
  // Local state with fallback defaults for interactive responsiveness
  const [localEvPrice, setLocalEvPrice] = useState<number>(
    typeof input.evPurchasePrice === 'number' && input.evPurchasePrice > 0 ? input.evPurchasePrice : 45000
  );
  const [localTradeIn, setLocalTradeIn] = useState<number>(
    typeof input.iceTradeInValue === 'number' ? input.iceTradeInValue : 15000
  );
  const [localHorizon, setLocalHorizon] = useState<number>(
    typeof input.horizonYears === 'number' && input.horizonYears > 0 ? input.horizonYears : 5
  );

  const tcoInput: TcoInput = useMemo(() => {
    return {
      ...input,
      evPurchasePrice: localEvPrice,
      iceTradeInValue: localTradeIn,
      horizonYears: localHorizon,
    };
  }, [input, localEvPrice, localTradeIn, localHorizon]);

  const tcoResult = useMemo(() => {
    return calculateTcoArbitrage(tcoInput);
  }, [tcoInput]);

  const handleEvPriceChange = (val: number) => {
    const next = Math.max(0, val);
    setLocalEvPrice(next);
    onChange?.({ ...input, evPurchasePrice: next });
  };

  const handleTradeInChange = (val: number) => {
    const next = Math.max(0, val);
    setLocalTradeIn(next);
    onChange?.({ ...input, iceTradeInValue: next });
  };

  const handleHorizonChange = (val: number) => {
    const next = Math.max(1, Math.min(15, val));
    setLocalHorizon(next);
    onChange?.({ ...input, horizonYears: next });
  };

  const formatCurrency = (val: number) =>
    `$${Math.round(val).toLocaleString('en-NZ')}`;

  const {
    initialCapitalDelta,
    annualMileage,
    annualIceCost,
    annualEvCost,
    annualSavings,
    breakEvenYears,
    isBreakEvenAchieved,
    cumulativeCosts,
  } = tcoResult;

  const evVerdictSentence = useMemo(() => {
    return formatEvVerdictSentence(
      annualMileage,
      annualSavings,
      initialCapitalDelta,
      breakEvenYears
    );
  }, [annualMileage, annualSavings, initialCapitalDelta, breakEvenYears]);

  return (
    <div
      data-testid="ev-roi-sandbox"
      className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-xl text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              EV ROI &amp; TCO Sandbox
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Model upfront vehicle capital delta against annual fuel, energy, RUC, and maintenance savings.
          </p>
        </div>

        {/* Break-even Plain-Language Sentence Badge */}
        <div className="self-start sm:self-auto max-w-md">
          <div
            data-testid="breakeven-badge"
            className={`flex items-start sm:items-center gap-2 px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold leading-snug ${
              isBreakEvenAchieved
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
            }`}
          >
            {isBreakEvenAchieved ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-400" />
            )}
            <span data-testid="ev-verdict-sentence">{evVerdictSentence}</span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mt-4">
        {/* EV Purchase Price */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-1.5">
            <span>EV Purchase Price</span>
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            <input
              type="number"
              step="1000"
              min="0"
              value={localEvPrice || ''}
              onChange={(e) => handleEvPriceChange(Number(e.target.value))}
              data-testid="tco-ev-price-input"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-md py-1.5 pl-6 pr-2.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500"
              placeholder="45000"
            />
          </div>
        </div>

        {/* ICE Trade-In Value */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-1.5">
            <span>ICE Trade-in / Resale</span>
            <Fuel className="w-3.5 h-3.5 text-amber-400" />
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
            <input
              type="number"
              step="1000"
              min="0"
              value={localTradeIn !== undefined ? localTradeIn : ''}
              onChange={(e) => handleTradeInChange(Number(e.target.value))}
              data-testid="tco-ice-trade-input"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-md py-1.5 pl-6 pr-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-500"
              placeholder="15000"
            />
          </div>
        </div>

        {/* Horizon Years */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-lg p-3">
          <label className="text-[11px] font-medium text-slate-400 flex items-center justify-between mb-1.5">
            <span>Analysis Horizon</span>
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
          </label>
          <div className="flex items-center gap-1">
            {[3, 5, 7, 10].map((yrs) => (
              <button
                key={yrs}
                type="button"
                onClick={() => handleHorizonChange(yrs)}
                data-testid={`tco-horizon-btn-${yrs}`}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                  localHorizon === yrs
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {yrs}y
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5 pt-3.5 border-t border-slate-800/60 text-xs">
        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Capital Delta</div>
          <div className="text-base font-bold text-white mt-0.5" data-testid="tco-capital-delta">
            {formatCurrency(initialCapitalDelta)}
          </div>
          <div className="text-[10px] text-slate-400">Upfront Investment</div>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Annual ICE Ops</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">
            {formatCurrency(annualIceCost.total)} a year
          </div>
          <div className="text-[10px] text-slate-400">Fuel + RUC + $800 Maint</div>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Annual EV Ops</div>
          <div className="text-base font-bold text-cyan-400 mt-0.5">
            {formatCurrency(annualEvCost.total)} a year
          </div>
          <div className="text-[10px] text-slate-400">Power + RUC + $400 Maint</div>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Net Annual Savings</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5" data-testid="tco-annual-savings">
            {annualSavings > 0 ? `+${formatCurrency(annualSavings)}` : formatCurrency(annualSavings)} a year
          </div>
          <div className="text-[10px] text-slate-400">Operational Delta</div>
        </div>
      </div>

      {/* Custom Flex-Box Timeline Visualization (No external chart libraries) */}
      <div className="mt-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cumulative Break-Even Timeline ({localHorizon} Years)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              Capital Deficit
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              Profitable / Net Positive
            </span>
          </div>
        </div>

        {/* Timeline Row */}
        <div
          data-testid="tco-timeline"
          className="flex flex-col sm:flex-row gap-2.5 sm:gap-2 overflow-x-auto pb-1"
        >
          {cumulativeCosts.map((c) => {
            const isProfitable = c.cumulativeSavings >= 0;
            const isBreakEvenYear =
              breakEvenYears !== null &&
              Math.ceil(breakEvenYears) === c.year &&
              isBreakEvenAchieved;

            return (
              <div
                key={c.year}
                data-testid={`tco-year-${c.year}`}
                className={`flex-1 min-w-[130px] rounded-lg p-3 border transition-all flex flex-col justify-between ${
                  isProfitable
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100 shadow-sm shadow-emerald-950/50'
                    : 'bg-rose-950/20 border-rose-900/50 text-rose-100'
                } ${isBreakEvenYear ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''}`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-white">Year {c.year}</span>
                    {isBreakEvenYear && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                        ROI
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>ICE Cost:</span>
                      <span className="font-medium text-slate-300">{formatCurrency(c.iceCumulativeCost)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>EV Cost:</span>
                      <span className="font-medium text-slate-300">{formatCurrency(c.evCumulativeCost)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/60">
                  <div className="text-[10px] text-slate-400">Cumulative Delta:</div>
                  <div
                    className={`text-xs font-bold mt-0.5 ${
                      isProfitable ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {c.cumulativeSavings >= 0
                      ? `+${formatCurrency(c.cumulativeSavings)}`
                      : `-${formatCurrency(Math.abs(c.cumulativeSavings))}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EvRoiSandbox;
