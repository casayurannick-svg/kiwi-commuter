import React from 'react';

export interface ZoneBadgeProps {
  zone: number | string;
  hubName: string;
  variant?: 'origin' | 'destination';
  className?: string;
  'data-testid'?: string;
}

/**
 * US-42: Minimalist read-only Zone Badge displaying resolved AT HOP zone and transport hub.
 * Positioned adjacent to coordinates at the top of location cards.
 */
export default function ZoneBadge({
  zone,
  hubName,
  variant = 'origin',
  className = '',
  'data-testid': testId,
}: ZoneBadgeProps) {
  const isOrigin = variant === 'origin';

  return (
    <span
      data-testid={testId}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-tight font-mono transition-colors shrink-0 ${
        isOrigin
          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
          : 'bg-sky-950/80 text-sky-300 border border-sky-500/30'
      } ${className}`}
    >
      <span className={isOrigin ? 'text-emerald-400 font-bold' : 'text-sky-400 font-bold'}>
        Z{zone}
      </span>
      <span className="opacity-40">•</span>
      <span className="truncate max-w-[110px] sm:max-w-[140px]">{hubName}</span>
    </span>
  );
}
