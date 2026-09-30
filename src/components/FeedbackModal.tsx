'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, CheckCircle2, Loader2, Send } from 'lucide-react';

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ issueNumber?: number; issueUrl?: string } | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus message field or name field when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessData(null);
      // Timeout to ensure modal has mounted
      const timer = setTimeout(() => {
        messageInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please provide a feedback message.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Requirement 6: Grab window.location.search and bundle it with form data
      const urlContext = typeof window !== 'undefined' ? window.location.search : '';

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          contact: contact.trim() || undefined,
          message: message.trim(),
          urlContext: urlContext || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback. Please try again.');
      }

      setSuccessData({
        issueNumber: data.issueNumber,
        issueUrl: data.issueUrl,
      });

      // Clear form inputs
      setName('');
      setContact('');
      setMessage('');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong while submitting feedback.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-zinc-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-lg font-bold text-white leading-tight">
                Report Feedback
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Share bugs, suggestions, or route updates with the developer.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Success or Form */}
        {successData ? (
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 animate-in zoom-in-90 duration-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-white">Thank you for your feedback!</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4 leading-relaxed">
              Your report has been automatically recorded as a GitHub issue. We appreciate your help making Kiwi Commuter better!
            </p>
            {successData.issueUrl && (
              <a
                href={successData.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-4 mb-6 transition"
              >
                View Issue #{successData.issueNumber} on GitHub &rarr;
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition active:scale-95 border border-slate-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Name Input */}
            <div>
              <label htmlFor="feedback-name" className="block text-xs font-medium text-slate-300 mb-1">
                Name <span className="text-slate-500 text-[11px] font-normal">(Optional)</span>
              </label>
              <input
                id="feedback-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Campbell"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Contact Input */}
            <div>
              <label htmlFor="feedback-contact" className="block text-xs font-medium text-slate-300 mb-1">
                Contact <span className="text-slate-500 text-[11px] font-normal">(Email / Phone, optional)</span>
              </label>
              <input
                id="feedback-contact"
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. alex@example.com or 021..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {/* Message Area */}
            <div>
              <label htmlFor="feedback-message" className="block text-xs font-medium text-slate-300 mb-1">
                Message <span className="text-emerald-400 text-xs">*</span>
              </label>
              <textarea
                id="feedback-message"
                ref={messageInputRef}
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your feedback, fare discrepancy, route issue, or feature idea..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition"
              />
            </div>

            {/* URL Context Note */}
            <p className="text-[11px] text-slate-500 italic">
              Note: Current commute parameters will be attached to help reproduce any issues.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-semibold shadow-md shadow-emerald-950 transition active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
