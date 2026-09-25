'use client';

import { DEFAULT_PARKING_PRESETS, VEHICLE_PRESETS } from '@/config/fares.config';
import { AUCKLAND_SUBURBS } from '@/config/suburbs';
import { CommuteInput, ConcessionType, VehicleType } from '@/types';
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
  onChange: (updated: CommuteInput) => void;
  onQuickPreset?: (originId: string, destId: string) => void;
}

export default function CommuteForm({ input, onChange }: CommuteFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currentVehicle = VEHICLE_PRESETS[input.vehicleType];

  const handleFieldChange = <K extends keyof CommuteInput>(key: K, value: CommuteInput[K]) => {
    onChange({
      ...input,
      [key]: value,
    });
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
            Configure your journey across Greater Auckland & Tāmaki Makaurau
          </p>
        </div>
      </div>

      {/* Suburb Selectors */}
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

      {/* Days per week */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300">
            Commute Days per Week
          </label>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {input.daysPerWeek} {input.daysPerWeek === 1 ? 'day' : 'days'} / week
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleFieldChange('daysPerWeek', day)}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                input.daysPerWeek === day
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {day}d
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Type Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Fuel className="w-3.5 h-3.5 text-amber-400" />
          Vehicle Drivetrain & Fuel
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(VEHICLE_PRESETS) as VehicleType[]).map((type) => {
            const v = VEHICLE_PRESETS[type];
            const isSelected = input.vehicleType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onChange({
                    ...input,
                    vehicleType: type,
                    consumptionOverride: undefined,
                    fuelPriceOverride: undefined,
                  });
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500/50 text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-bold truncate">{v.name.split(' (')[0]}</span>
                  {v.category === 'Electric' && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{v.defaultConsumption} {v.unit}</span>
                  {v.rucRatePerKm > 0 && (
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

      {/* Central Parking Options */}
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

        {/* Parking Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {DEFAULT_PARKING_PRESETS.map((preset) => {
            const isSelected = input.parkingDailyRate === preset.rate;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleFieldChange('parkingDailyRate', preset.rate)}
                className={`p-2 rounded-lg text-left border transition ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 text-sky-200'
                    : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                <div className="text-[11px] font-semibold truncate">{preset.name.split(' (')[0]}</div>
                <div className="text-xs font-bold text-slate-200">${preset.rate.toFixed(0)}/day</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Concession Selection */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-purple-400" />
          AT HOP Card Concession
        </label>
        <select
          value={input.concession}
          onChange={(e) => handleFieldChange('concession', e.target.value as ConcessionType)}
          className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none transition cursor-pointer"
        >
          <option value="adult">Standard Adult (AT HOP Card)</option>
          <option value="tertiary">Tertiary Student (20% Discount)</option>
          <option value="community_connect">Community Connect (50% Discount)</option>
          <option value="youth">Youth 13–24 (50% Discount)</option>
          <option value="supergold">SuperGold Cardholder (Free Off-Peak)</option>
        </select>
      </div>

      {/* Advanced Drawer Toggle */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition border-t border-slate-800"
        >
          <span className="flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-teal-400" />
            Custom Fuel Rates, Carpool & RUC Tweaks
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 bg-slate-950/40 p-4 rounded-xl">
            {/* Custom Fuel Price Override */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Fuel / Energy Price ({currentVehicle.unit === 'L/100km' ? '$/L' : '$/kWh'})</span>
                  <span className="text-slate-500">Default: ${currentVehicle.defaultFuelPrice}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="10.0"
                  value={input.fuelPriceOverride ?? currentVehicle.defaultFuelPrice}
                  onChange={(e) =>
                    handleFieldChange(
                      'fuelPriceOverride',
                      e.target.value ? parseFloat(e.target.value) : undefined
                    )
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Custom Vehicle Economy */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Vehicle Economy ({currentVehicle.unit})</span>
                  <span className="text-slate-500">Default: {currentVehicle.defaultConsumption}</span>
                </label>
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Carpool Passengers & Maintenance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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

              <div className="flex items-center justify-between pt-4">
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.includeMaintenanceWear}
                    onChange={(e) => handleFieldChange('includeMaintenanceWear', e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    Include NZ AA Wear & Tear ($0.18/km)
                  </span>
                </label>
              </div>
            </div>

            {/* RUC notice */}
            {currentVehicle.rucRatePerKm > 0 && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  <strong>NZTA Road User Charges (RUC):</strong> Charged at $
                  {(currentVehicle.rucRatePerKm * 1000).toFixed(0)} per 1,000 km ($
                  {currentVehicle.rucRatePerKm.toFixed(3)}/km) automatically factored into driving costs.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
