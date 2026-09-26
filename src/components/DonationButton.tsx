import React from 'react';
import { Coffee } from 'lucide-react';

export interface DonationButtonProps {
  variant?: 'header' | 'footer';
  className?: string;
}

export default function DonationButton({ variant = 'header', className = '' }: DonationButtonProps) {
  const donationUrl = process.env.NEXT_PUBLIC_DONATION_URL || '#';

  if (variant === 'footer') {
    return (
      <a
        href={donationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition active:scale-95 ${className}`}
      >
        <span>☕</span>
        <span>Buy Me a Coffee</span>
      </a>
    );
  }

  // Header variant (subtle, icon with minimal text)
  return (
    <a
      href={donationUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="Buy Me a Coffee"
      aria-label="Buy Me a Coffee"
      className={`min-h-[32px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 text-xs font-semibold transition active:scale-95 ${className}`}
    >
      <Coffee className="w-3.5 h-3.5 text-amber-400" />
      <span className="hidden sm:inline">Coffee</span>
    </a>
  );
}
