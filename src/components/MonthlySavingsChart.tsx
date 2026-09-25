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
      Fuel: driving.monthlyFuelCost,
      RUC: driving.monthlyRucCost,
      Parking: driving.monthlyParkingCost,
      Maintenance: driving.monthlyMaintenanceCost,
      TransitFare: 0,
      Total: driving.monthlyTotal,
    },
    {
      category: 'Public Transport',
      Fuel: 0,
      RUC: 0,
      Parking: 0,
      Maintenance: 0,
      TransitFare: transit.monthlyTotal,
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
        <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
          {payload.map((entry, index) => {
            if (entry.value === 0) return null;
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-slate-100">${Number(entry.value).toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-700/60 shadow-xl space-y-4">
      {/* Chart Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            Financial Cost Breakdown & Projections
          </h3>
          <p className="text-xs text-slate-400">
            {viewMode === 'breakdown'
              ? 'Monthly stacked components of driving versus AT HOP fare'
              : '12-month cumulative expenditure and net savings trajectory'}
          </p>
        </div>

        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('breakdown')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'breakdown'
                ? 'bg-slate-800 text-teal-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Monthly Stacked
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'cumulative'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            12-Month Arbitrage
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[280px] sm:h-[320px] w-full pt-2">
        {viewMode === 'breakdown' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                formatter={(val) => <span className="text-slate-300">{val}</span>}
              />
              <Bar dataKey="Fuel" stackId="a" fill="#f59e0b" name="Fuel / Energy" radius={[0, 0, 0, 0]} />
              <Bar dataKey="RUC" stackId="a" fill="#eab308" name="NZTA RUC" />
              <Bar dataKey="Parking" stackId="a" fill="#0284c7" name="Central Parking" />
              <Bar dataKey="Maintenance" stackId="a" fill="#64748b" name="Wear & Tear" />
              <Bar
                dataKey="TransitFare"
                stackId="a"
                fill="#10b981"
                name="AT HOP Capped Fare"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorDriving" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTransit" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="monthShort" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                formatter={(val) => <span className="text-slate-300">{val}</span>}
              />
              <Area
                type="monotone"
                dataKey="Driving"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorDriving)"
                name="Cumulative Driving ($)"
              />
              <Area
                type="monotone"
                dataKey="Transit"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTransit)"
                name="Cumulative Transit ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
