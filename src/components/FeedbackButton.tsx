import React from 'react';
import { MessageSquare } from 'lucide-react';

export interface FeedbackButtonProps {
  onClick: () => void;
  variant?: 'header' | 'footer';
  className?: string;
}

export default function FeedbackButton({
  onClick,
  variant = 'header',
  className = '',
}: FeedbackButtonProps) {
  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition active:scale-95 ${className}`}
      >
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span>Report Feedback</span>
      </button>
    );
  }

  // Header variant (compact, consistent with DonationButton and ShareButton)
  return (
    <button
      type="button"
      onClick={onClick}
      title="Report Feedback"
      aria-label="Report Feedback"
      className={`min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 ${className}`}
    >
      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
      <span className="hidden sm:inline">Feedback</span>
    </button>
  );
}
