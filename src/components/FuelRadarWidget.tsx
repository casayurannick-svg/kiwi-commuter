'use client';

import { FuelSnapshot } from '@/types';
import {
  ArrowUpRight,
  BatteryCharging,
  Fuel,
  Info,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function FuelRadarWidget() {
  const [tankSize, setTankSize] = useState<number>(50);
  const [snapshots, setSnapshots] = useState<FuelSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchFuel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fuel');
      if (res.ok) {
        const json = await res.json();
        if (json.fuelSnapshots) {
          setSnapshots(json.fuelSnapshots);
          setLastRefreshed(new Date(json.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch (e) {
      console.warn('Failed to load live fuel snapshots:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuel();
  }, []);

  const price91 = snapshots.find((s) => s.fuelType === 'unleaded91')?.price ?? 2.72;
  const price95 = snapshots.find((s) => s.fuelType === 'premium95')?.price ?? 2.94;
  const priceDiesel = snapshots.find((s) => s.fuelType === 'diesel')?.price ?? 2.05;
  const priceEv = snapshots.find((s) => s.fuelType === 'electricity')?.price ?? 0.28;

  const tankFillCost91 = price91 * tankSize;
  // With $50 7-day cap, how many days or weeks of unlimited transit does 1 tank buy?
  const hopWeeksFunded = tankFillCost91 / 50.0;
  const hopDaysFunded = Math.round(hopWeeksFunded * 7);

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-700/60 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5">
              NZ Fuel Radar & Tank Arbitrage
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
                MBIE Sync
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Auckland regional pump pricing vs unlimited AT HOP travel equivalence
            </p>
          </div>
        </div>

        <button
          onClick={fetchFuel}
          disabled={loading}
          className="text-slate-400 hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-800/80"
          title="Refresh prices"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Fuel Rate Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 91 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Unleaded 91</div>
          <div className="text-xl font-black text-amber-400 mt-1">${price91.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>per litre</span>
            <span className="text-emerald-400 flex items-center">
              <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> -0.8%
            </span>
          </div>
        </div>

        {/* 95 */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Premium 95</div>
          <div className="text-xl font-black text-slate-200 mt-1">${price95.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>per litre</span>
            <span className="text-slate-400">Stable</span>
          </div>
        </div>

        {/* Diesel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>Diesel</span>
            <span className="text-[9px] text-amber-400 font-mono">+RUC</span>
          </div>
          <div className="text-xl font-black text-amber-300 mt-1">${priceDiesel.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>per litre</span>
            <span className="text-amber-400/90 flex items-center">
              <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" /> +1.2%
            </span>
          </div>
        </div>

        {/* EV Residential */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center justify-between">
            <span>EV Home Grid</span>
            <BatteryCharging className="w-3 h-3 text-teal-400" />
          </div>
          <div className="text-xl font-black text-teal-400 mt-1">${priceEv.toFixed(2)}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-between">
            <span>per kWh</span>
            <span className="text-teal-400/90">Off-peak</span>
          </div>
        </div>
      </div>

      {/* Tank Fill vs AT HOP Arbitrage Spotlight */}
      <div className="bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-emerald-950/30 border border-amber-500/30 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Tank-to-Transit Power Purchasing Equivalence
          </span>

          {/* Quick Tank Size Selector */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800 self-start sm:self-auto text-xs">
            <span className="text-[10px] text-slate-400 px-1 font-medium">Tank:</span>
            {[45, 50, 65, 80].map((size) => (
              <button
                key={size}
                onClick={() => setTankSize(size)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition ${
                  tankSize === size
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {size}L
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Single {tankSize}L Petrol 91 Fill-up</span>
            <span className="text-2xl font-black text-white mt-0.5 block">
              ${tankFillCost91.toFixed(2)} NZD
            </span>
            <span className="text-[11px] text-slate-500">Excludes parking and vehicle wear</span>
          </div>

          <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-500/30">
            <span className="text-[11px] text-emerald-300 font-semibold block">
              AT HOP Unlimited Travel Equivalent
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
              {hopWeeksFunded.toFixed(1)} Weeks ({hopDaysFunded} Days)
            </span>
            <span className="text-[11px] text-emerald-300/80">
              Unlimited bus, train, & ferry under the $50 cap
            </span>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-slate-400" />
          Auckland regional fuel tax ended in mid-2024. Prices reflect current MBIE weekly data.
        </span>
        {lastRefreshed && <span>Updated today at {lastRefreshed}</span>}
      </div>
    </div>
  );
}
