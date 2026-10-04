'use client';

import React, { useState } from 'react';
import { SUBURB_CENTROIDS } from '@/config/suburbs';
import { ParkingTier, VehiclePowertrain, VehicleType } from '@/types';
import { GeocodingResult } from '@/lib/mapbox';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { ArrowLeft, ArrowRight, Check, Zap, Fuel, Leaf, Footprints, MapPin, Plug, AlertTriangle } from 'lucide-react';

export interface SetupResult {
  originSuburbId: string;
  destinationSuburbId: string;
  originAddress?: string;
  destinationAddress?: string;
  originCoordinates?: [number, number];
  destinationCoordinates?: [number, number];
  daysPerWeek: number;
  vehicleType: VehicleType | string;
  powertrain: VehiclePowertrain;
  hasCar: boolean;
  parkingDailyRate: number;
  parkingTier?: ParkingTier | 'CUSTOM';
  isParkingAssumed: boolean;
  // Manual override metrics (STORY-22)
  manualDistanceKm?: number;
  manualDriveTimeMins?: number;
  manualTransitTimeMins?: number;
}

export interface SetupFlowProps {
  onComplete: (result: SetupResult) => void;
  initialFrom?: string;
  initialTo?: string;
  initialStep?: number;
}

type DriveOption = 'petrol' | 'diesel' | 'hybrid' | 'phev' | 'electric' | 'none';
type ParkingOption = 'free' | 'pay' | 'not_sure';

