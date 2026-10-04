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
    };
  }, []);

  const handleSearch = async (val: string) => {
    setQuery(val);
    onChange(val);
    setHighlightedIndex(-1);
    setInternalApiError(false);

    const cleanVal = val.trim();
    if (cleanVal.length >= 2) {
      setIsLoading(true);
      setShowDropdown(true);
      const searchId = ++activeSearchRef.current;

      try {
        const results = await searchAucklandAddresses(cleanVal, undefined, {
          transitMode,
        });
        if (activeSearchRef.current === searchId) {
          setSuggestions(results);
          // Turso fallback succeeded: clear any prior error state so banners dismiss
          // and inputs re-enable automatically.
          if (internalApiError) {
            setInternalApiError(false);
          }
        }
      } catch (err) {
        console.error('Geocoding autocomplete search error:', err);
        if (activeSearchRef.current === searchId) {
          setSuggestions([]);
          setInternalApiError(true);
          if (onError) onError(); // Fire callback to trigger parent banner
        }
      } finally {
        if (activeSearchRef.current === searchId) {
          setIsLoading(false);
        }
      }
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
    }
  };

  const handleSelect = (item: GeocodingResult) => {
    setQuery(item.placeName || item.address || '');
    setShowDropdown(false);
    setSuggestions([]);
    onSelect(item);
  };

  const handleClear = () => {
    setQuery('');
    setShowDropdown(false);
    setSuggestions([]);
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
            type="text"
            value={query}
            disabled={disabled || apiError || internalApiError}
            placeholder={placeholder}
            onChange={(e) => handleSearch(e.target.value)}
            onInput={(e) => handleSearch((e.target as HTMLInputElement).value)}
            onFocus={(e) => {
              if (autoClearOnFocus && query) {
                setQuery('');
                setShowDropdown(false);
                setSuggestions([]);
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