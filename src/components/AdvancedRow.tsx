'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AdvancedRowProps {
  id: string;
  title: string;
  hint: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * AdvancedRow (STORY-6)
 * Collapsible accordion row with accessible button header, title, hint copy,
 * and expandable content area (collapsed by default).
 */
export default function AdvancedRow({
  id,
  title,
  hint,
  defaultExpanded = false,
  children,
  className = '',
}: AdvancedRowProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      data-testid={`advanced-row-${id}`}
      className={`rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all duration-150 ${className}`}
    >
      <button
        type="button"
        id={`advanced-header-${id}`}
        aria-expanded={isExpanded}
        aria-controls={`advanced-content-${id}`}
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-800/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16]"
      >
        <div className="space-y-0.5 pr-4">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            {hint}
          </p>
        </div>

        <div
          className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center transition-transform duration-200 ${
            isExpanded ? 'rotate-180 bg-slate-800 text-slate-200' : 'bg-slate-800/60 text-slate-300'
          }`}
        >
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </button>

      <div
        id={`advanced-content-${id}`}
        role="region"
        aria-labelledby={`advanced-header-${id}`}
        hidden={!isExpanded}
        className={isExpanded ? 'border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/40' : 'hidden'}
      >
        {children}
      </div>
    </div>
  );
}
