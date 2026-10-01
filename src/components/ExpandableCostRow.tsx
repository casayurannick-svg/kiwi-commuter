'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface CostItem {
  label: string;
  amount: number | string;
  detail?: string;
  isIncluded?: boolean;
}

export interface ExpandableCostRowProps {
  id: string;
  title: string;
  total: number;
  unit?: string;
  items: CostItem[];
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * ExpandableCostRow (STORY-4)
 * Layered disclosure cost row that expands/collapses cleanly, displaying
 * high-level weekly totals with itemized sub-costs.
 */
export default function ExpandableCostRow({
  id,
  title,
  total,
  unit = 'a week',
  items,
  defaultExpanded = false,
  className = '',
}: ExpandableCostRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all duration-150 ${className}`}
    >
      <button
        type="button"
        id={`cost-header-${id}`}
        aria-expanded={isExpanded}
        aria-controls={`cost-content-${id}`}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16]"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200 ${
              isExpanded ? 'rotate-180 bg-slate-800 text-slate-200' : 'bg-slate-800/60 text-slate-300'
            }`}
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-base sm:text-lg font-semibold text-white tracking-tight">
            {title}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5 text-right font-mono">
          <span className="text-lg sm:text-xl font-bold text-white tracking-tight">
            ${total.toFixed(2)}
          </span>
          <span className="text-xs text-slate-300 font-sans">{unit}</span>
        </div>
      </button>

      {/* Expandable itemized sub-costs */}
      {isExpanded && (
        <div
          id={`cost-content-${id}`}
          role="region"
          aria-labelledby={`cost-header-${id}`}
          className="border-t border-slate-800/60 px-5 py-3 bg-slate-950/40 space-y-2.5 animate-fadeIn"
        >
          {items.map((item, index) => {
            const isIncluded =
              item.isIncluded || item.amount === 'Included' || (typeof item.amount === 'string' && item.amount.toLowerCase() === 'included');

            return (
              <div
                key={`${item.label}-${index}`}
                className="flex items-center justify-between text-sm py-1 border-b border-slate-800/30 last:border-b-0"
              >
                <div className="flex flex-col">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  {item.detail && <span className="text-xs text-slate-300">{item.detail}</span>}
                </div>

                <div className="font-mono">
                  {isIncluded ? (
                    <span className="text-emerald-400 font-semibold text-xs tracking-wide uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      Included
                    </span>
                  ) : (
                    <span className="text-slate-200 font-semibold">
                      ${typeof item.amount === 'number' ? item.amount.toFixed(2) : item.amount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
