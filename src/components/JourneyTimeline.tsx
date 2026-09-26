'use client';

import React from 'react';
import {
  Car,
  Bus,
  Train,
  Ship,
  Bike,
  Footprints,
  Zap,
  Building,
  Clock,
  DollarSign,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { CommuteComparisonResult, CommuteInput, JourneyLeg } from '@/types';

interface JourneyTimelineProps {
  arbitrage: CommuteComparisonResult;
  input: CommuteInput;
  onFirstMileModeChange?: (mode: 'DRIVE' | 'WALK' | 'SCOOTER') => void;
}

export default function JourneyTimeline({
  arbitrage,
  input,
  onFirstMileModeChange,
}: JourneyTimelineProps) {
  const { journeyLegs, nearestStation, transit } = arbitrage;

  if (!journeyLegs || journeyLegs.length === 0) {
    return null;
  }

  // Calculate totals across legs
  const totalDurationMins = journeyLegs.reduce((acc, leg) => acc + leg.durationMins, 0);
  const totalOneWayCost = journeyLegs.reduce((acc, leg) => acc + leg.cost, 0);

  const getLegIcon = (leg: JourneyLeg) => {
    switch (leg.mode) {
      case 'DRIVE':
        return <Car className="w-4 h-4 text-amber-400" />;
      case 'TRAIN':
        return <Train className="w-4 h-4 text-emerald-400" />;
      case 'BUS':
        return <Bus className="w-4 h-4 text-sky-400" />;
      case 'FERRY':
        return <Ship className="w-4 h-4 text-cyan-400" />;
      case 'EBIKE':
        return <Bike className="w-4 h-4 text-emerald-400" />;
      case 'SCOOTER':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'WALK':
      default:
        return leg.type === 'LAST_MILE' ? (
          <Building className="w-4 h-4 text-indigo-400" />
        ) : (
          <Footprints className="w-4 h-4 text-purple-400" />
        );
    }
  };

  const getLegBadgeColor = (type: JourneyLeg['type']) => {
    switch (type) {
      case 'FIRST_MILE':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'TRANSIT':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'LAST_MILE':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div
      data-testid="journey-timeline"
      className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Segmented Journey Timeline</h3>
            <p className="text-xs text-slate-400">
              Multimodal breakdown from doorstep to destination desk
            </p>
          </div>
        </div>

        {/* Nearest Station Hub Badge */}
        {nearestStation && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Nearest Hub:</span>
            <span className="font-semibold text-white">{nearestStation.name}</span>
            {nearestStation.hasParkAndRide && (
              <span className="ml-1 px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded font-medium">
                P&R
              </span>
            )}
          </div>
        )}
      </div>

      {/* First-Mile Mode Toggle (if callback provided and not e-bike) */}
      {onFirstMileModeChange && input.transitMode !== 'EBIKE' && (
        <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 font-medium">First-Mile Mode to Station:</span>
          <div className="flex items-center gap-1">
            {(['DRIVE', 'WALK', 'SCOOTER'] as const).map((mode) => {
              const active = (input.firstMileMode || 'DRIVE') === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onFirstMileModeChange(mode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mode === 'DRIVE' ? '🚗 Drive' : mode === 'WALK' ? '🚶 Walk' : '⚡ Scooter'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Nodes */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {journeyLegs.map((leg, index) => {
          return (
            <div key={leg.id || index} className="relative group">
              {/* Timeline Node Dot / Icon */}
              <div className="absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md">
                {getLegIcon(leg)}
              </div>

              {/* Node Card Content */}
              <div className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl p-3.5 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${getLegBadgeColor(
                        leg.type
                      )}`}
                    >
                      {leg.title}
                    </span>
                    {leg.notes && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        {leg.notes}
                      </span>
                    )}
                  </div>

                  {/* Leg Cost & Time Badge */}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {leg.durationMins} mins
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      {leg.costFormatted}
                    </span>
                  </div>
                </div>

                {/* Route Path (Origin -> Destination) */}
                <div className="flex items-center text-xs text-slate-300 gap-1.5 font-medium">
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {leg.originName}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {leg.destinationName}
                  </span>
                  <span className="text-slate-500 ml-auto shrink-0 text-[11px]">
                    {leg.distanceKm} km
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Commute Summary Footer */}
      <div className="pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 font-medium">One-Way Time</p>
          <p className="text-sm font-bold text-white">{totalDurationMins} mins</p>
        </div>
        <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 font-medium">One-Way Cost</p>
          <p className="text-sm font-bold text-emerald-400">${totalOneWayCost.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 font-medium">Daily Return Fare</p>
          <p className="text-sm font-bold text-sky-400">${transit.dailyFare.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 font-medium">Monthly Total</p>
          <p className="text-sm font-bold text-emerald-400">
            ${transit.monthlyTotal.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
