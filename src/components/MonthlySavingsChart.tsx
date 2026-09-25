'use client';

import { ArbitrageResult } from '@/types';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface MonthlySavingsChartProps {
  arbitrage: ArbitrageResult;
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export default function MonthlySavingsChart({ arbitrage }: MonthlySavingsChartProps) {
  const [viewMode, setViewMode] = useState<'breakdown' | 'cumulative'>('breakdown');

  const { driving, transit } = arbitrage;

  // Breakdown Data
  const breakdownData = [
    {
      category: 'Private Driving',
      'Fuel / Power': driving.monthlyFuelCost,
      'NZTA RUC': driving.monthlyRucCost,
      'Central Parking': driving.monthlyParkingCost,
      'Wear & Tear': driving.monthlyMaintenanceCost,
      'AT HOP Fare': 0,
      Total: driving.monthlyTotal,
    },
    {
      category: 'Public Transport',
      'Fuel / Power': 0,
      'NZTA RUC': 0,
      'Central Parking': 0,
      'Wear & Tear': 0,
      'AT HOP Fare': transit.monthlyTotal,
      Total: transit.monthlyTotal,
    },
  ];

  // 12-month Cumulative Projection Data
  const cumulativeData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const drivingCumulative = driving.monthlyTotal * month;
    const transitCumulative = transit.monthlyTotal * month;
    const cumulativeSavings = drivingCumulative - transitCumulative;

    return {
      month: `Month ${month}`,
      monthShort: `M${month}`,
      Driving: Math.round(drivingCumulative),
      Transit: Math.round(transitCumulative),
      CumulativeSavings: Math.round(cumulativeSavings),
    };
  });

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry, index) => {
            if (entry.value === 0) return null;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-100 tabular-nums">
                  ${Number(entry.value).toFixed(2)} NZD
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            Cost Breakdown
          </h3>
          <p className="text-[11px] text-slate-400">
            {viewMode === 'breakdown' ? 'Monthly stacked components' : '12-month trajectory'}
          </p>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
          <button
            onClick={() => setViewMode('breakdown')}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              viewMode === 'breakdown'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Monthly
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
              viewMode === 'cumulative'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChartIcon className="w-3 h-3" />
            12-Month
          </button>
        </div>
      </div>

      {/* Chart Canvas with low-opacity minimal gridlines */}
      <div className="h-[220px] sm:h-[240px] w-full pt-1">
        {viewMode === 'breakdown' ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={breakdownData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                formatter={(val) => <span className="text-slate-300">{val}</span>}
              />
              <Bar dataKey="Fuel / Power" stackId="a" fill="#f59e0b" name="Fuel / Power" />
              <Bar dataKey="NZTA RUC" stackId="a" fill="#eab308" name="NZTA RUC" />
              <Bar dataKey="Central Parking" stackId="a" fill="#0284c7" name="Central Parking" />
              {arbitrage.driving.monthlyMaintenanceCost > 0 && (
                <Bar dataKey="Wear & Tear" stackId="a" fill="#64748b" name="Wear & Tear" />
              )}
              <Bar
                dataKey="AT HOP Fare"
                stackId="a"
                fill="#10b981"
                name="AT HOP Fare"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cumulativeData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDriving" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTransit" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
              <XAxis dataKey="monthShort" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                formatter={(val) => <span className="text-slate-300">{val}</span>}
              />
              <Area
                type="monotone"
                dataKey="Driving"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDriving)"
                name="Driving ($)"
              />
              <Area
                type="monotone"
                dataKey="Transit"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTransit)"
                name="Transit ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
