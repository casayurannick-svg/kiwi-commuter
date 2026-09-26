'use client';

import { NZ_EV_CHARGING_RATES, VEHICLE_PRESETS } from '@/config/fares.config';
import { AUCKLAND_SUBURBS, SUBURB_CENTROIDS } from '@/config/suburbs';
import { searchAucklandAddresses, GeocodingResult } from '@/lib/mapbox';
import { CommuteInput, ConcessionType, EVChargingSource, EvChargingMode, ParkingTier, TransitMode, VehiclePowertrain, VehicleType } from '@/types';
import {
  Bus,
  Car,
  ChevronDown,
  Clock,
  CreditCard,
  Fuel,
  Info,
  Leaf,
  Loader2,
  MapPin,
  Plug,
  Search,
  Settings2,
  Ship,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface CommuteFormProps {
  input: CommuteInput;
  onChange?: (updated: CommuteInput) => void;
  onInputChange?: (updated: CommuteInput) => void;
}

const POWERTRAIN_OPTIONS: {
  id: VehicleType;
  powertrain: VehiclePowertrain;
  label: string;
  fullLabel: string;
  defaultConsumption: number;
  unit: string;
  baseline: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip?: string;
}[] = [
  { id: 'petrol91', powertrain: 'PETROL_91', label: '91', fullLabel: 'Petrol 91', defaultConsumption: 7.6, unit: 'L/100km', baseline: '7.6 L', icon: Fuel },
  { id: 'petrol95', powertrain: 'PETROL_95', label: '95', fullLabel: 'Petrol 95', defaultConsumption: 8.8, unit: 'L/100km', baseline: '8.8 L', icon: Fuel },
  { id: 'diesel', powertrain: 'DIESEL', label: 'Diesel', fullLabel: 'Diesel', defaultConsumption: 8.4, unit: 'L/100km', baseline: '+RUC', icon: Fuel },
  { id: 'hev', powertrain: 'HEV', label: 'HEV', fullLabel: 'Hybrid (Non-Plug-in)', defaultConsumption: 4.5, unit: 'L/100km', baseline: '4.5 L', icon: Leaf, tooltip: 'Non-plug-in hybrid' },
  { id: 'phev', powertrain: 'PHEV', label: 'PHEV', fullLabel: 'PHEV', defaultConsumption: 3.8, unit: 'L/100km', baseline: '3.8 L', icon: Plug },
  { id: 'bev', powertrain: 'BEV', label: 'EV', fullLabel: 'EV (BEV)', defaultConsumption: 16.5, unit: 'kWh/100km', baseline: '+RUC', icon: Zap },
];

const PARKING_SEGMENTS: { tier: ParkingTier | 'CUSTOM'; label: string; rate: number }[] = [
  { tier: 'CBD_EARLY_BIRD', label: 'CBD Early $22', rate: 22.0 },
  { tier: 'CBD_CASUAL', label: 'CBD Casual $35', rate: 35.0 },
  { tier: 'SUBURBAN_HUB', label: 'Suburban $14', rate: 14.0 },
  { tier: 'FREE', label: 'Free $0', rate: 0.0 },
  { tier: 'CUSTOM', label: 'Custom', rate: 18.0 },
];

type TimeValuePreset = 'off' | '20' | '50' | 'custom';

export default function CommuteForm({ input, onChange, onInputChange }: CommuteFormProps) {
  const [isCustomRatesOpen, setIsCustomRatesOpen] = useState(true);
  const [selectedParkingTier, setSelectedParkingTier] = useState<ParkingTier | 'CUSTOM'>(() => {
    if (input.parkingTier) return input.parkingTier;
    const match = PARKING_SEGMENTS.find((p) => p.rate === input.parkingDailyRate);
    return match ? match.tier : 'CUSTOM';
  });

  const [timeValueMode, setTimeValueMode] = useState<TimeValuePreset>(() => {
    const val = input.hourlyTimeValue ?? 0;
    if (val === 0) return 'off';
    if (val === 20) return '20';
    if (val === 50) return '50';
    return 'custom';
  });

  const currentVehicle = VEHICLE_PRESETS[input.vehicleType] || VEHICLE_PRESETS.petrol91;
  const isPureEv = input.vehicleType === 'bev' || input.powertrain === 'BEV';
  const isFuelConsuming = !isPureEv;

  // US-24: Store fuelCost as a string in local state so clearing the field doesn't snap back immediately
  const [fuelCost, setFuelCost] = useState<string>(() => {
    const initial = input.fuelPriceOverride ?? currentVehicle.defaultFuelPrice;
    return initial !== undefined ? initial.toString() : '';
  });

  // US-26: Store custom L/100km override in local state for fuel-consuming powertrains
  const [customConsumption, setCustomConsumption] = useState<string>(() => {
    if (input.vehicleType === 'bev' || input.powertrain === 'BEV') return '';
    return input.consumptionOverride !== undefined ? input.consumptionOverride.toString() : '';
  });

  // US-26: Explicitly clear custom L/100km React state if a pure EV is selected to prevent stale data
  useEffect(() => {
    if (input.vehicleType === 'bev' || input.powertrain === 'BEV') {
      if (customConsumption !== '') {
        setCustomConsumption('');
      }
    }
  }, [input.vehicleType, input.powertrain, customConsumption]);

  const notifyChange = (updated: CommuteInput) => {
    if (onInputChange) onInputChange(updated);
    if (onChange) onChange(updated);
  };

  const handleFieldChange = <K extends keyof CommuteInput>(key: K, value: CommuteInput[K]) => {
    const updated = {
      ...input,
      [key]: value,
    };
    notifyChange(updated);
  };

  const handleFuelPriceChange = (valStr: string) => {
    setFuelCost(valStr);
    // Parse the string to a number, applying DEFAULT_FUEL_RATE only when the calculation is executed and the input is empty or NaN
    const trimmed = valStr.trim();
    if (trimmed === '') {
      // Do not revert the string input to default, keep fuelPriceOverride undefined so calculation engine applies DEFAULT_FUEL_RATE
      handleFieldChange('fuelPriceOverride', undefined);
    } else {
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed) || parsed <= 0) {
        handleFieldChange('fuelPriceOverride', undefined);
      } else {
        handleFieldChange('fuelPriceOverride', parsed);
      }
    }
  };

  const handleCustomConsumptionChange = (valStr: string) => {
    setCustomConsumption(valStr);
    const trimmed = valStr.trim();
    if (trimmed === '') {
      handleFieldChange('consumptionOverride', undefined);
    } else {
      const parsed = parseFloat(trimmed);
      if (isNaN(parsed) || parsed <= 0) {
        handleFieldChange('consumptionOverride', undefined);
      } else {
        handleFieldChange('consumptionOverride', parsed);
      }
    }
  };

  const handlePowertrainSelect = (opt: typeof POWERTRAIN_OPTIONS[0]) => {
    const isPureEv = opt.id === 'bev' || opt.powertrain === 'BEV';
    const isEvOrPhev = opt.id === 'bev' || opt.id === 'phev';
    const newVehicle = VEHICLE_PRESETS[opt.id] || VEHICLE_PRESETS.petrol91;
    if (!isEvOrPhev) {
      setFuelCost(newVehicle.defaultFuelPrice.toString());
    }

    // US-26: Clear custom consumption state if pure EV is selected to prevent stale data
    let nextConsumptionOverride: number | undefined = undefined;
    if (isPureEv) {
      setCustomConsumption('');
    } else {
      const parsed = parseFloat(customConsumption.trim());
      if (!isNaN(parsed) && parsed > 0) {
        nextConsumptionOverride = parsed;
      }
    }

    const updated: CommuteInput = {
      ...input,
      vehicleType: opt.id,
      powertrain: opt.powertrain,
      consumptionOverride: nextConsumptionOverride,
      fuelPriceOverride: isEvOrPhev ? (input.fuelPriceOverride ?? 0.18) : undefined,
      homeKWhRate: isEvOrPhev ? (input.homeKWhRate ?? 0.18) : undefined,
      evChargingSource: isEvOrPhev ? (input.evChargingSource ?? 'HOME_OFFPEAK') : undefined,
      evChargingMode: isEvOrPhev ? (input.evChargingMode ?? 'home_offpeak') : undefined,
    };
    notifyChange(updated);
  };

  const handleChargingSourceSelect = (source: EVChargingSource) => {
    const rate = source === 'CUSTOM'
      ? (input.homeKWhRate ?? input.fuelPriceOverride ?? 0.18)
      : NZ_EV_CHARGING_RATES[source];
    const mode = source.toLowerCase() as EvChargingMode;
    const updated: CommuteInput = {
      ...input,
      evChargingSource: source,
      evChargingMode: mode,
      fuelPriceOverride: rate,
      homeKWhRate: rate,
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

  const handleTimeValueSelect = (mode: TimeValuePreset) => {
    setTimeValueMode(mode);
    if (mode === 'off') {
      handleFieldChange('hourlyTimeValue', 0);
    } else if (mode === '20') {
      handleFieldChange('hourlyTimeValue', 20);
    } else if (mode === '50') {
      handleFieldChange('hourlyTimeValue', 50);
    }
    // If 'custom', retain current or default to 30
  };

  // US-28 & US-36: Address Geocoding autocomplete states
  const [originQuery, setOriginQuery] = useState(input.originAddress || '');
  const [originSuggestions, setOriginSuggestions] = useState<GeocodingResult[]>([]);
  const [isOriginLoading, setIsOriginLoading] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState(input.destinationAddress || '');
  const [destSuggestions, setDestSuggestions] = useState<GeocodingResult[]>([]);
  const [isDestLoading, setIsDestLoading] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  // US-36: Synchronize address inputs when hydrated from URL or updated from parent
  useEffect(() => {
    if (input.originAddress !== undefined) {
      setOriginQuery((prev) => (prev !== input.originAddress ? input.originAddress! : prev));
    }
  }, [input.originAddress]);

  useEffect(() => {
    if (input.destinationAddress !== undefined) {
      setDestQuery((prev) => (prev !== input.destinationAddress ? input.destinationAddress! : prev));
    }
  }, [input.destinationAddress]);

  const handleOriginSearch = async (val: string) => {
    setOriginQuery(val);
    handleFieldChange('originAddress', val || undefined);
    if (val.trim().length >= 2) {
      setIsOriginLoading(true);
      setShowOriginDropdown(true);
      try {
        const results = await searchAucklandAddresses(val);
        setOriginSuggestions(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsOriginLoading(false);
      }
    } else {
      setOriginSuggestions([]);
      setShowOriginDropdown(false);
    }
  };

  const handleSelectOriginAddress = (item: GeocodingResult) => {
    setOriginQuery(item.placeName);
    setShowOriginDropdown(false);

    let closestSuburbId = input.originSuburbId;
    let minDistance = Infinity;
    for (const sub of SUBURB_CENTROIDS) {
      const d = Math.hypot(sub.coordinates[0] - item.coordinates[0], sub.coordinates[1] - item.coordinates[1]);
      if (d < minDistance) {
        minDistance = d;
        closestSuburbId = sub.id;
      }
    }

    const isWaiheke = closestSuburbId === 'waiheke' || input.destinationSuburbId === 'waiheke';
    const updated: CommuteInput = {
      ...input,
      originAddress: item.placeName,
      originCoordinates: item.coordinates,
      originSuburbId: closestSuburbId,
      isWaihekeRoute: isWaiheke,
      transitMode: isWaiheke ? 'FERRY' : input.transitMode,
    };
    notifyChange(updated);
  };

  const handleDestSearch = async (val: string) => {
    setDestQuery(val);
    handleFieldChange('destinationAddress', val || undefined);
    if (val.trim().length >= 2) {
      setIsDestLoading(true);
      setShowDestDropdown(true);
      try {
        const results = await searchAucklandAddresses(val);
        setDestSuggestions(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsDestLoading(false);
      }
    } else {
      setDestSuggestions([]);
      setShowDestDropdown(false);
    }
  };

  const handleSelectDestAddress = (item: GeocodingResult) => {
    setDestQuery(item.placeName);
    setShowDestDropdown(false);

    let closestSuburbId = input.destinationSuburbId;
    let minDistance = Infinity;
    for (const sub of SUBURB_CENTROIDS) {
      const d = Math.hypot(sub.coordinates[0] - item.coordinates[0], sub.coordinates[1] - item.coordinates[1]);
      if (d < minDistance) {
        minDistance = d;
        closestSuburbId = sub.id;
      }
    }

    const isWaiheke = input.originSuburbId === 'waiheke' || closestSuburbId === 'waiheke';
    const updated: CommuteInput = {
      ...input,
      destinationAddress: item.placeName,
      destinationCoordinates: item.coordinates,
      destinationSuburbId: closestSuburbId,
      isWaihekeRoute: isWaiheke,
      transitMode: isWaiheke ? 'FERRY' : input.transitMode,
    };
    notifyChange(updated);
  };

  const handleOriginChange = (originId: string) => {
    const isWaiheke = originId === 'waiheke' || input.destinationSuburbId === 'waiheke';
    const sub = SUBURB_CENTROIDS.find((s) => s.id === originId);
    if (sub) setOriginQuery(sub.name);
    const updated: CommuteInput = {
      ...input,
      originSuburbId: originId,
      originAddress: sub ? `${sub.name}, Auckland` : undefined,
      originCoordinates: sub ? sub.coordinates : undefined,
      isWaihekeRoute: isWaiheke,
      transitMode: isWaiheke ? 'FERRY' : input.transitMode,
    };
    notifyChange(updated);
  };

  const handleDestinationChange = (destId: string) => {
    const isWaiheke = input.originSuburbId === 'waiheke' || destId === 'waiheke';
    const sub = SUBURB_CENTROIDS.find((s) => s.id === destId);
    if (sub) setDestQuery(sub.name);
    const updated: CommuteInput = {
      ...input,
      destinationSuburbId: destId,
      destinationAddress: sub ? `${sub.name}, Auckland` : undefined,
      destinationCoordinates: sub ? sub.coordinates : undefined,
      isWaihekeRoute: isWaiheke,
      transitMode: isWaiheke ? 'FERRY' : input.transitMode,
    };
    notifyChange(updated);
  };

  const handleTransitModeSelect = (mode: TransitMode) => {
    const isWaiheke =
      mode !== 'EBIKE' &&
      mode !== 'E-Bike' &&
      (input.originSuburbId === 'waiheke' ||
        input.destinationSuburbId === 'waiheke' ||
        (mode === 'FERRY' && input.isWaihekeRoute));
    const updated: CommuteInput = {
      ...input,
      transitMode: mode,
      isWaihekeRoute: isWaiheke,
    };
    notifyChange(updated);
  };

  const activeTransitMode: TransitMode =
    input.transitMode ??
    (input.originSuburbId === 'waiheke' || input.destinationSuburbId === 'waiheke'
      ? 'FERRY'
      : 'BUS');

  const isEbikeActive = activeTransitMode === 'EBIKE' || activeTransitMode === 'E-Bike';
  const isMicromobilityActive =
    activeTransitMode === 'MICROMOBILITY_TRANSIT' ||
    activeTransitMode === 'Scooter & Ride' ||
    activeTransitMode === 'Scooter & Transit';

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
      </div>

      {/* Origin & Destination (US-28 Address Geocoding & Suburb Presets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Origin */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              From (Origin Address)
            </label>
            {input.originCoordinates && (
              <span className="text-[10px] text-emerald-400 font-mono">
                {input.originCoordinates[0].toFixed(2)}, {input.originCoordinates[1].toFixed(2)}
              </span>
            )}
          </div>

          {/* Autocomplete Input */}
          <div className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                data-testid="origin-address-input"
                aria-label="From (Origin Address)"
                placeholder="Search street or landmark..."
                value={originQuery}
                onChange={(e) => handleOriginSearch(e.target.value)}
                onFocus={() => {
                  if (originSuggestions.length > 0) setShowOriginDropdown(true);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              {isOriginLoading ? (
                <Loader2 className="w-4 h-4 text-emerald-400 absolute right-3 animate-spin" />
              ) : originQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setOriginQuery('');
                    setShowOriginDropdown(false);
                    const sub = SUBURB_CENTROIDS.find((s) => s.id === input.originSuburbId);
                    notifyChange({
                      ...input,
                      originAddress: undefined,
                      originCoordinates: sub ? sub.coordinates : undefined,
                    });
                  }}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {showOriginDropdown && originSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                {originSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectOriginAddress(item)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-semibold text-white">{item.text}</span>
                    <span className="text-[11px] text-slate-400 truncate">{item.placeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suburb Preset Fallback Selector */}
          <div className="relative">
            <select
              value={input.originSuburbId}
              onChange={(e) => handleOriginChange(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition appearance-none cursor-pointer"
            >
              {AUCKLAND_SUBURBS.map((suburb) => (
                <option key={suburb.id} value={suburb.id}>
                  {suburb.name} (Z{suburb.zone} · {suburb.region})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              To (Destination Address)
            </label>
            {input.destinationCoordinates && (
              <span className="text-[10px] text-sky-400 font-mono">
                {input.destinationCoordinates[0].toFixed(2)}, {input.destinationCoordinates[1].toFixed(2)}
              </span>
            )}
          </div>

          {/* Autocomplete Input */}
          <div className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                data-testid="destination-address-input"
                aria-label="To (Destination Address)"
                placeholder="Search street or workplace..."
                value={destQuery}
                onChange={(e) => handleDestSearch(e.target.value)}
                onFocus={() => {
                  if (destSuggestions.length > 0) setShowDestDropdown(true);
                }}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-8 py-2 text-sm text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              {isDestLoading ? (
                <Loader2 className="w-4 h-4 text-sky-400 absolute right-3 animate-spin" />
              ) : destQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setDestQuery('');
                    setShowDestDropdown(false);
                    const sub = SUBURB_CENTROIDS.find((s) => s.id === input.destinationSuburbId);
                    notifyChange({
                      ...input,
                      destinationAddress: undefined,
                      destinationCoordinates: sub ? sub.coordinates : undefined,
                    });
                  }}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Suggestions Dropdown */}
            {showDestDropdown && destSuggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                {destSuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectDestAddress(item)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition flex flex-col gap-0.5"
                  >
                    <span className="text-xs font-semibold text-white">{item.text}</span>
                    <span className="text-[11px] text-slate-400 truncate">{item.placeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Suburb Preset Fallback Selector */}
          <div className="relative">
            <select
              value={input.destinationSuburbId}
              onChange={(e) => handleDestinationChange(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:ring-1 focus:ring-sky-500 focus:outline-none transition appearance-none cursor-pointer"
            >
              {AUCKLAND_SUBURBS.map((suburb) => (
                <option key={suburb.id} value={suburb.id}>
                  {suburb.name} (Z{suburb.zone} · {suburb.region})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Transit Mode Selector (US-20, US-11, US-23) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 text-emerald-400" />
            Transit Mode
          </label>
          {input.isWaihekeRoute && !isEbikeActive && !isMicromobilityActive && (
            <span className="text-[10px] text-amber-400 font-mono">
              Waiheke Fullers (AT Cap Exempt)
            </span>
          )}
          {isEbikeActive && (
            <span className="text-[10px] text-emerald-400 font-mono">
              Micro-Mobility
            </span>
          )}
          {isMicromobilityActive && (
            <span className="text-[10px] text-emerald-400 font-mono">
              15 km/h First/Last Mile
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => handleTransitModeSelect('BUS')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              !isEbikeActive && !isMicromobilityActive && activeTransitMode !== 'FERRY' && activeTransitMode !== 'Ferry'
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-emerald-500'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Bus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Bus / Train (AT HOP $50 Cap)</span>
          </button>
          <button
            type="button"
            onClick={() => handleTransitModeSelect('FERRY')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              activeTransitMode === 'FERRY' || activeTransitMode === 'Ferry'
                ? 'bg-sky-500 text-slate-950 font-black shadow-md border-sky-500'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Ship className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Ferry {input.isWaihekeRoute ? '(Waiheke)' : ''}</span>
          </button>
          <button
            type="button"
            onClick={() => handleTransitModeSelect('EBIKE')}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              isEbikeActive
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-emerald-500'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="shrink-0">🚲</span>
            <span className="truncate">🚲 E-Bike</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const updated = {
                ...input,
                transitMode: 'MICROMOBILITY_TRANSIT' as TransitMode,
                scooterOwnership: input.scooterOwnership ?? 'RENTAL',
                scooterCapitalCost: input.scooterCapitalCost ?? 900,
                walkDistanceKm: input.walkDistanceKm ?? 2.0,
              };
              notifyChange(updated);
            }}
            className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
              isMicromobilityActive
                ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-emerald-500'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="shrink-0">🛴</span>
            <span className="truncate">Scooter &amp; Ride</span>
          </button>
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

      {/* US-11: If EBIKE is active, hide car fields (Powertrain, RUC, Parking) and show E-Bike inputs */}
      {isEbikeActive ? (
        <div className="space-y-3 p-3.5 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🚲</span> E-Bike Hardware &amp; Cost Parameters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Upfront Setup Cost */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Upfront Setup Cost
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={input.upfrontSetupCost ?? 2500}
                  onChange={(e) =>
                    handleFieldChange(
                      'upfrontSetupCost',
                      e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="2500"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Purchase price of bike, lock, helmet &amp; gear
              </span>
            </div>

            {/* Energy Cost/km */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">
                Energy Cost/km
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={input.ebikeCostPerKm ?? 0.0027}
                  onChange={(e) =>
                    handleFieldChange(
                      'ebikeCostPerKm',
                      e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.0027"
                  className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400 block">
                Default: $0.0027/km battery charging
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* US-23: Micro-Mobility First/Last Mile Scooter Parameters */}
      {isMicromobilityActive ? (
        <div className="space-y-3 p-3.5 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🛴</span> First/Last Mile Scooter Mode
            </span>
            <span className="text-[10px] text-slate-400 font-mono">15 km/h cruise</span>
          </div>

          {/* Ownership Toggle (OWNED vs RENTAL) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Scooter Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFieldChange('scooterOwnership', 'RENTAL')}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  (input.scooterOwnership ?? 'RENTAL') === 'RENTAL'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>⚡ Rental (Beam / Lime)</span>
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('scooterOwnership', 'OWNED')}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${
                  input.scooterOwnership === 'OWNED'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md border-emerald-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>🛴 Personally Owned</span>
              </button>
            </div>
          </div>

          {/* If RENTAL: display readonly rates ($1 unlock, $0.45/min) */}
          {(input.scooterOwnership ?? 'RENTAL') === 'RENTAL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-400">Unlock Fee:</span>
                <span className="text-xs font-mono font-bold text-slate-200">$1.00 / trip</span>
              </div>
              <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <span className="text-xs text-slate-400">Ride Rate:</span>
                <span className="text-xs font-mono font-bold text-slate-200">$0.45 / min</span>
              </div>
            </div>
          ) : (
            /* If OWNED: upfront capital cost input */
            <div className="space-y-1 pt-1">
              <label className="text-xs font-semibold text-slate-300">
                Scooter Capital Cost ($ NZD)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={input.scooterCapitalCost ?? 900}
                onChange={(e) =>
                  handleFieldChange(
                    'scooterCapitalCost',
                    e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                  )
                }
                placeholder="900"
                className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-100 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Purchase price for breakeven &amp; payback calculation against driving
              </span>
            </div>
          )}
        </div>
      ) : null}

      {!isEbikeActive ? (
        <>
          {/* Powertrain (Segmented Pills with 44px min-height) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-slate-300">Powertrain</label>
              <div className="relative inline-flex items-center group">
                <button
                  type="button"
                  aria-label="Powertrain benchmark info"
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200"
                >
                  <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 sm:w-72 max-w-[calc(100vw-3rem)] p-2.5 bg-slate-900/95 border border-slate-700 rounded-lg text-[11px] text-slate-200 leading-snug shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50"
                >
                  Default values are based on national averages. For a more accurate calculation, enter your vehicle&apos;s exact L/100km rating.
                </div>
              </div>
            </div>
            {/* Powertrain 2x3 Icon Grid */}
            <div className="grid grid-cols-3 gap-2">
              {POWERTRAIN_OPTIONS.map((opt) => {
                const isSelected = input.vehicleType === opt.id || input.powertrain === opt.powertrain;
                const IconComponent = opt.icon;
                const buttonContent = (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePowertrainSelect(opt)}
                    aria-label={opt.fullLabel || opt.label}
                    className={`w-full min-h-[48px] px-2 py-2 rounded-xl border text-center transition flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500 text-white font-bold shadow ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {opt.baseline}
                    </span>
                  </button>
                );

                if (opt.tooltip) {
                  return (
                    <div key={opt.id} className="relative group/hev w-full">
                      {buttonContent}
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 bg-slate-900/95 border border-slate-700 rounded-lg text-[11px] text-slate-200 whitespace-nowrap shadow-xl backdrop-blur-md opacity-0 group-hover/hev:opacity-100 group-focus-within/hev:opacity-100 transition-opacity duration-150 z-50 pointer-events-none"
                      >
                        {opt.tooltip}
                      </div>
                    </div>
                  );
                }

                return buttonContent;
              })}
            </div>

            {/* US-26: Dynamically render Custom L/100km numeric input field below powertrain selector for fuel-consuming powertrains */}
            {isFuelConsuming && (
              <div className="pt-1.5 space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="custom-l100km-input" className="text-xs text-slate-300 font-medium">
                    Custom L/100km
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Default: {currentVehicle.defaultConsumption} L/100km
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="custom-l100km-input"
                    data-testid="custom-l100km-input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="40"
                    placeholder={`e.g. ${currentVehicle.defaultConsumption}`}
                    aria-label="Custom L/100km"
                    value={customConsumption}
                    onChange={(e) => handleCustomConsumptionChange(e.target.value)}
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            )}
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
                  value={input.parkingDailyRate}
                  onChange={(e) => handleFieldChange('parkingDailyRate', parseFloat(e.target.value) || 0)}
                  className="w-24 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-sm text-slate-100"
                />
                <span className="text-xs text-slate-400">$/day</span>
              </div>
            )}
          </div>
        </>
      ) : null}

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
            {input.vehicleType === 'bev' || input.vehicleType === 'phev'
              ? 'Charging & Concession'
              : 'Fuel & Carpool'}
          </span>
        </button>

        {isCustomRatesOpen && (
          <div className="mt-2 pt-3 border-t border-slate-800/80 space-y-3 bg-slate-950/50 p-3.5 rounded-xl text-xs">
            {/* ⚡ EV Power Source Selector */}
            {(input.vehicleType === 'bev' || input.vehicleType === 'phev') && (
              <div className="space-y-1.5 pb-2.5 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    ⚡ EV Power Source
                  </label>
                  <span className="text-[11px] font-bold text-emerald-400 font-mono">
                    ${(input.homeKWhRate ?? input.fuelPriceOverride ?? 0.18).toFixed(2)}/kWh
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { source: 'HOME_OFFPEAK', label: 'Off-Peak', sub: '$0.18' },
                      { source: 'HOME_FLAT', label: 'Flat', sub: '$0.30' },
                      { source: 'PUBLIC_DC', label: 'Public DC', sub: '$0.85' },
                      { source: 'CUSTOM', label: 'Custom', sub: 'Manual' },
                    ] as const
                  ).map((item) => {
                    const currentSource = input.evChargingSource || (input.evChargingMode ? (input.evChargingMode.toUpperCase() as EVChargingSource) : 'HOME_OFFPEAK');
                    const isSelected = currentSource === item.source;
                    return (
                      <button
                        key={item.source}
                        type="button"
                        onClick={() => handleChargingSourceSelect(item.source)}
                        className={`min-h-[44px] px-2 py-1 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/40'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-xs truncate">{item.label}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {((input.evChargingSource || input.evChargingMode?.toUpperCase()) === 'CUSTOM') && (
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="text-xs text-slate-400">Custom Rate:</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max="2.50"
                      value={input.homeKWhRate ?? input.fuelPriceOverride ?? 0.18}
                      onChange={(e) => {
                        const val = e.target.value ? parseFloat(e.target.value) : 0.18;
                        const updated = {
                          ...input,
                          evChargingSource: 'CUSTOM' as const,
                          evChargingMode: 'custom' as const,
                          fuelPriceOverride: val,
                          homeKWhRate: val,
                        };
                        notifyChange(updated);
                      }}
                      className="w-24 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-sm text-slate-100 font-mono"
                    />
                    <span className="text-xs text-slate-400">$/kWh</span>
                  </div>
                )}

                {input.vehicleType === 'phev' && (
                  <p className="text-[10px] text-slate-400 italic mt-0.5">
                    PHEV calculates first 35 km on electric ({input.consumptionOverride ?? 16.5} kWh/100km) and remainder on petrol backup ($2.72/L, 6.0 L/100km).
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Power / Fuel / Consumption Override */}
              {input.vehicleType !== 'bev' && input.vehicleType !== 'phev' ? (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Fuel Price ($/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Fuel Price ($/L)"
                    id="fuelPriceInput"
                    value={fuelCost ?? ''}
                    onChange={(e) => handleFuelPriceChange(e.target.value)}
                    placeholder={currentVehicle.defaultFuelPrice.toFixed(2)}
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                  />
                </div>
              ) : input.vehicleType === 'phev' ? (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Petrol Backup ($/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.customFuelPricePerL ?? 2.72}
                    onChange={(e) =>
                      handleFieldChange(
                        'customFuelPricePerL',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Efficiency (kWh/100km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={input.consumptionOverride ?? 16.5}
                    onChange={(e) =>
                      handleFieldChange(
                        'consumptionOverride',
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono"
                  />
                </div>
              )}

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
                <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer select-none">
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
                <div className="relative inline-flex items-center ml-1.5 group">
                  <button
                    type="button"
                    aria-label="Wear & Tear benchmark info"
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                  </button>
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 mb-2 w-64 p-2.5 bg-slate-900/95 border border-slate-700 rounded-lg text-[11px] text-slate-200 leading-snug shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50 pointer-events-none"
                  >
                    AA/IRD annual benchmark: $0.18/km covers the average cost of tires, brake pads, and routine servicing for a typical NZ vehicle.
                  </div>
                </div>
              </div>
            </div>

            {/* Value of Your Time Segmented Control (US-13) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Value of Your Time
                  </label>
                  <div className="relative inline-flex items-center group">
                    <button
                      type="button"
                      aria-label="Value of Your Time info"
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </button>
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-0 mb-2 w-64 sm:w-72 max-w-[calc(100vw-3rem)] p-2.5 bg-slate-900/95 border border-slate-700 rounded-lg text-[11px] text-slate-200 leading-snug shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-50"
                    >
                      The monetary value of your free time. We multiply this hourly rate by your total transit duration to reveal the &apos;hidden cost&apos; of your commute.
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-sky-400 font-mono">
                  {(input.hourlyTimeValue ?? 0) > 0 ? `$${input.hourlyTimeValue}/hr` : 'Off ($0/hr)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { mode: 'off', label: 'Off ($0)' },
                    { mode: '20', label: '$20/hr' },
                    { mode: '50', label: '$50/hr' },
                    { mode: 'custom', label: 'Custom' },
                  ] as const
                ).map((item) => {
                  const isSelected = timeValueMode === item.mode;
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      onClick={() => handleTimeValueSelect(item.mode)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-xl text-center border transition flex items-center justify-center font-medium ${
                        isSelected
                          ? 'bg-sky-950/60 border-sky-500 text-sky-300 font-bold shadow-sm ring-1 ring-sky-500/40'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <span className="text-xs truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {timeValueMode === 'custom' && (
                <div className="pt-1.5 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Custom Hourly Value:</span>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={input.hourlyTimeValue ?? 0}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseFloat(e.target.value) || 0);
                      handleFieldChange('hourlyTimeValue', val);
                    }}
                    className="w-24 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-sm text-slate-100 font-mono"
                  />
                  <span className="text-xs text-slate-400">$/hr</span>
                </div>
              )}
            </div>

            {/* RUC notice */}
            {!isEbikeActive && currentVehicle.rucRatePerKm > 0 && (
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
