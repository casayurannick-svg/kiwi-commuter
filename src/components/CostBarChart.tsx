'use client';

import React from 'react';

export type CompareTimeframe = 'weekly' | 'monthly' | 'yearly';

export interface CompareBarItem {
  key: 'car' | 'ev' | 'transit';
  label: string; // "Your car" | "An electric car, if you bought one" | "Bus and train"
  amount: number;
  icon: React.ComponentType<{ className?: string }>;
  barColor: string;
  textColor: string;
  badge?: string;
  subtext?: string;
}

export interface CostBarChartProps {
  items: CompareBarItem[];
  unitSuffix: string;
  includeFixedCosts: boolean;
  className?: string;
}

/**
 * CostBarChart (STORY-5)
 * Comparative bar chart for Car, EV, and Public Transit with normalized
 * visual scale, contrast compliance, and cost-base awareness.
 */
export default function CostBarChart({
  items,
  unitSuffix,
  includeFixedCosts,
  className = '',
}: CostBarChartProps) {
  const maxAmount = Math.max(...items.map((i) => i.amount), 1);
  const minAmount = Math.min(...items.map((i) => i.amount));

  return (
    <div
      data-testid="cost-bar-chart"
      aria-label="Cost comparison bar chart"
      className={`rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-7 backdrop-blur-md shadow-xl shadow-black/20 space-y-6 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            {includeFixedCosts ? 'What your commute costs in total' : 'Comparative Commute Costs'}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {includeFixedCosts
              ? 'Includes avoidable trip costs plus fixed vehicle ownership (insurance, rego, WoF, depreciation).'
              : 'Direct avoidable costs: fuel/electricity, road user charges, parking, and distance wear.'}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const percentage = Math.max(10, Math.round((item.amount / maxAmount) * 100));
          const isLowest = item.amount === minAmount && items.length > 1;
          const Icon = item.icon;

          return (
            <div key={item.key} className="space-y-2">
              <div className="flex items-center justify-between text-sm sm:text-base">
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg bg-slate-800/80 ${item.textColor}`}>
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="font-semibold text-white tracking-tight">
                    {item.label}
                  </span>
                  {isLowest && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Lowest
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    ${item.amount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-300 font-sans">{unitSuffix}</span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-950/70 border border-slate-800/60 rounded-full h-4 sm:h-5 p-0.5 overflow-hidden shadow-inner">
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${item.barColor}`}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={item.amount}
                  aria-valuemin={0}
                  aria-valuemax={maxAmount}
                  aria-label={`${item.label} cost: $${item.amount.toFixed(2)}`}
                />
              </div>

              {item.subtext && (
                <div className="text-xs text-slate-300 pl-1">{item.subtext}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
