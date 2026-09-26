'use client';

import React, { useState, useRef } from 'react';
import { Check, Share2 } from 'lucide-react';
import { CommuteInput } from '@/types';
import { serializeCommuteToParams } from '@/lib/urlParams';

export interface ShareButtonProps {
  commuteInput: CommuteInput;
  className?: string;
  onCopied?: (url: string) => void;
  showToast?: boolean;
}

/**
 * US-36: Share Button CTA that captures and serializes all commute search parameters
 * (origin, destination, exact addresses, geocoded coordinates, vehicle powertrain,
 * fuel/charging rates, concessions, parking, carpooling, maintenance wear, and time valuation).
 */
export default function ShareButton({
  commuteInput,
  className,
  onCopied,
  showToast = true,
}: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const constructShareUrl = (): string => {
    const params = serializeCommuteToParams(commuteInput);
    const queryString = params.toString();
    const originUrl =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://kiwi-commuter.vercel.app';
    const currentPath =
      typeof window !== 'undefined' && window.location.pathname
        ? window.location.pathname
        : '/';
    return `${originUrl}${currentPath}${queryString ? `?${queryString}` : ''}`;
  };

  const handleShareLink = async () => {
    const fullShareUrl = constructShareUrl();

    // Immediately synchronize the browser history bar as well
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', fullShareUrl);
    }

    let success = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullShareUrl);
        success = true;
      }
    } catch {
      // Fallback to execCommand below
    }

    if (!success && typeof document !== 'undefined') {
      try {
        const inputEl = document.createElement('input');
        inputEl.value = fullShareUrl;
        document.body.appendChild(inputEl);
        inputEl.select();
        document.execCommand('copy');
        document.body.removeChild(inputEl);
        success = true;
      } catch {
        success = false;
      }
    }

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    setIsCopied(true);
    setToastMessage(success ? 'Comparison link copied to clipboard!' : 'Failed to copy link');
    if (success && onCopied) {
      onCopied(fullShareUrl);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
      setToastMessage(null);
    }, 2500);
  };

  return (
    <>
      <button
        type="button"
        data-testid="share-button"
        onClick={handleShareLink}
        className={
          className ||
          'min-h-[32px] px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition active:scale-95'
        }
        title="Copy shareable link with current commute parameters"
        aria-label="Share comparison link"
      >
        {isCopied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Copied!</span>
          </>
        ) : (
          <>
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </>
        )}
      </button>

      {showToast && toastMessage && (
        <div
          data-testid="share-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900/95 border border-emerald-500/40 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </>
  );
}