export default function SetupFlow({
  onComplete,
  initialFrom = '',
  initialTo = '',
  initialStep = 1,
}: SetupFlowProps) {
  const [step, setStep] = useState<number>(initialStep);
  const [error, setError] = useState<string | null>(null);

  // STORY-23: API Error boundary state
  const [apiError, setApiError] = useState<boolean>(false);

  // STORY-22: Manual Mode State
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualDistance, setManualDistance] = useState<string>('');
  const [manualDriveTime, setManualDriveTime] = useState<string>('');
  const [manualTransitTime, setManualTransitTime] = useState<string>('');

  // Form State
  const [from, setFrom] = useState<string>(initialFrom);
  const [to, setTo] = useState<string>(initialTo);
  const [fromCoords, setFromCoords] = useState<[number, number] | undefined>();
  const [toCoords, setToCoords] = useState<[number, number] | undefined>();
  const [fromSuburbId, setFromSuburbId] = useState<string | undefined>();
  const [toSuburbId, setToSuburbId] = useState<string | undefined>();
  const [days, setDays] = useState<number | null>(null);
  const [drive, setDrive] = useState<DriveOption | null>(null);
  const [parking, setParking] = useState<ParkingOption | null>(null);
  const [payRate, setPayRate] = useState<number>(20.0);

  const findClosestSuburb = (item: GeocodingResult): string => {
    let closestSuburbId = 'cbd';
    let minDistance = Infinity;
    const coords = item.coordinates || (typeof item.longitude === 'number' && typeof item.latitude === 'number' ? [item.longitude, item.latitude] : undefined);
    if (!coords) return closestSuburbId;
    for (const sub of SUBURB_CENTROIDS) {
      const d = Math.hypot(
        sub.coordinates[0] - coords[0],
        sub.coordinates[1] - coords[1]
      );
      if (d < minDistance) {
        minDistance = d;
        closestSuburbId = sub.id;
      }
    }
    return closestSuburbId;
  };

  const resolveSuburb = (
    text: string,
    existingCoords?: [number, number],
    existingSuburbId?: string
  ): { suburbId: string; coordinates?: [number, number] } => {
    if (existingSuburbId && existingCoords) {
      return { suburbId: existingSuburbId, coordinates: existingCoords };
    }
    const clean = text.trim().toLowerCase().replace(/[\s-]+/g, '');
    const matched = SUBURB_CENTROIDS.find(
      (s) =>
        s.id.toLowerCase().replace(/[\s-]+/g, '') === clean ||
        s.name.toLowerCase().replace(/[\s-]+/g, '') === clean
    );
    if (matched) {
      return { suburbId: matched.id, coordinates: matched.coordinates };
    }
    const slug = text.trim().toLowerCase().replace(/\s+/g, '-');
    return { suburbId: existingSuburbId || slug, coordinates: existingCoords };
  };

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (isManualMode) {
      if (!from.trim() || !to.trim()) {
        setError('Enter your start and destination names.');
        return false;
      }
      if (!manualDistance || Number(manualDistance) <= 0) {
        setError('Enter a valid one-way distance in km.');
        return false;
      }
      setError(null);
      return true;
    }

    if (!from.trim() || !to.trim()) {
      setError('Enter where you travel from and to.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!days || days < 1 || days > 5) {
      setError('Pick one to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!drive) {
      setError('Pick one to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!parking) {
      setError('Pick one to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
    } else if (step === 3) {
      if (!validateStep3()) return;
      if (drive === 'none') {
        setParking('free');
      }
      setStep(4);
    } else if (step === 4) {
      if (!validateStep4()) return;
      finishSetup();
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const finishSetup = () => {
    const hasCar = drive !== 'none';
    let vehicleType = 'petrol91';
    let powertrain: VehiclePowertrain = 'PETROL_91';

    if (drive === 'diesel') {
      vehicleType = 'diesel';
      powertrain = 'DIESEL';
    } else if (drive === 'hybrid') {
      vehicleType = 'hev';
      powertrain = 'HEV';
    } else if (drive === 'phev') {
      vehicleType = 'phev';
      powertrain = 'PHEV';
    } else if (drive === 'electric') {
      vehicleType = 'bev';
      powertrain = 'BEV';
    }

    let parkingDailyRate = 0;
    let isParkingAssumed = false;
    let parkingTier: ParkingTier | 'CUSTOM' = 'FREE';

    if (!hasCar || parking === 'free') {
      parkingDailyRate = 0;
      isParkingAssumed = false;
      parkingTier = 'FREE';
    } else if (parking === 'not_sure') {
      parkingDailyRate = 24.50;
      isParkingAssumed = true;
      parkingTier = 'CUSTOM';
    } else if (parking === 'pay') {
      parkingDailyRate = payRate > 0 ? payRate : 20.00;
      isParkingAssumed = false;
      parkingTier = 'CUSTOM';
    }

    const resolvedFrom = resolveSuburb(from, fromCoords, fromSuburbId);
    const resolvedTo = resolveSuburb(to, toCoords, toSuburbId);

    onComplete({
      originSuburbId: resolvedFrom.suburbId,
      destinationSuburbId: resolvedTo.suburbId,
      originAddress: from.trim() || undefined,
      destinationAddress: to.trim() || undefined,
      originCoordinates: resolvedFrom.coordinates,
      destinationCoordinates: resolvedTo.coordinates,
      daysPerWeek: days ?? 5,
      vehicleType,
      powertrain,
      hasCar,
      parkingDailyRate,
      parkingTier,
      isParkingAssumed,
      manualDistanceKm: isManualMode && manualDistance ? parseFloat(manualDistance) : undefined,
      manualDriveTimeMins: isManualMode && manualDriveTime ? parseFloat(manualDriveTime) : undefined,
      manualTransitTimeMins: isManualMode && manualTransitTime ? parseFloat(manualTransitTime) : undefined,
    });
  };

  const driveOptions: { id: DriveOption; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'petrol', label: 'Petrol', desc: 'Standard unleaded 91 or 95', icon: Fuel },
    { id: 'diesel', label: 'Diesel', desc: 'Pump diesel plus RUC', icon: Fuel },
    { id: 'hybrid', label: 'Hybrid', desc: 'Standard non-plug-in petrol hybrid', icon: Leaf },
    { id: 'phev', label: 'Plug-in Hybrid', desc: 'Battery range, petrol engine & reduced RUC', icon: Plug },
    { id: 'electric', label: 'Electric', desc: 'Battery EV with home power & EV RUC', icon: Zap },
    { id: 'none', label: 'No car', desc: 'Transit-only commute (bus, train, ferry)', icon: Footprints },
  ];

  return (
    <div data-testid="setup-flow" className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-emerald-400 uppercase tracking-wider">
            Step {step} of 4
          </span>
          <span className="text-slate-400">
            {step === 1 && 'Route'}
            {step === 2 && 'Frequency'}
            {step === 3 && 'Vehicle'}
            {step === 4 && 'Parking'}
          </span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`Step ${step} of 4`}
          />
        </div>
      </div>

      {/* Step 1: Where do you travel? */}
      {step === 1 && (
        <div className="space-y-5 animate-fadeIn" data-testid="setup-step-1">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Where do you travel?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Enter where you travel from and to.
              </p>
            </div>

            {/* STORY-22 Manual Override Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsManualMode(!isManualMode);
                setError(null);
              }}
              className="text-xs px-2.5 py-1 rounded border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              {isManualMode ? 'Use Map Autofill' : 'Enter Manually'}
            </button>
          </div>

          {/* STORY-23 Error Banner */}
          {apiError && !isManualMode && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span>Live address search is currently down for maintenance. Please check back shortly, or click <strong>Enter Manually</strong> above.</span>
              </div>
            </div>
          )}

          {!isManualMode ? (
            <div className="space-y-3.5">
              <div className="relative z-20">
                <AddressAutocomplete
                  id="setup-from-input"
                  testId="setup-from-input"
                  label="From"
                  placeholder="e.g., 1 Queen Street, Auckland 1010"
                  value={from}
                  autoClearOnFocus
                  icon={<MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  dropdownZIndex="z-50"
                  onError={() => setApiError(true)}
                  disabled={apiError}
                  onChange={(val) => {
                    setFrom(val);
                    setFromCoords(undefined);
                    setFromSuburbId(undefined);
                    if (error) setError(null);
                    setApiError(false);
                  }}
                  onSelect={(item) => {
                    setFrom(item.placeName || item.address || '');
                    setFromCoords(item.coordinates || (typeof item.longitude === 'number' && typeof item.latitude === 'number' ? [item.longitude, item.latitude] : undefined));
                    const subId = findClosestSuburb(item);
                    setFromSuburbId(subId);
                    if (error) setError(null);
                    setApiError(false);
                  }}
                  onClear={() => {
                    setFrom('');
                    setFromCoords(undefined);
                    setFromSuburbId(undefined);
                    setApiError(false);
                  }}
                />
              </div>

              <div className="relative z-10">
                <AddressAutocomplete
                  id="setup-to-input"
                  testId="setup-to-input"
                  label="To"
                  placeholder="e.g., 1 Queen Street, Auckland 1010"
                  value={to}
                  autoClearOnFocus
                  icon={<MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  dropdownZIndex="z-50"
                  onError={() => setApiError(true)}
                  disabled={apiError}
                  onChange={(val) => {
                    setTo(val);
                    setToCoords(undefined);
                    setToSuburbId(undefined);
                    if (error) setError(null);
                    setApiError(false);
                  }}
                  onSelect={(item) => {
                    setTo(item.placeName || item.address || '');
                    setToCoords(item.coordinates || (typeof item.longitude === 'number' && typeof item.latitude === 'number' ? [item.longitude, item.latitude] : undefined));
                    const subId = findClosestSuburb(item);
                    setToSuburbId(subId);
                    if (error) setError(null);
                    setApiError(false);
                  }}
                  onClear={() => {
                    setTo('');
                    setToCoords(undefined);
                    setToSuburbId(undefined);
                    setApiError(false);
                  }}
                />
              </div>
            </div>
          ) : (
            /* STORY-22: Manual Mode Form Inputs */
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">From (Suburb/Origin)</label>
                  <input
                    type="text"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="e.g. Te Atatū Peninsula"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">To (Suburb/Destination)</label>
                  <input
                    type="text"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="e.g. Auckland CBD"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={manualDistance}
                    onChange={(e) => setManualDistance(e.target.value)}
                    placeholder="e.g. 14.5"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Drive Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={manualDriveTime}
                    onChange={(e) => setManualDriveTime(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Transit Time (mins)</label>
                  <input
                    type="number"
                    min="1"
                    value={manualTransitTime}
                    onChange={(e) => setManualTransitTime(e.target.value)}
                    placeholder="e.g. 40"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5 animate-fadeIn" data-testid="setup-step-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              How many days a week?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Select how many days you commute each week.
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((d) => {
              const isSelected = days === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`setup-days-${d}`}
                  onClick={() => {
                    setDays(d);
                    if (error) setError(null);
                  }}
                  className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border font-bold transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950'
                      : 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className="text-lg sm:text-2xl font-mono">{d}</span>
                  <span className="text-[11px] font-normal text-slate-300 mt-0.5">
                    {d === 1 ? 'day' : 'days'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5 animate-fadeIn" data-testid="setup-step-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              What do you drive?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              We&apos;ll use a typical fuel use for it. You can change this later.
            </p>
          </div>

          <div className="space-y-2">
            {driveOptions.map((opt) => {
              const isSelected = drive === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={isSelected}
                  data-testid={`setup-drive-${opt.id}`}
                  onClick={() => {
                    setDrive(opt.id);
                    if (error) setError(null);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 sm:p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm'
                      : 'bg-slate-950/70 border-slate-800/80 text-slate-200 hover:bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm sm:text-base text-white">
                        {opt.label}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-5 animate-fadeIn" data-testid="setup-step-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              What&apos;s parking like at work?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Choose your usual parking situation.
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              aria-pressed={parking === 'free'}
              data-testid="setup-parking-free"
              onClick={() => {
                setParking('free');
                if (error) setError(null);
              }}
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all ${
                parking === 'free'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-semibold text-sm sm:text-base text-white">Free</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Employer provided, free street parking, or no car
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  parking === 'free'
                    ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {parking === 'free' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>

            <div
              className={`rounded-xl border transition-all overflow-hidden ${
                parking === 'pay'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-200'
              }`}
            >
              <button
                type="button"
                aria-pressed={parking === 'pay'}
                data-testid="setup-parking-pay"
                onClick={() => {
                  setParking('pay');
                  if (error) setError(null);
                }}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left"
              >
                <div>
                  <div className="font-semibold text-sm sm:text-base text-white">I pay for it</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Casual or early-bird commercial parking
                  </div>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    parking === 'pay'
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {parking === 'pay' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {parking === 'pay' && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 flex items-center gap-3">
                  <label htmlFor="custom-parking-rate" className="text-xs text-slate-300 whitespace-nowrap">
                    Daily rate:
                  </label>
                  <div className="relative w-36">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <input
                      id="custom-parking-rate"
                      type="number"
                      min="1"
                      max="100"
                      step="0.5"
                      value={payRate}
                      onChange={(e) => setPayRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-6 pr-2.5 text-xs text-white font-mono font-bold"
                    />
                  </div>
                  <span className="text-xs text-slate-400">a day</span>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-pressed={parking === 'not_sure'}
              data-testid="setup-parking-not-sure"
              onClick={() => {
                setParking('not_sure');
                if (error) setError(null);
              }}
              className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all ${
                parking === 'not_sure'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-semibold text-sm sm:text-base text-white">Not sure</div>
                <div className="text-xs text-amber-300 mt-0.5">
                  Defaults to $24.50 a day (Auckland typical weekday cap) and flagged as assumption.
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  parking === 'not_sure'
                    ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {parking === 'not_sure' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Message */}
      {error && (
        <div
          role="alert"
          data-testid="setup-validation-error"
          className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm text-rose-400 font-medium"
        >
          {error}
        </div>
      )}

      {/* Navigation Buttons: Next & Back */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
        <div>
          {step > 1 && (
            <button
              type="button"
              data-testid="setup-back-btn"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        <button
          type="button"
          data-testid="setup-next-btn"
          aria-label={step === 4 ? 'See my commute' : 'Next'}
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-950 transition"
        >
          <span>{step === 4 ? 'See my commute' : 'Next'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}