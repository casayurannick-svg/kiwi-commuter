'use client';

import React, { useState } from 'react';
import { CommuteInput, CommuteComparisonResult } from '@/types';
import { getSuburbById, AUCKLAND_SUBURBS } from '@/config/suburbs';
import VerdictCard from '@/components/VerdictCard';
import ExpandableCostRow, { CostItem } from '@/components/ExpandableCostRow';
import { MapPin, Car, Bus, Clock, Sliders, Check } from 'lucide-react';

export interface SummaryTabProps {
  commuteInput: CommuteInput;
  setCommuteInput: React.Dispatch<React.SetStateAction<CommuteInput>>;
  arbitrage: CommuteComparisonResult;
  onChangeTab?: (tab: 'compare' | 'advanced') => void;
}

/**
 * SummaryTab (STORY-4)
 * Layered disclosure UI featuring trip line, plain-language verdict card,
 * expandable "What you'd stop paying" vs "What you'd still pay" cost rows,
 * assumption footnote, and daily travel time cards.
 */
export default function SummaryTab({
  commuteInput,
  setCommuteInput,
  arbitrage,
}: SummaryTabProps) {
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isEditingWear, setIsEditingWear] = useState(false);

  const origin = getSuburbById(commuteInput.originSuburbId);
  const destination = getSuburbById(commuteInput.destinationSuburbId);

  const originName = origin?.name || commuteInput.originSuburbId || 'Mt Roskill';
  const destinationName = destination?.name || commuteInput.destinationSuburbId || 'Parnell';
  const daysText = `${commuteInput.daysPerWeek} day${commuteInput.daysPerWeek > 1 ? 's' : ''} a week`;

  // Model values strictly from Story 1 cost model
  const stops = arbitrage.stops || {
    fuel: 0,
    ruc: 0,
    parking: 0,
    distanceWear: 3,
    total: 0,
  };

  const stays = arbitrage.stays || {
    insurance: 0,
    rego: 0,
    wof: 0,
    depreciation: 0,
    timeMaintenance: 0,
    total: 0,
  };

  const fullCost = arbitrage.fullCost ?? stops.total + stays.total;
  const wearAssumption = commuteInput.distanceWearWeekly ?? 3.0;

  // Row 1: What you'd stop paying (avoidable costs: fuel, RUC, parking, distance-wear)
  const stopPayingItems: CostItem[] = [
    { label: 'Fuel / Energy', amount: stops.fuel },
    ...(stops.ruc > 0 ? [{ label: 'Road User Charges (RUC)', amount: stops.ruc }] : []),
    { label: 'Parking', amount: stops.parking },
    { label: 'Servicing & wear', amount: stops.distanceWear, detail: 'Distance-based tire and brake wear' },
  ];

  // Row 2: What you'd still pay (fixed costs: insurance, rego/WOF, depreciation, other servicing)
  const stillPayItems: CostItem[] = [
    { label: 'Insurance', amount: stays.insurance },
    { label: 'Rego & WoF', amount: Math.round((stays.rego + stays.wof) * 100) / 100 },
    ...(stays.depreciation > 0 ? [{ label: 'Vehicle depreciation', amount: stays.depreciation }] : []),
    {
      label: 'Other servicing',
      amount: 'Included',
      isIncluded: true,
      detail: 'Time-based annual maintenance',
    },
  ];

  // Daily commute times
  const carDailyMins = (arbitrage.drivingTimeMins || 18) * 2;
  const transitDailyMins = (arbitrage.transitTimeMins || 46) * 2;
  const rawMode = commuteInput.transitMode || origin?.primaryTransitMode || 'Bus';
  const transitModeName =
    rawMode === 'FERRY' || rawMode.toLowerCase() === 'ferry'
      ? 'ferry'
      : rawMode === 'TRAIN' || rawMode.toLowerCase() === 'train'
      ? 'train'
      : 'bus';

  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto py-2">
      {/* 1. Trip Line with Edit Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-2 text-sm sm:text-base">
          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-white tracking-tight">
            {originName} to {destinationName}, {daysText}
          </span>
          <button
            type="button"
            onClick={() => setIsEditingTrip((prev) => !prev)}
            aria-expanded={isEditingTrip}
            className="text-xs sm:text-sm font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-4 ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1"
          >
            {isEditingTrip ? 'Done' : 'Change'}
          </button>
        </div>

        <div className="text-xs text-slate-300 font-medium">
          Single Cost Model · 2026 Auckland Fares
        </div>
      </div>

      {/* Inline Trip Editor (conditionally shown when user clicks Change) */}
      {isEditingTrip && (
        <div className="p-4 sm:p-5 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Edit Commute Route &amp; Frequency
            </span>
            <button
              type="button"
              onClick={() => setIsEditingTrip(false)}
              className="text-xs text-emerald-400 font-medium hover:underline"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="origin-select" className="block text-xs font-medium text-slate-300 mb-1">
                Origin Suburb
              </label>
              <select
                id="origin-select"
                value={commuteInput.originSuburbId}
                onChange={(e) => setCommuteInput((prev) => ({ ...prev, originSuburbId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {AUCKLAND_SUBURBS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dest-select" className="block text-xs font-medium text-slate-300 mb-1">
                Destination Suburb
              </label>
              <select
                id="dest-select"
                value={commuteInput.destinationSuburbId}
                onChange={(e) => setCommuteInput((prev) => ({ ...prev, destinationSuburbId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                {AUCKLAND_SUBURBS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.region})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Days Commuting / Week
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCommuteInput((prev) => ({ ...prev, daysPerWeek: d, parkingDaysPerWeek: d }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                      commuteInput.daysPerWeek === d
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.5 Transit-Only Commute Banner (STORY-7) */}
      {commuteInput.hasCar === false && (
        <div
          data-testid="transit-only-banner"
          className="p-4 sm:p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 flex items-start gap-3.5 backdrop-blur-sm"
        >
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Transit-Only Commute
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              You do not own or drive a car for this commute. Public transit costs ${arbitrage.transitCost.toFixed(2)} a week (${Math.round(arbitrage.transitCost * 52).toLocaleString('en-NZ')} a year) in fares with zero vehicle depreciation, fuel, parking, or maintenance costs.
            </p>
          </div>
        </div>
      )}

      {/* 1.6 Parking Assumption Flag (STORY-7) */}
      {commuteInput.isParkingAssumed && (
        <div
          data-testid="parking-assumption-badge"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-medium"
        >
          <span>Assumed $24.50/day parking at work (Auckland typical weekday cap).</span>
        </div>
      )}

      {/* 2. Verdict Card (Headline + Natural Language Support Copy) */}
      <VerdictCard verdict={arbitrage.verdict} />

      {/* 3. Expandable Cost Rows (What you'd stop paying vs What you'd still pay) */}
      <div className="space-y-3 pt-1">
        <ExpandableCostRow
          id="stop-paying"
          title="What you'd stop paying"
          total={stops.total}
          items={stopPayingItems}
          defaultExpanded={true}
        />

        <ExpandableCostRow
          id="still-pay"
          title="What you'd still pay"
          total={stays.total}
          items={stillPayItems}
          defaultExpanded={false}
        />
      </div>

      {/* 4. Explicit Footnote with Wear Assumption & Change Link */}
      <div className="px-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <span>Per week. Total cost of the car for this commute: ${fullCost.toFixed(2)}. We assumed ${wearAssumption.toFixed(2)} of servicing and wear depends on how much you drive. </span>
        <button
          type="button"
          onClick={() => setIsEditingWear((prev) => !prev)}
          aria-expanded={isEditingWear}
          className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
        >
          {isEditingWear ? 'Done' : 'Change'}
        </button>
      </div>

      {/* Inline Wear Assumption Editor (conditionally shown when user clicks Change) */}
      {isEditingWear && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              Adjust Distance-Based Servicing &amp; Wear Assumption
            </span>
            <button
              type="button"
              onClick={() => setIsEditingWear(false)}
              className="text-xs text-emerald-400 font-medium hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Done
            </button>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={commuteInput.distanceWearWeekly ?? 3.0}
              onChange={(e) =>
                setCommuteInput((prev) => ({
                  ...prev,
                  distanceWearWeekly: parseFloat(e.target.value),
                  distanceWear: parseFloat(e.target.value),
                }))
              }
              className="flex-1 accent-emerald-500 cursor-pointer"
            />
            <div className="font-mono text-sm text-white font-bold min-w-[70px] text-right">
              ${(commuteInput.distanceWearWeekly ?? 3.0).toFixed(2)}/wk
            </div>
          </div>
          <p className="text-xs text-slate-300">
            NZ AA recommends ~$3.00/week for variable wear on short commutes, with remaining scheduled service assigned to fixed ownership.
          </p>
        </div>
      )}

      {/* 5. Daily Travel Time Cards ("By car, X min a day" & "By bus, Y min a day") */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* By Car Time Card */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-5 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-200 shrink-0">
              <Car className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Driving Time
              </div>
              <div className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                By car, {carDailyMins} min a day
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-300 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-300" />
            <span>{arbitrage.drivingTimeMins}m each way</span>
          </div>
        </div>

        {/* By Bus Time Card */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-5 backdrop-blur-sm shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Bus className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs text-slate-300 uppercase tracking-wider font-semibold">
                Public Transit Time
              </div>
              <div className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                By {transitModeName}, {transitDailyMins} min a day
              </div>
            </div>
          </div>

          <div className="text-right text-xs text-slate-300 flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-300" />
            <span>{arbitrage.transitTimeMins}m each way</span>
          </div>
        </div>
      </div>
    </div>
  );
}
