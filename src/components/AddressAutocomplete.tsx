'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { GeocodingResult, searchAucklandAddresses } from '@/lib/mapbox';

export interface AddressAutocompleteProps {
  id: string;
  label?: string;
  testId?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: GeocodingResult) => void;
  onClear?: () => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onError?: () => void; // Added for STORY-23 Error Boundary linkage
  onClearError?: () => void;
  autoClearOnFocus?: boolean;
  icon?: React.ReactNode;
  dropdownZIndex?: string;
  className?: string;
  disabled?: boolean;
  apiError?: boolean;
  transitMode?: string;
  headerRight?: React.ReactNode;
}

export default function AddressAutocomplete({
  id,
  label,
  testId = id,
  placeholder = 'e.g., 1 Queen Street, Auckland 1010',
  value,
  onChange,
  onSelect,
  onClear,
  onFocus,
  onError,
  onClearError,
  autoClearOnFocus = false,
  icon,
  dropdownZIndex = 'z-50',
  className = '',
  disabled = false,
  apiError = false,
  transitMode,
  headerRight,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [internalApiError, setInternalApiError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeSearchRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    onChange(val);
    setHighlightedIndex(-1);

    // Cancel in-flight fetch request on new keystroke
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear the maintenance/error banner on every input change
    setInternalApiError(false);
    if (onClearError) {
      onClearError();
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const cleanVal = val.trim();
    if (cleanVal.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowDropdown(true);

    // 300ms debounce to avoid spamming /api/geocode on every keystroke
    debounceTimerRef.current = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const searchId = ++activeSearchRef.current;

      // Clear the maintenance/error banner before dispatching a query
      setInternalApiError(false);
      if (onClearError) {
        onClearError();
      }

      try {
        const results = await searchAucklandAddresses(cleanVal, undefined, {
          transitMode,
          signal: controller.signal,
        });

        if (!controller.signal.aborted && activeSearchRef.current === searchId) {
          setSuggestions(results);
          setInternalApiError(false);
          if (onClearError) {
            onClearError();
          }
        }
      } catch (err) {
        // Catch 'AbortError' without UI errors
        if (
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError') ||
          (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'AbortError')
        ) {
          return;
        }

        console.error('Geocoding autocomplete search error:', err);
        if (activeSearchRef.current === searchId) {
          setSuggestions([]);
          setInternalApiError(true);
          if (onError) onError(); // Fire callback to trigger parent banner
        }
      } finally {
        // Only disable isLoading if request not aborted
        if (!controller.signal.aborted && activeSearchRef.current === searchId) {
          setIsLoading(false);
        }
      }
    }, 300);
  };

  const handleSelect = (item: GeocodingResult) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery(item.placeName || item.address || '');
    setShowDropdown(false);
    setSuggestions([]);
    setIsLoading(false);
    setInternalApiError(false);
    if (onClearError) {
      onClearError();
    }
    onSelect(item);
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery('');
    setShowDropdown(false);
    setSuggestions([]);
    setIsLoading(false);
    setInternalApiError(false);
    if (onClearError) {
      onClearError();
    }
    onChange('');
    if (onClear) {
      onClear();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {(label || headerRight) && (
        <div className="flex items-center justify-between gap-1 min-h-[24px]">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 shrink min-w-0"
            >
              {icon}
              <span className="truncate">{label}</span>
            </label>
          )}
          {headerRight && <div className="flex items-center gap-1.5 shrink-0">{headerRight}</div>}
        </div>
      )}

      <div className="relative">
        <div className="relative flex items-center">
          <input
            id={id}
            data-testid={testId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showDropdown && suggestions.length > 0}
            aria-controls={`${id}-listbox`}
            aria-label={label || placeholder}
            aria-invalid={apiError || internalApiError}
            type="text"
            value={query}
            disabled={disabled || apiError}
            placeholder={placeholder}
            onChange={(e) => handleSearch(e.target.value)}
            onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
            onFocus={(e) => {
              if (autoClearOnFocus && query) {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                  abortControllerRef.current = null;
                }
                if (debounceTimerRef.current) {
                  clearTimeout(debounceTimerRef.current);
                }
                setQuery('');
                setShowDropdown(false);
                setSuggestions([]);
                setIsLoading(false);
                setInternalApiError(false);
                if (onClearError) {
                  onClearError();
                }
                onChange('');
                if (onClear) {
                  onClear();
                }
              }
              if (onFocus) {
                onFocus(e);
              }
              if (!autoClearOnFocus && suggestions.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
          />

          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none"
            aria-hidden="true"
          />

          {isLoading ? (
            <Loader2
              className="w-4 h-4 text-emerald-400 absolute right-3 animate-spin pointer-events-none"
              aria-hidden="true"
              data-testid={`${testId}-loader`}
            />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              data-testid={`${testId}-clear-btn`}
              aria-label="Clear address input"
              className="absolute right-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 min-h-[24px] min-w-[24px] flex items-center justify-center transition"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Live Suggestions Dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            id={`${id}-listbox`}
            role="listbox"
            data-testid={`${testId}-dropdown`}
            className={`absolute ${dropdownZIndex} left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800 animate-in fade-in duration-150`}
          >
            {suggestions.map((item, index) => {
              const isHighlighted = highlightedIndex === index;
              return (
                <button
                  key={item.id || item.address || index}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  type="button"
                  data-testid={`${testId}-suggestion-${index}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full text-left px-3.5 py-2.5 transition flex flex-col gap-0.5 min-h-[44px] justify-center ${
                    isHighlighted ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/80 text-slate-200'
                  }`}
                >
                  <span className="text-xs font-semibold text-white tracking-wide">
                    {item.text || item.address}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {item.placeName || item.address}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}