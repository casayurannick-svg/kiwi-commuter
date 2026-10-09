'use client';

import React from 'react';
import { useState } from 'react';

// Helper to format numbers as currency (NZ$ style)
const formatCurrency = (val: number) => `$${val.toFixed(2)}`;

export default function CostOfTheOffice() {
  // State for each input slider
  const [days, setDays] = useState<number>(5);
  const [parking, setParking] = useState<number>(0);
  const [coffee, setCoffee] = useState<number>(0);
  const [lunch, setLunch] = useState<number>(0);

  // Calculate weekly totals (multiply daily cost by days)
  const totalParking = parking * days;
  const totalCoffee = coffee * days;
  const totalLunch = lunch * days;
  const totalTax = totalParking + totalCoffee + totalLunch;

  // Build URL for OG receipt endpoint (transport set to 0 for now)
  const receiptUrl = `/api/og/receipt?days=${days}&transport=0&parking=${parking}&coffee=${coffee}&lunch=${lunch}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      {/* Left column – sliders */}
      <div className="space-y-6 bg-slate-800 border border-slate-700 rounded p-4">
        <div>
          <label className="block font-medium mb-1" htmlFor="days">
            Days in office: {days}
          </label>
            <input
              id="days"
              type="range"
              min="1"
              max="7"
              step="1"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500"
            />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="parking">
            Daily parking cost (NZ$): {formatCurrency(parking)}
          </label>
          <input
            id="parking"
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={parking}
            onChange={(e) => setParking(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="coffee">
            Daily coffee cost (NZ$): {formatCurrency(coffee)}
          </label>
          <input
            id="coffee"
            type="range"
            min="0"
            max="100"
            step="0.5"
            value={coffee}
            onChange={(e) => setCoffee(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <div>
          <label className="block font-medium mb-1" htmlFor="lunch">
            Daily lunch cost (NZ$): {formatCurrency(lunch)}
          </label>
          <input
            id="lunch"
            type="range"
            min="0"
            max="200"
            step="0.5"
            value={lunch}
            onChange={(e) => setLunch(parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
        </div>
        <a
          href={receiptUrl}
          className="inline-block mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          View OG receipt image
        </a>
      </div>

      {/* Right column – visual receipt */}
      <div className="border border-slate-700 rounded p-6 bg-slate-800 shadow-sm text-slate-300">
        <h2 className="text-lg font-semibold mb-4">Weekly Cost Receipt</h2>
        <div className="space-y-2">
          <div className="text-emerald-400">Parking: {formatCurrency(totalParking)}</div>
          <div>Coffee: {formatCurrency(totalCoffee)}</div>
          <div>Lunch: {formatCurrency(totalLunch)}</div>
        </div>
        <hr className="border-t border-dashed my-4" />
        <div className="font-bold text-xl">Total Tax: {formatCurrency(totalTax)}</div>
      </div>
    </div>
  );
}
