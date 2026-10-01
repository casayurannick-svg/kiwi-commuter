'use client';

import React, { useState } from 'react';
import { SUBURB_CENTROIDS } from '@/config/suburbs';
import { VehiclePowertrain, VehicleType } from '@/types';
import { ArrowLeft, ArrowRight, Check, Zap, Fuel, Leaf, Footprints } from 'lucide-react';

export interface SetupResult {
  originSuburbId: string;
  destinationSuburbId: string;
  daysPerWeek: number;
  vehicleType: VehicleType | string;
  powertrain: VehiclePowertrain;
  hasCar: boolean;
  parkingDailyRate: number;
  isParkingAssumed: boolean;
}

export interface SetupFlowProps {
  onComplete: (result: SetupResult) => void;
  initialFrom?: string;
  initialTo?: string;
}

type DriveOption = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'none';
type ParkingOption = 'free' | 'pay' | 'not_sure';

/**
 * SetupFlow (STORY-7)
 * 4-step first-run onboarding wizard:
 * Step 1: "Where do you travel?"
 * Step 2: "How many days a week?"
 * Step 3: "What do you drive?"
 * Step 4: "What's parking like at work?"
 */
export default function SetupFlow({
  onComplete,
  initialFrom = '',
  initialTo = '',
}: SetupFlowProps) {
  const [step, setStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [from, setFrom] = useState<string>(initialFrom);
  const [to, setTo] = useState<string>(initialTo);
  const [days, setDays] = useState<number | null>(null);
  const [drive, setDrive] = useState<DriveOption | null>(null);
  const [parking, setParking] = useState<ParkingOption | null>(null);
  const [payRate, setPayRate] = useState<number>(20.0);

  // Step 1 validation
  const validateStep1 = (): boolean => {
    if (!from.trim() || !to.trim()) {
      setError('Enter where you travel from and to.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 validation
  const validateStep2 = (): boolean => {
    if (!days || days < 1 || days > 5) {
      setError('Pick one to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 3 validation
  const validateStep3 = (): boolean => {
    if (!drive) {
      setError('Pick one to continue.');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 4 validation
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
        // "No car" path: pre-select free parking
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
    } else if (drive === 'electric') {
      vehicleType = 'bev';
      powertrain = 'BEV';
    }

    let parkingDailyRate = 0;
    let isParkingAssumed = false;

    if (!hasCar || parking === 'free') {
      parkingDailyRate = 0;
      isParkingAssumed = false;
    } else if (parking === 'not_sure') {
      // "Not sure" defaults to $24.50/day (Auckland typical weekday cap) and flags it as an assumption
      parkingDailyRate = 24.50;
      isParkingAssumed = true;
    } else if (parking === 'pay') {
      parkingDailyRate = payRate > 0 ? payRate : 20.00;
      isParkingAssumed = false;
    }

    onComplete({
      originSuburbId: from.trim().toLowerCase().replace(/\s+/g, '-'),
      destinationSuburbId: to.trim().toLowerCase().replace(/\s+/g, '-'),
      daysPerWeek: days || 5,
      vehicleType,
      powertrain,
      hasCar,
      parkingDailyRate,
      isParkingAssumed,
    });
  };

  const driveOptions: { id: DriveOption; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'petrol', label: 'Petrol', desc: 'Standard unleaded 91 or 95', icon: Fuel },
    { id: 'diesel', label: 'Diesel', desc: 'Pump diesel plus RUC', icon: Fuel },
    { id: 'hybrid', label: 'Hybrid', desc: 'Standard non-plug-in petrol hybrid', icon: Leaf },
    { id: 'electric', label: 'Electric', desc: 'Battery EV with home power & EV RUC', icon: Zap },
    { id: 'none', label: 'No car', desc: 'Transit-only commute (bus, train, ferry)', icon: Footprints },
  ];

  return (
    <div data-testid="setup-flow" className="space-y-6">
      {/* Progress Bar & Step Counter */}
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
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Where do you travel?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Enter where you travel from and to.
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label htmlFor="setup-from-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                From (Starting Suburb)
              </label>
              <div className="relative">
                <input
                  id="setup-from-input"
                  data-testid="setup-from-input"
                  list="auckland-suburbs-list"
                  type="text"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Mount Roskill, Albany, Takapuna"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="setup-to-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                To (Destination Suburb)
              </label>
              <div className="relative">
                <input
                  id="setup-to-input"
                  data-testid="setup-to-input"
                  list="auckland-suburbs-list"
                  type="text"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Auckland CBD, Parnell, Newmarket"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <datalist id="auckland-suburbs-list">
              {SUBURB_CENTROIDS.map((suburb) => (
                <option key={suburb.id} value={suburb.name} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      {/* Step 2: How many days a week? */}
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

      {/* Step 3: What do you drive? */}
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
                  className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all ${
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

      {/* Step 4: What's parking like at work? */}
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
            {/* Free */}
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

            {/* I pay for it */}
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
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
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
                  <span className="text-xs text-slate-400">/day</span>
                </div>
              )}
            </div>

            {/* Not sure */}
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
                  Defaults to $24.50/day (Auckland typical weekday cap) and flagged as assumption
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
