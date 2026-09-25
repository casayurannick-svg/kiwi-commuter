'use client';

import CommuteForm from '@/components/CommuteForm';
import ComparisonCard from '@/components/ComparisonCard';
import FuelRadarWidget from '@/components/FuelRadarWidget';
import MonthlySavingsChart from '@/components/MonthlySavingsChart';
import RouteMap from '@/components/RouteMap';
import { getSuburbById } from '@/config/suburbs';
import { calculateArbitrage } from '@/lib/calculator';
import { CommuteInput } from '@/types';
import {
  Bus,
  Compass,
  Fuel,
  MapPin,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

const QUICK_COMMUTE_PRESETS = [
  { name: 'Albany ➔ CBD (NX1 Rapid)', origin: 'albany', dest: 'cbd', days: 5 },
  { name: 'Henderson ➔ CBD (Western Train)', origin: 'henderson', dest: 'cbd', days: 5 },
  { name: 'Takapuna ➔ CBD (Busway)', origin: 'takapuna', dest: 'cbd', days: 5 },
  { name: 'Manukau ➔ CBD (Southern Line)', origin: 'manukau', dest: 'cbd', days: 5 },
  { name: 'Devonport ➔ CBD (Ferry)', origin: 'devonport', dest: 'cbd', days: 5 },
  { name: 'Hobsonville ➔ CBD (Ferry/WX1)', origin: 'hobsonville', dest: 'cbd', days: 5 },
];

export default function DashboardPage() {
  const [commuteInput, setCommuteInput] = useState<CommuteInput>({
    originSuburbId: 'albany',
    destinationSuburbId: 'cbd',
    daysPerWeek: 5,
    vehicleType: 'petrol91',
    parkingDailyRate: 18.0,
    parkingDaysPerWeek: 5,
    concession: 'adult',
    includeMaintenanceWear: true,
    carpoolPassengers: 1,
  });

  const origin = useMemo(() => getSuburbById(commuteInput.originSuburbId), [commuteInput.originSuburbId]);
  const destination = useMemo(
    () => getSuburbById(commuteInput.destinationSuburbId),
    [commuteInput.destinationSuburbId]
  );

  const arbitrage = useMemo(() => calculateArbitrage(commuteInput), [commuteInput]);

  const applyPreset = (originId: string, destId: string, days: number) => {
    setCommuteInput((prev) => ({
      ...prev,
      originSuburbId: originId,
      destinationSuburbId: destId,
      daysPerWeek: days,
      parkingDaysPerWeek: days,
    }));
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bus className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Kiwi Commuter <span className="text-emerald-400 font-bold">Arbitrage</span>
                </h1>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">
                  NZ 2024–2026
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Auckland Driving Costs (Fuel + NZTA RUC + CBD Parking) vs. AT HOP $50 7-Day Cap
              </p>
            </div>
          </div>

          {/* Key Badges */}
          <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
            <div className="bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-white">$50</span>
              <span className="text-slate-400">7-Day PT Cap</span>
            </div>
            <div className="bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-300">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-white">$2.72</span>
              <span className="text-slate-400">MBIE 91/L</span>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Corridor Selection Bar */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 sm:px-8 py-2.5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs">
          <span className="text-slate-400 shrink-0 font-medium flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-teal-400" />
            Top Corridors:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {QUICK_COMMUTE_PRESETS.map((p) => {
              const isActive =
                commuteInput.originSuburbId === p.origin && commuteInput.destinationSuburbId === p.dest;
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.origin, p.dest, p.days)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 space-y-8">
        {/* Top Split Layout: Configuration & Live Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols on lg): Commute Configuration & Fuel Radar */}
          <div className="lg:col-span-5 space-y-6">
            <CommuteForm input={commuteInput} onChange={setCommuteInput} />
            <FuelRadarWidget />
          </div>

          {/* Right Column (7 cols on lg): Comparison Hero, Visual Charts, and Interactive Map */}
          <div className="lg:col-span-7 space-y-6">
            <ComparisonCard arbitrage={arbitrage} input={commuteInput} />
            <MonthlySavingsChart arbitrage={arbitrage} />
            <RouteMap
              origin={origin}
              destination={destination}
              distanceKm={arbitrage.distanceKm}
              drivingTimeMins={arbitrage.drivingTimeMins}
              transitTimeMins={arbitrage.transitTimeMins}
            />
          </div>
        </div>

        {/* Regulatory & Economic Context Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          {/* Card 1: AT HOP $50 Cap */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              AT HOP $50 7-Day Fare Cap
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Introduced by Auckland Transport, commuters pay no more than $50 for all bus, train, and
              inner-harbour ferry travel (including Devonport, Birkenhead, and Half Moon Bay) within any rolling
              7-day period. Once the cap is hit, remaining rides are 100% free!
            </p>
          </div>

          {/* Card 2: 2024 NZTA RUC Policy */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              NZTA Road User Charges (RUC)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Since 1 April 2024, light electric vehicles (BEVs) pay $76 per 1,000 km ($0.076/km), and plug-in
              hybrids (PHEVs) pay $38 per 1,000 km. Standard diesel vehicles pay $76/1,000 km. This dashboard
              dynamically includes RUC liabilities into vehicle operating costs.
            </p>
          </div>

          {/* Card 3: Central Auckland Parking Reality */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-700/60 shadow space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
              <MapPin className="w-4 h-4" />
              Central Auckland Parking Premium
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Central Auckland CBD parking typically ranges from $16–$24/day for early bird, and $28–$35/day
              for casual commercial bays. Over 20 commute days per month, parking alone accounts for $320–$500+,
              often exceeding total fuel expenses.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#060a12] border-t border-slate-800/80 px-4 sm:px-8 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Kiwi Commuter Dashboard</span>
            <span>•</span>
            <span>Data from MBIE Fuel Monitoring, Auckland Transport GTFS, and NZTA Waka Kotahi</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-500">Built for Auckland commuters</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">
              Next.js 14 App Router
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
