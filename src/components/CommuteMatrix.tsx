'use client';

import React, { useMemo, useState } from 'react';
import { CommuteInput, ArbitrageResult } from '@/types';
import { calculateCommuteArbitrage, NZ_RUC_LIGHT_EV_RATE_PER_KM } from '@/lib/calculator';
import { Fuel, Zap, Bus, CheckCircle2, TrendingDown } from 'lucide-react';

export interface CommuteMatrixProps {
  input: CommuteInput;
  arbitrage?: ArbitrageResult;
}

export type MatrixTimeframe = 'daily' | 'weekly' | 'annual';

export function CommuteMatrix({ input, arbitrage }: CommuteMatrixProps) {
  const [timeframe, setTimeframe] = useState<MatrixTimeframe>('annual');

  const iceArbitrage = useMemo(() => {
    return calculateCommuteArbitrage({
      ...input,
      vehicleType:
        input.vehicleType === 'petrol95' || input.vehicleType === 'diesel'
          ? input.vehicleType
          : 'petrol91',
      powertrain:
        input.powertrain === 'PETROL_95' || input.powertrain === 'DIESEL'
          ? input.powertrain
          : 'PETROL_91',
    });
  }, [input]);

  const evArbitrage = useMemo(() => {
    return calculateCommuteArbitrage({
      ...input,
      vehicleType: 'bev',
      powertrain: 'BEV',
      propulsion: 'EV',
      efficiency: input.evEfficiency ?? input.efficiency ?? 15,
      kwhRate: input.kwhRate ?? 0.33,
    });
  }, [input]);

  const transitArbitrage = useMemo(() => {
    if (arbitrage) return arbitrage;
    return calculateCommuteArbitrage(input);
  }, [arbitrage, input]);

  // Metric resolution helper
  const getCost = (arb: ArbitrageResult, mode: 'driving' | 'transit', tf: MatrixTimeframe) => {
    if (mode === 'driving') {
      if (tf === 'daily') return arb.driving.dailyTotal;
      if (tf === 'weekly') return arb.driving.weeklyTotal;
      return arb.driving.annualTotal;
    } else {
      if (tf === 'daily') return arb.transit.dailyFare;
      if (tf === 'weekly') return arb.transit.weeklyTotal;
      return arb.transit.annualTotal;
    }
  };

  const iceCost = getCost(iceArbitrage, 'driving', timeframe);
  const evCost = getCost(evArbitrage, 'driving', timeframe);
  const transitCost = getCost(transitArbitrage, 'transit', timeframe);

  const evSavingsVsIce = Math.round((iceCost - evCost) * 100) / 100;
  const transitSavingsVsIce = Math.round((iceCost - transitCost) * 100) / 100;

  const iceRucCost =
    timeframe === 'daily'
      ? iceArbitrage.driving.dailyRucCost ?? 0
      : timeframe === 'weekly'
      ? iceArbitrage.driving.weeklyRucCost ?? 0
      : (iceArbitrage.driving.monthlyRucCost ?? 0) * 12;

  const customFuelPrice =
    typeof input.customFuelPricePerL === 'number' &&
    !isNaN(input.customFuelPricePerL) &&
    input.customFuelPricePerL > 0
      ? input.customFuelPricePerL
      : typeof input.fuelPriceOverride === 'number' &&
        !isNaN(input.fuelPriceOverride) &&
        input.fuelPriceOverride > 0 &&
        input.powertrain !== 'BEV' &&
        input.vehicleType !== 'bev'
      ? input.fuelPriceOverride
      : undefined;

  const formatCurrency = (val: number | undefined | null) =>
    `$${(val ?? 0).toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tfLabel = timeframe === 'daily' ? 'day' : timeframe === 'weekly' ? 'week' : 'year';

  return (
    <div
      data-testid="commute-summary-matrix"
      className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 sm:p-5 backdrop-blur-sm shadow-xl text-slate-100"
    >
      {/* Header and Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              3-Way Commute Cost Matrix
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Side-by-side cost breakdown comparing Combustion (ICE), Electric (EV), and Public Transit.
          </p>
        </div>

        {/* Timeframe Pill Switcher */}
        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 self-start sm:self-auto">
          {(['daily', 'weekly', 'annual'] as MatrixTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              data-testid={`matrix-tab-${tf}`}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                timeframe === tf
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 mt-4">
        {/* Column 1: ICE Vehicle */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500/80" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Combustion (ICE)</h4>
                  <p className="text-[11px] text-slate-400">Petrol / Diesel Car</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Baseline
              </span>
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {formatCurrency(iceCost)}
              </div>
              <div className="text-xs text-slate-400">per {tfLabel}</div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Fuel Cost:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? iceArbitrage.driving.dailyFuelCost
                      : timeframe === 'weekly'
                      ? iceArbitrage.driving.weeklyFuelCost
                      : iceArbitrage.driving.monthlyFuelCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">NZ RUC:</span>
                <span className={`font-medium ${iceRucCost > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                  {iceRucCost > 0 ? (
                    formatCurrency(iceRucCost)
                  ) : (
                    <>
                      $0.00 <span className="text-[10px]">(Exempt)</span>
                    </>
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Parking:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? iceArbitrage.driving.dailyParkingCost
                      : timeframe === 'weekly'
                      ? iceArbitrage.driving.weeklyParkingCost
                      : iceArbitrage.driving.monthlyParkingCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Maintenance & Wear:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? iceArbitrage.driving.dailyMaintenanceCost
                      : timeframe === 'weekly'
                      ? iceArbitrage.driving.weeklyMaintenanceCost
                      : iceArbitrage.driving.monthlyMaintenanceCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Fixed Ownership:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? iceArbitrage.driving.dailyFixedCost
                      : timeframe === 'weekly'
                      ? iceArbitrage.driving.weeklyFixedCost
                      : iceArbitrage.driving.annualFixedCost
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400">
            {customFuelPrice !== undefined
              ? `Custom fuel price ($${customFuelPrice.toFixed(2)}/L)`
              : 'Standard petrol rate benchmark ($2.72/L default)'}
          </div>
        </div>

        {/* Column 2: Electric Vehicle (EV) */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500/80" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Electric (EV)</h4>
                  <p className="text-[11px] text-slate-400">Battery Electric (BEV)</p>
                </div>
              </div>
              {evSavingsVsIce > 0 ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Save {formatCurrency(evSavingsVsIce)}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  EV Profile
                </span>
              )}
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {formatCurrency(evCost)}
              </div>
              <div className="text-xs text-slate-400">per {tfLabel}</div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Electricity:</span>
                <span className="font-medium text-cyan-400">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? evArbitrage.driving.dailyFuelCost
                      : timeframe === 'weekly'
                      ? evArbitrage.driving.weeklyFuelCost
                      : evArbitrage.driving.monthlyFuelCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">NZ RUC (${NZ_RUC_LIGHT_EV_RATE_PER_KM}/km):</span>
                <span className="font-medium text-amber-300">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? evArbitrage.driving.dailyRucCost
                      : timeframe === 'weekly'
                      ? evArbitrage.driving.weeklyRucCost
                      : evArbitrage.driving.monthlyRucCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Parking:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? evArbitrage.driving.dailyParkingCost
                      : timeframe === 'weekly'
                      ? evArbitrage.driving.weeklyParkingCost
                      : evArbitrage.driving.monthlyParkingCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Maintenance & Wear:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? evArbitrage.driving.dailyMaintenanceCost
                      : timeframe === 'weekly'
                      ? evArbitrage.driving.weeklyMaintenanceCost
                      : evArbitrage.driving.monthlyMaintenanceCost * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Fixed Ownership:</span>
                <span className="font-medium">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? evArbitrage.driving.dailyFixedCost
                      : timeframe === 'weekly'
                      ? evArbitrage.driving.weeklyFixedCost
                      : evArbitrage.driving.annualFixedCost
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Rate: ${input.kwhRate ?? 0.33}/kWh</span>
            <span>Eff: {input.evEfficiency ?? input.efficiency ?? 15} kWh/100km</span>
          </div>
        </div>

        {/* Column 3: Public Transit */}
        <div className="bg-slate-950/60 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/80" />
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Public Transit</h4>
                  <p className="text-[11px] text-slate-400">
                    {transitArbitrage.transit.primaryMode} Commute
                  </p>
                </div>
              </div>
              {transitSavingsVsIce > 0 ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Save {formatCurrency(transitSavingsVsIce)}
                </span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Transit
                </span>
              )}
            </div>

            <div className="my-3">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                {formatCurrency(transitCost)}
              </div>
              <div className="text-xs text-slate-400">per {tfLabel}</div>
            </div>

            {/* Line Items Breakdown */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">AT HOP Fare:</span>
                <span className="font-medium text-emerald-400">
                  {formatCurrency(
                    timeframe === 'daily'
                      ? transitArbitrage.transit.dailyFare -
                          (transitArbitrage.transit.firstMileDailyCost ?? 0)
                      : timeframe === 'weekly'
                      ? transitArbitrage.transit.weeklyTotal -
                          ((transitArbitrage.transit.firstMileDailyCost ?? 0) * input.daysPerWeek)
                      : (transitArbitrage.transit.hopFareMonthly ??
                          transitArbitrage.transit.monthlyTotal) * 12
                  )}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">First-Mile Leg:</span>
                <span className="font-medium">
                  {transitArbitrage.transit.firstMileDailyCost
                    ? formatCurrency(
                        timeframe === 'daily'
                          ? transitArbitrage.transit.firstMileDailyCost
                          : timeframe === 'weekly'
                          ? transitArbitrage.transit.firstMileDailyCost * input.daysPerWeek
                          : (transitArbitrage.transit.firstMileMonthlyCost ?? 0) * 12
                      )
                    : '$0.00 (Walk/Direct)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">NZ RUC:</span>
                <span className="font-medium text-slate-400">$0.00</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Parking & Tolls:</span>
                <span className="font-medium text-emerald-400">$0.00</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">WOF, Rego, Ins:</span>
                <span className="font-medium text-emerald-400">$0.00</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{transitArbitrage.transit.zoneCount} Fare Zones</span>
            {transitArbitrage.transit.isHopCapApplied && (
              <span className="text-emerald-400 font-semibold">$50 Cap Applied</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommuteMatrix;
export const CommuteSummaryMatrix = CommuteMatrix;
