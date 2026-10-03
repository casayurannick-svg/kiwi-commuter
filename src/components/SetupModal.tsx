'use client';

import React, { useEffect, useRef } from 'react';
import KiwiPathwayIcon from '@/components/icons/KiwiPathwayIcon';
import SetupFlow, { SetupResult } from '@/components/SetupFlow';
import { X } from 'lucide-react';

export interface SetupModalProps {
  isOpen: boolean;
  onComplete: (result: SetupResult) => void;
  onClose?: () => void;
  initialFrom?: string;
  initialTo?: string;
  initialStep?: number;
  isFirstRun?: boolean;
}

/**
 * SetupModal (STORY-7, FIX-CHANGE-ROUTE)
 * First-run modal wrapper for new users and modal route editor for returning users.
 * Close 'X' button is hidden on initial onboarding and visible when reopened from Dashboard.
 */
export default function SetupModal({
  isOpen,
  onComplete,
  onClose,
  initialFrom,
  initialTo,
  initialStep = 1,
  isFirstRun,
}: SetupModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // If isFirstRun is explicitly passed, respect it; otherwise check if URL query params are empty
  const isUrlEmpty =
    typeof window !== 'undefined'
      ? !window.location.search || window.location.search === ''
      : true;
  const effectiveIsFirstRun = isFirstRun !== undefined ? isFirstRun : isUrlEmpty;

  const canClose = Boolean(onClose && !effectiveIsFirstRun);

  // Close on Escape key press if dismissible
  useEffect(() => {
    if (!isOpen || !canClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canClose, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
      data-testid="setup-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200 overflow-y-auto"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg my-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-visible p-5 sm:p-7 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Branding */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <KiwiPathwayIcon className="w-6 h-6 text-emerald-500" aria-label="Kiwi Commuter" />
            </div>
            <div>
              <h1 id="setup-modal-title" className="text-lg font-bold text-white leading-tight">
                Welcome to Kiwi Commuter
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate your true transport costs in few steps.
              </p>
            </div>
          </div>

          {canClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close setup modal"
              data-testid="setup-modal-close-btn"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition min-h-[24px] min-w-[24px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4-Step Interactive Flow */}
        <SetupFlow
          onComplete={onComplete}
          initialFrom={initialFrom}
          initialTo={initialTo}
          initialStep={initialStep}
        />
      </div>
    </div>
  );
}
