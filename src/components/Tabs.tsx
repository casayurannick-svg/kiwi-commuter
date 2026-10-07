'use client';

import React, { useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabId } from '@/types';
import { BarChart3, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

export interface TabItem {
  id: TabId;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const TABS: TabItem[] = [
  {
    id: 'summary',
    label: 'Summary',
    icon: BarChart3,
  },
  {
    id: 'compare',
    label: 'Compare',
    icon: ArrowLeftRight,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: SlidersHorizontal,
  },
];

export interface TabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  className?: string;
  stickyTopClass?: string;
}

/**
 * Sticky tab navigation shell supporting keyboard accessibility, ARIA tab patterns,
 * zero layout shift, and browser history synchronization for deep linking and back/forward navigation.
 */
export default function Tabs({
  activeTab: controlledActiveTab,
  onTabChange,
  className = '',
  stickyTopClass = 'top-[57px]',
}: TabsProps) {
  const searchParams = useSearchParams();
  const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Resolve current active tab (prop takes precedence, then searchParams, fallback to 'summary')
  const paramTab = searchParams?.get('tab')?.toLowerCase() || searchParams?.get('activeTab')?.toLowerCase();
  const currentTab: TabId =
    controlledActiveTab ||
    (paramTab === 'compare' || paramTab === 'advanced' || paramTab === 'summary'
      ? (paramTab as TabId)
      : 'summary');

  const handleSelectTab = useCallback(
    (tabId: TabId) => {
      if (onTabChange) {
        onTabChange(tabId);
      }

      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (tabId === 'summary') {
          url.searchParams.delete('tab');
          url.searchParams.delete('activeTab');
        } else {
          url.searchParams.set('tab', tabId);
        }
        window.history.pushState(null, '', url.pathname + (url.search ? url.search : ''));
      }
    },
    [onTabChange]
  );

  // W3C ARIA Keyboard Navigation for Tabs
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex = -1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      targetIndex = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      targetIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      targetIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      targetIndex = TABS.length - 1;
    }

    if (targetIndex !== -1) {
      const targetTab = TABS[targetIndex];
      tabButtonRefs.current[targetIndex]?.focus();
      handleSelectTab(targetTab.id);
    }
  };

  return (
    <nav
      aria-label="Commute dashboard view navigation"
      className={`sticky ${stickyTopClass} z-20 w-full bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800/80 transition-colors ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div
          role="tablist"
          aria-label="Dashboard navigation tabs"
          className="flex items-center space-x-1 sm:space-x-2 py-2 min-h-[52px]"
        >
          {TABS.map((tab, index) => {
            const isActive = currentTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabButtonRefs.current[index] = el;
                }}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleSelectTab(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090d16] ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] px-1.5 py-0.2 font-mono rounded bg-slate-800 text-slate-300">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
