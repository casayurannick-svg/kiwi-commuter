'use client';

import { VEHICLE_PRESETS } from '@/config/fares.config';
import { AUCKLAND_SUBURBS } from '@/config/suburbs';
import { CommuteInput, ConcessionType, ParkingTier, VehiclePowertrain, VehicleType } from '@/types';
import {
  Car,
  ChevronDown,
  CreditCard,
  MapPin,
  Settings2,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import React, { useState } from 'react';

interface CommuteFormProps {
  input: CommuteInput;
  onChange?: (updated: CommuteInput) => void;
  onInputChange?: (updated: CommuteInput) => void;
}

const POWERTRAIN_OPTIONS: { id: VehicleType; powertrain: VehiclePowertrain; label: string; defaultConsumption: number; unit: string }[] = [
  { id: 'petrol91', powertrain: 'PETROL_91', label: 'Petrol 91', defaultConsumption: 7.6, unit: 'L/100km' },
  { id: 'petrol95', powertrain: 'PETROL_95', label: 'Petrol 95', defaultConsumption: 8.8, unit: 'L/100km' },
  { id: 'diesel', powertrain: 'DIESEL', label: 'Diesel', defaultConsumption: 8.4, unit: 'L/100km' },
  { id: 'phev', powertrain: 'PHEV', label: 'PHEV', defaultConsumption: 3.8, unit: 'L/100km' },
  { id: 'bev', powertrain: 'BEV', label: 'EV (BEV)', defaultConsumption: 16.5, unit: 'kWh/100km' },
];

const PARKING_SEGMENTS: { tier: ParkingTier | 'CUSTOM'; label: string; rate: number }[] = [
  { tier: 'CBD_EARLY_BIRD', label: 'CBD Early $22', rate: 22.0 },
  { tier: 'CBD_CASUAL', label: 'CBD Casual $35', rate: 35.0 },
  { tier: 'SUBURBAN_HUB', label: 'Suburban $14', rate: 14.0 },
  { tier: 'FREE', label: 'Free $0', rate: 0.0 },
  { tier: 'CUSTOM', label: 'Custom', rate: 18.0 },
];

export default function CommuteForm({ input, onChange, onInputChange }: CommuteFormProps) {
  const [isCustomRatesOpen, setIsCustomRatesOpen] = useState(true);
  const [selectedParkingTier, setSelectedParkingTier] = useState<ParkingTier | 'CUSTOM'>(() => {
    if (input.parkingTier) return input.parkingTier;
    const match = PARKING_SEGMENTS.find((p) => p.rate === input.parkingDailyRate);
    return match ? match.tier : 'CUSTOM';
  });

  const notifyChange = (updated: CommuteInput) => {
    if (onInputChange) onInputChange(updated);
    if (onChange) onChange(updated);
  };

  const currentVehicle = VEHICLE_PRESETS[input.vehicleType] || VEHICLE_PRESETS.petrol91;

  const handleFieldChange = <K extends keyof CommuteInput>(key: K, value: CommuteInput[K]) => {
    const updated = {
      ...input,
      [key]: value,
    };
    notifyChange(updated);
  };

  const handlePowertrainSelect = (opt: typeof POWERTRAIN_OPTIONS[0]) => {
    const updated: CommuteInput = {
      ...input,
      vehicleType: opt.id,
      powertrain: opt.powertrain,
      consumptionOverride: opt.defaultConsumption,
      fuelPriceOverride: opt.id === 'bev' ? 0.18 : undefined, // default $0.18/kWh off-peak home EV
    };
    notifyChange(updated);
  };

  const handleParkingSelect = (tier: ParkingTier | 'CUSTOM', defaultRate: number) => {
    setSelectedParkingTier(tier);
    if (tier !== 'CUSTOM') {
      const updated: CommuteInput = {
        ...input,
        parkingTier: tier,
        parkingDailyRate: defaultRate,
      };
      notifyChange(updated);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="p-1 bg-emerald-500/20 text-emerald-400 rounded-md">
            <Car className="w-4 h-4" />
          </span>
          Commute Parameters
        </h2>
        <span className="text-[11px] text-slate-400 font-mono">Real-time delta</span>
      </div>

      {/* Origin & Destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Origin */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Origin
          </label>
          <div className="relative">
            <select
              value={input.originSuburbId}
              onChange={(e) => handleFieldChange('originSuburbId', e.target.value)}
              className="w-full min-h-[44px] bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition appearance-none cursor-pointer"
            >
              {AUCKLAND_SUBURBS.map((suburb) => (
                <option key={suburb.id} value={suburb.id}>
                  {suburb.name} (Z{suburb.zone} · {suburb.region})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            Destination
          </label>
          <div className="relative">
            <select
              value={input.destinationSuburbId}
              onChange={(e) => handleFieldChange('destinationSuburbId', e.target.value)}
              className="w-full min-h-[44px] bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none transition appearance-none cursor-pointer"
            >
              {AUCKLAND_SUBURBS.map((suburb) => (
                <option key={suburb.id} value={suburb.id}>
                  {suburb.name} (Z{suburb.zone} · {suburb.region})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Days in Office (Segmented Buttons with 44px min-height) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Days in Office</label>
          <span className="text-xs font-bold text-emerald-400 tabular-nums">
            {input.daysPerWeek} {input.daysPerWeek === 1 ? 'day' : 'days'} / wk
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                const updated = {
                  ...input,
                  daysPerWeek: d,
                  parkingDaysPerWeek: d,
                };
                notifyChange(updated);
              }}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition flex items-center justify-center ${
                input.daysPerWeek === d
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Powertrain (Segmented Pills with 44px min-height) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300">Powertrain</label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {POWERTRAIN_OPTIONS.map((opt) => {
            const isSelected = input.vehicleType === opt.id || input.powertrain === opt.powertrain;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePowertrainSelect(opt)}
                className={`min-h-[44px] px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500 text-white font-bold shadow ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="text-xs truncate">{opt.label}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {opt.id === 'bev' || opt.id === 'diesel' ? '+RUC' : opt.defaultConsumption}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Parking */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">Daily Parking</label>
          <span className="text-xs font-bold text-sky-400 tabular-nums">
            ${input.parkingDailyRate.toFixed(0)}/day
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PARKING_SEGMENTS.map((seg) => {
            const isSelected =
              selectedParkingTier === seg.tier ||
              (seg.tier !== 'CUSTOM' && input.parkingDailyRate === seg.rate);
            return (
              <button
                key={seg.tier}
                type="button"
                onClick={() => handleParkingSelect(seg.tier, seg.rate)}
                className={`min-h-[44px] p-2 rounded-xl text-center border transition flex items-center justify-center ${
                  isSelected
                    ? 'bg-sky-950/60 border-sky-500 text-sky-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <span className="text-xs truncate">{seg.label}</span>
              </button>
            );
          })}
        </div>

        {selectedParkingTier === 'CUSTOM' && (
          <div className="pt-1 flex items-center gap-2">
            <span className="text-xs text-slate-400">Rate:</span>
            <input
              type="number"
              min="0"
              max="150"
              value={input.parkingDailyRate}
              onChange={(e) => handleFieldChange('parkingDailyRate', parseFloat(e.target.value) || 0)}
              className="w-24 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-sm text-slate-100"
            />
            <span className="text-xs text-slate-400">$/day</span>
          </div>
        )}
      </div>

      {/* Disclosure: Custom Rates ▾ */}
      <div className="pt-1 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setIsCustomRatesOpen(!isCustomRatesOpen)}
          className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-teal-400" />
            Custom Rates {isCustomRatesOpen ? '▴' : '▾'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {input.vehicleType === 'bev' ? 'Power & Concession' : 'Fuel & Carpool'}
          </span>
        </button>

        {isCustomRatesOpen && (
          <div className="mt-2 pt-3 border-t border-slate-800/80 space-y-3 bg-slate-950/50 p-3.5 rounded-xl text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Power / Fuel Override */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">
                  {input.vehicleType === 'bev' ? 'Home Power Rate ($/kWh)' : 'Fuel Price ($/L)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    input.fuelPriceOverride ??
                    (input.vehicleType === 'bev' ? 0.18 : currentVehicle.defaultFuelPrice)
                  }
                  onChange={(e) =>
                    handleFieldChange(
                      'fuelPriceOverride',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                />
              </div>

              {/* Concession */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-purple-400" />
                  AT Concession
                </label>
                <select
                  value={input.concession}
                  onChange={(e) => handleFieldChange('concession', e.target.value as ConcessionType)}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="adult">Standard Adult</option>
                  <option value="tertiary">Tertiary Student (-20%)</option>
                  <option value="community_connect">Community Connect (-50%)</option>
                  <option value="youth">Youth 13–24 (-50%)</option>
                  <option value="supergold">SuperGold (Free Off-Peak)</option>
                </select>
              </div>

              {/* Carpool split */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-400" />
                  Carpool Split
                </label>
                <select
                  value={input.carpoolPassengers}
                  onChange={(e) => handleFieldChange('carpoolPassengers', parseInt(e.target.value, 10))}
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value={1}>Solo Driver (100%)</option>
                  <option value={2}>2 Passengers (50/50)</option>
                  <option value={3}>3 Passengers (1/3rd)</option>
                  <option value={4}>4 Passengers (1/4th)</option>
                </select>
              </div>

              {/* Wear & Tear */}
              <div className="flex items-center pt-4">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.includeMaintenanceWear}
                    onChange={(e) => handleFieldChange('includeMaintenanceWear', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                    AA Wear & Tires ($0.18/km)
                  </span>
                </label>
              </div>
            </div>

            {/* RUC notice */}
            {currentVehicle.rucRatePerKm > 0 && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  NZTA RUC: ${(currentVehicle.rucRatePerKm * 1000).toFixed(0)}/1,000 km included.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
