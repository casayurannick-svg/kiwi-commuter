'use client';

import {
  BatteryCharging,
  Fuel,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface FuelRadarWidgetProps {
  initialFuelData?: {
    regular_91: number;
    premium_95: number;
    diesel: number;
    date: string;
    source: 'supabase' | 'fallback';
  };
}

export default function FuelRadarWidget({ initialFuelData }: FuelRadarWidgetProps = {}) {
  const [loading, setLoading] = useState(false);
  const [benchmarkDate, setBenchmarkDate] = useState<string>(initialFuelData?.date ?? '');
  const [price91, setPrice91] = useState<number>(initialFuelData?.regular_91 ?? 2.72);
  const [price95, setPrice95] = useState<number>(initialFuelData?.premium_95 ?? 2.94);
  const [priceDiesel, setPriceDiesel] = useState<number>(initialFuelData?.diesel ?? 2.05);
  const [priceEv] = useState<number>(0.28);

  const fetchFuel = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fuel');
      if (res.ok) {
        const json = await res.json();
        if (json.regular_91) setPrice91(json.regular_91);
        if (json.premium_95) setPrice95(json.premium_95);
        if (json.diesel) setPriceDiesel(json.diesel);
        if (json.date) setBenchmarkDate(json.date);
      }
    } catch (e) {
      console.warn('Failed to load live fuel snapshots:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialFuelData) {
      fetchFuel();
    }
  }, [initialFuelData]);

  const standard50LFillCost = Math.round(price91 * 50);

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">NZ Pump Benchmark</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.5 rounded border border-slate-700">
            {benchmarkDate ? `MBIE ${benchmarkDate}` : 'MBIE Sync'}
          </span>
        </div>

        <button
          onClick={fetchFuel}
          disabled={loading}
          className="text-slate-400 hover:text-slate-200 transition p-1 rounded-md"
          title="Refresh prices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {/* Fuel Rate Pill Strip (Horizontal & Compact) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* 91 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">91 Unleaded</span>
          <span className="text-sm font-black text-amber-400 tabular-nums">${price91.toFixed(2)}/L</span>
        </div>

        {/* 95 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">95 Premium</span>
          <span className="text-sm font-black text-slate-200 tabular-nums">${price95.toFixed(2)}/L</span>
        </div>

        {/* Diesel */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-center">
          <span className="text-[10px] text-slate-400 block font-medium">Diesel (+RUC)</span>
          <span className="text-sm font-black text-amber-300 tabular-nums">${priceDiesel.toFixed(2)}/L</span>
        </div>

        {/* EV */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-2 text-center">
          <span className="text-[10px] text-slate-400 block font-medium flex items-center justify-center gap-1">
            <BatteryCharging className="w-2.5 h-2.5 text-teal-400" /> EV Power
          </span>
          <span className="text-sm font-black text-teal-400 tabular-nums">${priceEv.toFixed(2)}/kWh</span>
        </div>
      </div>

      {/* Quick Tip Strip */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800/80">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Filling a 50L tank currently costs ~${standard50LFillCost}</span>
        </span>
        <span className="text-[11px] text-emerald-400 font-medium">~{(standard50LFillCost / 50).toFixed(1)} wks transit</span>
      </div>
    </div>
  );
}
