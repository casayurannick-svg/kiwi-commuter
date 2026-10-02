'use client';

import React, { useState, useRef } from 'react';
import { Check, Loader2, Share2 } from 'lucide-react';
import { CommuteInput } from '@/types';
import { serializeCommuteToParams } from '@/lib/urlParams';
import { saveTripToSupabase } from '@/lib/supabase';

export interface ShareButtonProps {
  commuteInput: CommuteInput;
  className?: string;
  onCopied?: (url: string) => void;
  showToast?: boolean;
}

/**
 * Builds a shareable URL (STORY-10).
 * 1. Writes current commute state to Supabase saved_trips and generates an opaque short URL using ?tripId=<UUID>.
 * 2. If Supabase fails or is unreachable, uses the privacy fallback: URL serialized with street numbers strictly stripped.
 */
export async function buildShareUrl(
  commuteInput: CommuteInput,
  originUrl = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://kiwi-commuter.vercel.app',
  currentPath = typeof window !== 'undefined' && window.location.pathname
    ? window.location.pathname
    : '/'
): Promise<string> {
  let tripId: string | null = null;
  try {
    tripId = await saveTripToSupabase(commuteInput);
  } catch (err) {
    console.warn('Failed to save trip to Supabase, falling back to privacy URL serialization:', err);
  }

  if (tripId) {
    return `${originUrl}${currentPath}?tripId=${tripId}`;
  }

  // Privacy fallback: strictly strip street numbers from origin/destination
  const params = serializeCommuteToParams(commuteInput, { privacyMode: true });
  const queryString = params.toString();
  return `${originUrl}${currentPath}${queryString ? `?${queryString}` : ''}`;
}

/**
 * US-36 & STORY-10: Share Button CTA that captures and serializes commute parameters
 * into an opaque UUID link via Supabase or a privacy-preserving suburb fallback.
 */
export default function ShareButton({
  commuteInput,
  className,
  onCopied,
  showToast = true,
}: ShareButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShareLink = async () => {
    setIsGenerating(true);
    let fullShareUrl = '';
    try {
      fullShareUrl = await buildShareUrl(commuteInput);
    } catch {
      // Direct synchronous fallback on unexpected failure
      const params = serializeCommuteToParams(commuteInput, { privacyMode: true });
      const queryString = params.toString();
      const originUrl =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : 'https://kiwi-commuter.vercel.app';
      const currentPath =
        typeof window !== 'undefined' && window.location.pathname
          ? window.location.pathname
          : '/';
      fullShareUrl = `${originUrl}${currentPath}${queryString ? `?${queryString}` : ''}`;
    } finally {
      setIsGenerating(false);
    }

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
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span className="hidden sm:inline">Saving...</span>
          </>
        ) : isCopied ? (
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
