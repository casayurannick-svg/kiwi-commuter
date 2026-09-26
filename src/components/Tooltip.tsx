'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import clsx from 'clsx';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  avoidCollisions?: boolean;
  className?: string;
  side?: 'top' | 'bottom';
  align?: 'start' | 'center' | 'end';
}

/**
 * Global Tooltip Component (BUG-41)
 * Features:
 * - Dynamic collision detection (`avoidCollisions={true}`) that shifts the element away from mobile screen edges
 * - CSS boundary constraints (`max-w-[90vw]`) and text wrapping (`whitespace-normal break-words`)
 * - Accessible ARIA `role="tooltip"` and focus/hover visibility
 */
export default function Tooltip({
  content,
  children,
  avoidCollisions = true,
  className,
  side = 'top',
  align = 'start',
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const currentShiftRef = useRef<number>(0);
  const [shiftX, setShiftX] = useState<number>(0);

  const updatePosition = useCallback(() => {
    if (!avoidCollisions || typeof window === 'undefined') return;
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const tooltipRect = tooltipEl.getBoundingClientRect();
    const viewportWidth = Math.min(
      window.visualViewport?.width || 375,
      document.documentElement.clientWidth || 375,
      window.innerWidth || 375
    );
    const margin = 12;

    // Determine unshifted left coordinate
    const unshiftedLeft = tooltipRect.left - currentShiftRef.current;
    const tooltipWidth = tooltipRect.width || tooltipEl.offsetWidth || 256;
    const unshiftedRight = unshiftedLeft + tooltipWidth;

    let offset = 0;
    if (unshiftedRight > viewportWidth - margin) {
      offset = (viewportWidth - margin) - unshiftedRight;
    }
    if (unshiftedLeft + offset < margin) {
      offset = margin - unshiftedLeft;
    }

    currentShiftRef.current = offset;
    const transformValue =
      align === 'center'
        ? `translateX(calc(-50% + ${offset}px))`
        : offset !== 0
        ? `translateX(${offset}px)`
        : '';

    tooltipEl.style.transform = transformValue;
    setShiftX(offset);
  }, [avoidCollisions, align]);

  useEffect(() => {
    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    const timer = setTimeout(updatePosition, 100);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex items-center group"
      onMouseEnter={updatePosition}
      onFocus={updatePosition}
      onPointerEnter={updatePosition}
    >
      {children}
      <div
        ref={tooltipRef}
        role="tooltip"
        style={{
          transform:
            align === 'center'
              ? `translateX(calc(-50% + ${shiftX}px))`
              : shiftX !== 0
              ? `translateX(${shiftX}px)`
              : undefined,
        }}
        className={clsx(
          'pointer-events-none absolute mb-2',
          side === 'top' ? 'bottom-full' : 'top-full mt-2',
          align === 'center'
            ? 'left-1/2 -translate-x-1/2'
            : align === 'end'
            ? 'right-0'
            : 'left-0',
          'w-64 sm:w-72 max-w-[90vw] p-2.5 bg-slate-900/95 border border-slate-700 rounded-lg',
          'text-[11px] text-slate-200 leading-snug shadow-xl backdrop-blur-md',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50',
          'whitespace-normal break-words',
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}
