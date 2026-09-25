'use client';

import { ArbitrageResult, CommuteInput } from '@/types';
import React from 'react';

interface MiniReceiptProps {
  arbitrage: ArbitrageResult;
  input: CommuteInput;
}

export default function MiniReceipt({ arbitrage, input }: MiniReceiptProps) {
  const { driving, transit, timeMetrics, paybackMonths } = arbitrage;
  const hourlyTimeValue = input.hourlyTimeValue ?? 0;

  const delta = Math.round(Math.abs(driving.monthlyTotal - transit.monthlyTotal));
  const isTransitCheaper = transit.monthlyTotal < driving.monthlyTotal;
  const isDrivingCheaper = driving.monthlyTotal < transit.monthlyTotal;

  const cashDelta = delta;
  const monthlyHoursSaved = Math.abs(timeMetrics?.monthlyTimeDeltaHours ?? 0);
  const monetizedTimeCost = Math.round(
    Math.abs(timeMetrics?.monetizedMonthlyTimeCost ?? (monthlyHoursSaved * hourlyTimeValue))
  );

  const oneWayDrive = timeMetrics?.oneWayDriveMinutes ?? arbitrage.drivingTimeMins;
  const oneWayTransit = timeMetrics?.oneWayTransitMinutes ?? arbitrage.transitTimeMins;
  const isDriveFaster = oneWayDrive < oneWayTransit;
  const isTransitFaster = oneWayTransit < oneWayDrive;

  let isWinningModeSlower = false;
  let isWinningModeFaster = false;
  if (isTransitCheaper) {
    isWinningModeSlower = isDriveFaster;
    isWinningModeFaster = isTransitFaster;
  } else if (isDrivingCheaper) {
    isWinningModeSlower = isTransitFaster;
    isWinningModeFaster = isDriveFaster;
  }

  const trueBenefit = isWinningModeSlower
    ? cashDelta - monetizedTimeCost
    : isWinningModeFaster
    ? cashDelta + monetizedTimeCost
    : cashDelta;

  const hasTimeValuation = hourlyTimeValue > 0;
  const hasPaybackTimeline = paybackMonths !== null && paybackMonths !== undefined && paybackMonths > 0;

  if (!hasTimeValuation && !hasPaybackTimeline) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* US-16: Time Valuation Balance Sheet ("Mini-Receipt") */}
      {hasTimeValuation && (
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

      {/* US-11: E-Bike Breakeven Alert Box */}
      {hasPaybackTimeline && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🚲</span>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                E-Bike Breakeven Timeline
              </div>
              <div className="text-xs text-slate-300">
                At current driving costs, your E-Bike pays for itself in{' '}
                <strong className="text-white font-bold">{paybackMonths} months</strong>.
              </div>
            </div>
          </div>
          <div className="text-right shrink-0 font-mono font-black text-emerald-400 text-sm ml-2">
            {paybackMonths} mo
          </div>
        </div>
      )}
    </div>
  );
}
