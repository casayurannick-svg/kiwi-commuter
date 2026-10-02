'use client';

import { NZ_EV_CHARGING_RATES, VEHICLE_PRESETS } from '@/config/fares.config';
import { AUCKLAND_SUBURBS, SUBURB_CENTROIDS } from '@/config/suburbs';
import { searchAucklandAddresses, GeocodingResult } from '@/lib/mapbox';
import { CalculationMode, CommuteInput, ConcessionType, EVChargingSource, EvChargingMode, ParkingTier, TransitMode, VehiclePowertrain, VehicleType } from '@/types';
import {
  AlertCircle,
  Bus,
  Car,
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
  ShieldCheck,
  Ship,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Tooltip from './Tooltip';
import ZoneBadge from './ZoneBadge';
import { checkEfficiencyPlausibility } from '@/lib/validation';

interface CommuteFormProps {
  input: CommuteInput;
  onChange?: (updated: CommuteInput) => void;
  onInputChange?: (updated: CommuteInput) => void;
  calculationMode?: CalculationMode;
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

export default function CommuteForm({
  input,
  onChange,
  onInputChange,
  calculationMode: calculationModeProp,
}: CommuteFormProps) {
  const calculationMode: CalculationMode = calculationModeProp ?? input.calculationMode ?? 'FUEL';
  const isIrdMode = calculationMode === 'IRD_TRUE_COST';

  const [isVehicleBaselineOpen, setIsVehicleBaselineOpen] = useState(true);
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

  const currentVehicle = VEHICLE_PRESETS[input.vehicleType as VehicleType] || VEHICLE_PRESETS.petrol91;
  const isPureEv = input.vehicleType === 'bev' || input.powertrain === 'BEV';
  const isFuelConsuming = !isPureEv;

  // US-42: Inferred AT HOP Zone Metadata[cite: 5]
  const originSuburb = AUCKLAND_SUBURBS.find((s) => s.id === input.originSuburbId);
  const destSuburb = AUCKLAND_SUBURBS.find((s) => s.id === input.destinationSuburbId);

  // US-24: Store fuelCost as a string in local state so clearing the field doesn't snap back immediately[cite: 5]
  const [fuelCost, setFuelCost] = useState<string>(() => {
    const initial = input.fuelPriceOverride ?? currentVehicle.defaultFuelPrice;
    return initial !== undefined ? initial.toString() : '';
  });

  // US-26: Store custom L/100km override in local state for fuel-consuming powertrains[cite: 5]
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
    } else if (input.consumptionOverride !== undefined) {
      const parsed = parseFloat(customConsumption);
      if (isNaN(parsed) || parsed !== input.consumptionOverride) {
        setCustomConsumption(input.consumptionOverride.toString());
      }
    }
  }, [input.vehicleType, input.powertrain, input.consumptionOverride, customConsumption]);

  // US-38: Fixed Vehicle Ownership Costs State[cite: 5]
  const [isFixedCostsOpen, setIsFixedCostsOpen] = useState(false);
  const [customInsuranceInput, setCustomInsuranceInput] = useState<string>(() => {
    return typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)
      ? input.customInsurance.toString()
      : '';
  });

  useEffect(() => {
    if (typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)) {
      setCustomInsuranceInput(input.customInsurance.toString());
    } else if (input.customInsurance === null || input.customInsurance === undefined) {
      setCustomInsuranceInput('');
    }
  }, [input.customInsurance]);

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
    const trimmed = valStr.trim();
    if (trimmed === '') {
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
      kwhRate: isEvOrPhev ? (input.kwhRate ?? 0.33) : undefined,
      evEfficiency: isEvOrPhev ? (input.evEfficiency ?? 15) : undefined,
      chargeSource: isEvOrPhev ? (input.chargeSource ?? input.evChargingSource ?? 'HOME_OFFPEAK') : undefined,
      evChargingSource: isEvOrPhev ? (input.chargeSource ?? input.evChargingSource ?? 'HOME_OFFPEAK') : undefined,
      evChargingMode: isEvOrPhev ? (input.evChargingMode ?? 'home_offpeak') : undefined,
    };
    notifyChange(updated);
  };

  const handleChargingSourceSelect = (source: EVChargingSource) => {
    const rate = source === 'CUSTOM'
      ? (input.kwhRate ?? input.homeKWhRate ?? input.fuelPriceOverride ?? 0.33)
      : NZ_EV_CHARGING_RATES[source];
    const mode = source.toLowerCase() as EvChargingMode;
    const updated: CommuteInput = {
      ...input,
      chargeSource: source,
      evChargingSource: source,
      evChargingMode: mode,
      fuelPriceOverride: rate,
      homeKWhRate: rate,
      kwhRate: rate,
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
        customParkingDaily: undefined,
      };
      notifyChange(updated);
    } else {
      const updated: CommuteInput = {
        ...input,
        parkingTier: 'CUSTOM',
        parkingDailyRate: input.parkingDailyRate ?? defaultRate,
        customParkingDaily: input.parkingDailyRate ?? defaultRate,
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
  };

  // US-28 & US-36: Address Geocoding autocomplete states[cite: 5]
  const [originQuery, setOriginQuery] = useState(input.originAddress || '');
  const [originSuggestions, setOriginSuggestions] = useState<GeocodingResult[]>([]);
  const [isOriginLoading, setIsOriginLoading] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);

  const [destQuery, setDestQuery] = useState(input.destinationAddress || '');
  const [destSuggestions, setDestSuggestions] = useState<GeocodingResult[]>([]);
  const [isDestLoading, setIsDestLoading] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

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
        const results = await searchAucklandAddresses(val, undefined, {
          transitMode: input.transitMode,
        });
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
        const results = await searchAucklandAddresses(val, undefined, {
          transitMode: input.transitMode,
        });
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

      {/* Origin & Destination (US-28 & US-42 Inferred Zone Badges with Height Alignment) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Origin */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between gap-1 min-h-[36px]">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 shrink min-w-0">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">From (Origin Address)</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              {originSuburb && (
                <ZoneBadge
                  zone={originSuburb.zone}
                  hubName={originSuburb.name}
                  variant="origin"
                  data-testid="origin-zone-badge"
                />
              )}
              {input.originCoordinates && (
                <span className="text-[10px] text-emerald-400/80 font-mono whitespace-nowrap">
                  {input.originCoordinates[0].toFixed(2)}, {input.originCoordinates[1].toFixed(2)}
                </span>
              )}
            </div>
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
        </div>

        {/* Destination */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between gap-1 min-h-[36px]">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1 shrink min-w-0">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">To (Destination Address)</span>
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              {destSuburb && (
                <ZoneBadge
                  zone={destSuburb.zone}
                  hubName={destSuburb.name}
                  variant="destination"
                  data-testid="destination-zone-badge"
                />
              )}
              {input.destinationCoordinates && (
                <span className="text-[10px] text-sky-400/80 font-mono whitespace-nowrap">
                  {input.destinationCoordinates[0].toFixed(2)}, {input.destinationCoordinates[1].toFixed(2)}
                </span>
              )}
            </div>
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

      {/* Days in Office */}
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

      {/* US-11: E-Bike mode parameters */}
      {isEbikeActive ? (
        <div className="space-y-3 p-3.5 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <span>🚲</span> E-Bike Hardware &amp; Cost Parameters
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Private Vehicle Baseline Settings */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          data-testid="toggle-vehicle-baseline-btn"
          onClick={() => setIsVehicleBaselineOpen(!isVehicleBaselineOpen)}
          className="w-full min-h-[44px] flex items-center justify-between text-xs font-semibold text-slate-300 hover:text-white transition"
          aria-expanded={isVehicleBaselineOpen}
        >
          <span className="flex items-center gap-1.5 font-bold">
            <Car className="w-3.5 h-3.5 text-emerald-400" />
            Private Vehicle Baseline {isVehicleBaselineOpen ? '▴' : '▾'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {currentVehicle.name} • ${input.parkingDailyRate.toFixed(0)}/d park
          </span>
        </button>

        {isVehicleBaselineOpen && (
          <div className="mt-2.5 space-y-3.5">
            {/* Powertrain */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs font-semibold text-slate-300">Powertrain</label>
                <Tooltip
                  avoidCollisions={true}
                  content="Default values are based on national averages. For a more accurate calculation, enter your vehicle's exact L/100km rating."
                >
                  <button
                    type="button"
                    aria-label="Powertrain benchmark info"
                    className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                  </button>
                </Tooltip>
              </div>
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
                      <span className="text-[10px] text-slate-400 font-mono">
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
                          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 max-w-[90vw] bg-slate-900/95 border border-slate-700 rounded-lg text-[11px] text-slate-200 whitespace-nowrap shadow-xl backdrop-blur-md opacity-0 group-hover/hev:opacity-100 group-focus-within/hev:opacity-100 transition-opacity duration-150 z-50 pointer-events-none"
                        >
                          {opt.tooltip}
                        </div>
                      </div>
                    );
                  }

                  return buttonContent;
                })}
              </div>

              {isFuelConsuming && (() => {
                const isConsumptionDefault =
                  input.consumptionOverride === undefined &&
                  (customConsumption === '' || customConsumption === currentVehicle.defaultConsumption.toString());
                const parsedCustomConsumption = parseFloat(customConsumption);
                const evalConsumption =
                  !isNaN(parsedCustomConsumption) && parsedCustomConsumption > 0
                    ? parsedCustomConsumption
                    : input.consumptionOverride;
                const consumptionWarning =
                  evalConsumption !== undefined
                    ? checkEfficiencyPlausibility(input.vehicleType, evalConsumption)
                    : null;

                return (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="custom-l100km-input" className="text-xs text-slate-300 font-medium">
                          Custom L/100km
                        </label>
                        {isConsumptionDefault && (
                          <span
                            data-testid="consumption-default-badge"
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
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
                    {consumptionWarning && (
                      <div
                        data-testid="efficiency-warning"
                        className="flex items-center gap-1.5 text-xs text-amber-400 mt-1 font-sans"
                        role="status"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>{consumptionWarning}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Daily Parking */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Daily Parking</label>
                <span className="text-xs font-bold text-sky-400 tabular-nums">
                  ${input.parkingDailyRate.toFixed(0)} a day
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
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      notifyChange({
                        ...input,
                        parkingTier: 'CUSTOM',
                        parkingDailyRate: rate,
                        customParkingDaily: rate,
                      });
                    }}
                    className="w-24 min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-sm text-slate-100"
                  />
                  <span className="text-xs text-slate-400">a day</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disclosure: Custom Rates */}
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
          <span className="text-[11px] text-slate-400 font-mono">
            {input.vehicleType === 'bev' || input.vehicleType === 'phev'
              ? 'Charging & Concession'
              : 'Fuel & Carpool'}
          </span>
        </button>

        {isCustomRatesOpen && (
          <div className="mt-2 pt-3 border-t border-slate-800/80 space-y-3 bg-slate-950/50 p-3.5 rounded-xl text-xs">
            {/* EV Power Source Selector */}
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
                        <span className="text-[10px] text-slate-400 font-mono">{item.sub}</span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="fuelPriceInput" className="text-[11px] text-slate-400">
                        Fuel Price ($/L)
                      </label>
                      {input.fuelPriceOverride === undefined && (
                        <span
                          data-testid="fuel-price-default-badge"
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Default: ${currentVehicle.defaultFuelPrice.toFixed(2)}/L
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    aria-label="Fuel Price ($/L)"
                    id="fuelPriceInput"
                    data-testid="fuel-price-input"
                    value={fuelCost ?? ''}
                    onChange={(e) => handleFuelPriceChange(e.target.value)}
                    placeholder={currentVehicle.defaultFuelPrice.toFixed(2)}
                    className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono"
                  />
                </div>
              ) : input.vehicleType === 'phev' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <label htmlFor="custom-petrol-backup-input" className="text-[11px] text-slate-400">
                        Petrol Backup ($/L)
                      </label>
                      {input.customFuelPricePerL === undefined && (
                        <span
                          data-testid="petrol-backup-default-badge"
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Default: $2.72/L
                    </span>
                  </div>
                  <input
                    id="custom-petrol-backup-input"
                    data-testid="custom-petrol-backup-input"
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
              ) : (() => {
                const isEvEffDefault = input.consumptionOverride === undefined;
                const evEffValue = input.consumptionOverride ?? 16.5;
                const evWarning = checkEfficiencyPlausibility(input.vehicleType, evEffValue);

                return (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="ev-efficiency-input" className="text-[11px] text-slate-400">
                          Efficiency (kWh/100km)
                        </label>
                        {isEvEffDefault && (
                          <span
                            data-testid="ev-efficiency-default-badge"
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Default: 16.5 kWh/100km
                      </span>
                    </div>
                    <input
                      id="ev-efficiency-input"
                      data-testid="ev-efficiency-input"
                      type="number"
                      step="0.1"
                      value={input.consumptionOverride ?? 16.5}
                      onChange={(e) =>
                        handleFieldChange(
                          'consumptionOverride',
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      className="w-full min-h-[44px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    {evWarning && (
                      <div
                        data-testid="ev-efficiency-warning"
                        className="flex items-center gap-1.5 text-xs text-amber-400 mt-1 font-sans"
                        role="status"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                        <span>{evWarning}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

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
              <div className={`flex items-center pt-4 justify-between ${isIrdMode ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                  <label
                    className={`text-xs text-slate-300 flex items-center gap-2 select-none ${
                      isIrdMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      data-testid="wear-tear-checkbox"
                      disabled={isIrdMode}
                      checked={isIrdMode ? false : input.includeMaintenanceWear}
                      onChange={(e) => handleFieldChange('includeMaintenanceWear', e.target.checked)}
                      className={`w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 ${
                        isIrdMode ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    />
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      AA Wear & Tires ($0.18/km)
                    </span>
                  </label>
                  {isIrdMode && (
                    <span
                      data-testid="wear-tear-ird-label"
                      className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5"
                    >
                      Included in IRD True Cost
                    </span>
                  )}
                  <Tooltip
                    avoidCollisions={true}
                    align="end"
                    content={
                      isIrdMode
                        ? "Included in IRD True Cost."
                        : "AA/IRD annual benchmark: $0.18/km covers the average cost of tires, brake pads, and routine servicing for a typical NZ vehicle."
                    }
                  >
                    <button
                      type="button"
                      aria-label="Wear & Tear benchmark info"
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Distance-Based Wear Assumption */}
              <div className="pt-2 border-t border-slate-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="distance-wear-input" className="text-[11px] text-slate-400 font-medium">
                      Distance-Based Wear ($ a week)
                    </label>
                    {(input.distanceWearWeekly === undefined || input.distanceWearWeekly === 3.0) && (
                      <span
                        data-testid="wear-assumption-badge"
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-slate-300"
                      >
                        Assumption
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Default: $3.00 a week
                  </span>
                </div>
                <input
                  id="distance-wear-input"
                  data-testid="distance-wear-input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={input.distanceWearWeekly ?? 3.0}
                  onChange={(e) => {
                    const val = e.target.value !== '' ? parseFloat(e.target.value) : undefined;
                    handleFieldChange('distanceWearWeekly', val);
                    handleFieldChange('distanceWear', val);
                  }}
                  className="w-full min-h-[40px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Value of Your Time */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    Value of Your Time
                  </label>
                  <Tooltip
                    avoidCollisions={true}
                    align="start"
                    content="The monetary value of your free time. We multiply this hourly rate by your total transit duration to reveal the 'hidden cost' of your commute."
                  >
                    <button
                      type="button"
                      aria-label="Value of Your Time info"
                      className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200 min-h-[24px] min-w-[24px] inline-flex items-center justify-center"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                    </button>
                  </Tooltip>
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

            {/* Fixed Ownership Costs */}
            <div className={`pt-2 border-t border-slate-800/80 space-y-2 ${isIrdMode ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  data-testid="toggle-fixed-costs-btn"
                  onClick={() => setIsFixedCostsOpen(!isFixedCostsOpen)}
                  className="min-h-[44px] flex items-center gap-1.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fixed Ownership Costs (Annual) {isFixedCostsOpen ? '▴' : '▾'}</span>
                </button>
                <div className="flex items-center gap-2">
                  {isIrdMode ? (
                    <span
                      data-testid="fixed-costs-ird-label"
                      className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5"
                    >
                      Included in IRD True Cost
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ${(
                        (input.annualWof ?? 85) +
                        (input.annualRego ?? 173) +
                        (input.insuranceEnabled !== false
                          ? (typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)
                              ? input.customInsurance
                              : (input.defaultInsurance ?? 1311))
                          : 0)
                      ).toLocaleString('en-NZ')} a year
                    </span>
                  )}
                  {isIrdMode && (
                    <Tooltip
                      avoidCollisions={true}
                      align="end"
                      content="Included in IRD True Cost."
                    >
                      <button
                        type="button"
                        aria-label="Fixed Ownership Costs IRD info"
                        className="text-slate-400 hover:text-slate-200 transition-colors p-1 -m-1 focus:outline-none focus:text-slate-200 min-h-[24px] min-w-[24px] inline-flex items-center justify-center"
                      >
                        <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {isFixedCostsOpen && (
                <div
                  data-testid="fixed-costs-container"
                  className={`space-y-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs animate-in fade-in duration-150 ${
                    isIrdMode ? 'opacity-50 pointer-events-none select-none' : ''
                  }`}
                >
                  {isIrdMode && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-2 pointer-events-auto">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>WOF, Rego, and Insurance are included in IRD True Cost ($1.20/km).</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Annual WOF ($ a year)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="85"
                        disabled={isIrdMode}
                        value={input.annualWof ?? 85}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value) || 0);
                          handleFieldChange('annualWof', val);
                        }}
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono disabled:opacity-50"
                      />
                      <span className="text-[10px] text-slate-400">VTNZ/AA annual inspection</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Annual Rego / Licensing ($ a year)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="173"
                        disabled={isIrdMode}
                        value={input.annualRego ?? 173}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value) || 0);
                          handleFieldChange('annualRego', val);
                        }}
                        className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono disabled:opacity-50"
                      />
                      <span className="text-[10px] text-slate-400">NZTA private light vehicle licence</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs text-slate-300 flex items-center gap-2 select-none ${isIrdMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={isIrdMode}
                          checked={input.insuranceEnabled !== false}
                          onChange={(e) => handleFieldChange('insuranceEnabled', e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 disabled:opacity-50"
                        />
                        <span className="font-semibold text-slate-200">Include Comprehensive Insurance</span>
                      </label>
                      <span className="text-[10px] font-mono text-indigo-400">
                        {isIrdMode
                          ? 'Included in IRD'
                          : input.insuranceEnabled === false
                          ? 'Excluded ($0)'
                          : typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)
                          ? `Custom: $${input.customInsurance} a year`
                          : `Default: $${input.defaultInsurance ?? 1311} a year`}
                      </span>
                    </div>

                    {input.insuranceEnabled !== false && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400">
                          Custom Insurance Override ($ a year)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="25"
                            placeholder="1311 (Default NZ median)"
                            disabled={isIrdMode}
                            value={customInsuranceInput}
                            onChange={(e) => {
                              const rawVal = e.target.value;
                              setCustomInsuranceInput(rawVal);
                              if (rawVal === '') {
                                handleFieldChange('customInsurance', null);
                              } else {
                                const parsed = parseFloat(rawVal);
                                if (!isNaN(parsed) && parsed >= 0) {
                                  handleFieldChange('customInsurance', parsed);
                                }
                              }
                            }}
                            className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-200 font-mono disabled:opacity-50"
                          />
                          {customInsuranceInput !== '' && !isIrdMode && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomInsuranceInput('');
                                handleFieldChange('customInsurance', null);
                              }}
                              className="min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-300 hover:text-white transition shrink-0"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)
                            ? `Custom premium of $${input.customInsurance} a year completely overrides the default $1,311 NZ benchmark.`
                            : 'Enter your vehicle policy premium (e.g. $1,850 for Isuzu MU-X or $950 for Honda Jazz) to override the $1,311 NZ benchmark.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>70% Commute Apportionment:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {isIrdMode ? 'Included in IRD ($0 add-on)' : `$${(
                        (
                          (input.annualWof ?? 85) +
                          (input.annualRego ?? 173) +
                          (input.insuranceEnabled !== false
                            ? (typeof input.customInsurance === 'number' && !isNaN(input.customInsurance)
                                ? input.customInsurance
                                : (input.defaultInsurance ?? 1311))
                            : 0)
                        ) * 0.70 / 12
                      ).toFixed(0)} a month`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* RUC notice */}
            {!isEbikeActive && currentVehicle.rucRatePerKm > 0 && (
              <div
                className={`text-[11px] rounded-lg p-2 flex items-center justify-between gap-1.5 transition ${
                  isIrdMode
                    ? 'text-slate-400 bg-slate-900/60 border border-slate-800 opacity-50 pointer-events-none'
                    : 'text-amber-300/90 bg-amber-500/10 border border-amber-500/20'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${isIrdMode ? 'text-slate-400' : 'text-amber-400'}`} />
                  <span>
                    NZTA RUC: ${(currentVehicle.rucRatePerKm * 1000).toFixed(0)}/1,000 km
                    {isIrdMode ? ' (Included in IRD True Cost)' : ' included.'}
                  </span>
                </div>
                {isIrdMode && (
                  <span
                    data-testid="ruc-ird-label"
                    className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 rounded px-1.5 py-0.5"
                  >
                    Included in IRD True Cost
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}