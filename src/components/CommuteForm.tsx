'use client';

import { VEHICLE_PRESETS } from '@/config/fares.config';
import { AUCKLAND_SUBURBS } from '@/config/suburbs';
import { CommuteInput, ConcessionType, ParkingTier, VehiclePowertrain, VehicleType } from '@/types';
import {
  Car,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Fuel,
  Info,
  MapPin,
  ParkingCircle,
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
  { id: 'bev', powertrain: 'BEV', label: 'BEV (Electric)', defaultConsumption: 16.5, unit: 'kWh/100km' },
];

const PARKING_SEGMENTS: { tier: ParkingTier | 'CUSTOM'; label: string; rate: number }[] = [
  { tier: 'CBD_EARLY_BIRD', label: 'CBD Early-Bird $22', rate: 22.0 },
  { tier: 'CBD_CASUAL', label: 'CBD Casual $35', rate: 35.0 },
  { tier: 'SUBURBAN_HUB', label: 'Suburban $14', rate: 14.0 },
  { tier: 'FREE', label: 'Free $0', rate: 0.0 },
  { tier: 'CUSTOM', label: 'Custom', rate: 18.0 },
];

export default function CommuteForm({ input, onChange, onInputChange }: CommuteFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-700/60 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Car className="w-5 h-5" />
            </span>
            Commute Configuration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Auckland corridor arbitrage & parameter tuning
          </p>
        </div>
      </div>

      {/* Origin & Destination */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Origin */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            Origin Suburb
          </label>
          <select
            value={input.originSuburbId}
            onChange={(e) => handleFieldChange('originSuburbId', e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition cursor-pointer"
          >
            {AUCKLAND_SUBURBS.map((suburb) => (
              <option key={suburb.id} value={suburb.id}>
                {suburb.name} (Zone {suburb.zone} • {suburb.region})
              </option>
            ))}
          </select>
        </div>

        {/* Destination */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            Destination Suburb
          </label>
          <select
            value={input.destinationSuburbId}
            onChange={(e) => handleFieldChange('destinationSuburbId', e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer"
          >
            {AUCKLAND_SUBURBS.map((suburb) => (
              <option key={suburb.id} value={suburb.id}>
                {suburb.name} (Zone {suburb.zone} • {suburb.region})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commute Days: Slider or Segment Pills (1 to 5 days, default 3) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Commute Days per Week
          </label>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {input.daysPerWeek} {input.daysPerWeek === 1 ? 'day' : 'days'} / week
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
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
              className={`py-2 rounded-xl text-xs font-bold transition ${
                input.daysPerWeek === d
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {d} {d === 1 ? 'day' : 'days'}
            </button>
          ))}
        </div>
      </div>

      {/* Powertrain Selector Pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Fuel className="w-3.5 h-3.5 text-amber-400" />
          Vehicle Powertrain
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {POWERTRAIN_OPTIONS.map((opt) => {
            const isSelected = input.vehicleType === opt.id || input.powertrain === opt.powertrain;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePowertrainSelect(opt)}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/95 border-emerald-500 ring-1 ring-emerald-500/50 text-white shadow'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold truncate">{opt.label}</span>
                  {opt.id === 'bev' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{opt.defaultConsumption} {opt.unit}</span>
                  {(opt.id === 'diesel' || opt.id === 'bev' || opt.id === 'phev') && (
                    <span className="text-amber-400/90 font-mono text-[10px] bg-amber-500/10 px-1 rounded">
                      RUC
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consumption Input with Pre-filled Defaults */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Energy / Fuel Consumption</span>
            <span className="text-[11px] text-slate-500">
              Default: {currentVehicle.defaultConsumption} {currentVehicle.unit}
            </span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="1"
              max="40"
              value={input.consumptionOverride ?? currentVehicle.defaultConsumption}
              onChange={(e) =>
                handleFieldChange(
                  'consumptionOverride',
                  e.target.value ? parseFloat(e.target.value) : undefined
                )
              }
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 pointer-events-none">
              {currentVehicle.unit}
            </span>
          </div>
        </div>

        {/* AT HOP Concession */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-purple-400" />
            AT HOP Fare Concession
          </label>
          <select
            value={input.concession}
            onChange={(e) => handleFieldChange('concession', e.target.value as ConcessionType)}
            className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none transition cursor-pointer"
          >
            <option value="adult">Standard Adult (AT HOP)</option>
            <option value="tertiary">Tertiary Student (20% Discount)</option>
            <option value="community_connect">Community Connect (50% Discount)</option>
            <option value="youth">Youth 13–24 (50% Discount)</option>
            <option value="supergold">SuperGold Cardholder (Free Off-Peak)</option>
          </select>
        </div>
      </div>

      {/* Parking Tier Segment Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <ParkingCircle className="w-3.5 h-3.5 text-sky-400" />
            Central Auckland Parking
          </label>
          <span className="text-xs font-bold text-sky-400">
            ${input.parkingDailyRate.toFixed(2)} / day
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
                className={`p-2 rounded-xl text-left border transition ${
                  isSelected
                    ? 'bg-sky-950/50 border-sky-500 text-sky-200 shadow-sm'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold truncate">{seg.label}</div>
              </button>
            );
          })}
        </div>

        {selectedParkingTier === 'CUSTOM' && (
          <div className="pt-1 flex items-center gap-2">
            <span className="text-xs text-slate-400">Custom daily parking:</span>
            <input
              type="number"
              step="1"
              min="0"
              max="150"
              value={input.parkingDailyRate}
              onChange={(e) => handleFieldChange('parkingDailyRate', parseFloat(e.target.value) || 0)}
              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
            />
            <span className="text-xs text-slate-500">$/day</span>
          </div>
        )}
      </div>

      {/* Advanced Drawer / Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition border-t border-slate-800"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-teal-400" />
            Advanced: Off-Peak Power ($0.18/kWh), Custom Fuel & Carpool
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-4 bg-slate-950/40 p-4 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custom Fuel / Off-peak Power Override */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    {input.vehicleType === 'bev' ? 'Off-peak Home Power Rate ($/kWh)' : 'Fuel Price ($/L)'}
                  </span>
                  <span className="text-slate-500">
                    {input.vehicleType === 'bev' ? 'Default $0.18/kWh' : `Benchmark $${currentVehicle.defaultFuelPrice}`}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="10.0"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Carpool split */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  Carpool Occupancy (Cost Split)
                </label>
                <select
                  value={input.carpoolPassengers}
                  onChange={(e) => handleFieldChange('carpoolPassengers', parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value={1}>Solo Driver (100% cost)</option>
                  <option value={2}>2 Passengers (Split 50/50)</option>
                  <option value={3}>3 Passengers (Split 3-way)</option>
                  <option value={4}>4 Passengers (Split 4-way)</option>
                </select>
              </div>
            </div>

            {/* Wear & Tear */}
            <div className="flex items-center justify-between pt-2">
              <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.includeMaintenanceWear}
                  onChange={(e) => handleFieldChange('includeMaintenanceWear', e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <span className="flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  Factor in NZ AA Vehicle Wear, Tires & WOF ($0.18/km)
                </span>
              </label>
            </div>

            {/* RUC notice */}
            {currentVehicle.rucRatePerKm > 0 && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>NZTA Road User Charges (RUC):</strong> $
                  {(currentVehicle.rucRatePerKm * 1000).toFixed(0)} / 1,000 km ($
                  {currentVehicle.rucRatePerKm.toFixed(3)}/km) automatically incorporated.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
