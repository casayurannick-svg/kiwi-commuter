import { EV_CHARGING_PRESETS, NZ_EV_CHARGING_RATES } from '@/config/fares.config';
import {
  CommuteInput,
  ConcessionType,
  EVChargingSource,
  EvChargingMode,
  ParkingTier,
  TransitMode,
  VehiclePowertrain,
  VehicleType,
} from '@/types';

const POWERTRAIN_TO_VEHICLE_TYPE: Record<VehiclePowertrain, VehicleType> = {
  PETROL_91: 'petrol91',
  PETROL_95: 'petrol95',
  DIESEL: 'diesel',
  PHEV: 'phev',
  BEV: 'bev',
  HEV: 'hev',
};

const VEHICLE_TYPE_TO_POWERTRAIN: Record<VehicleType, VehiclePowertrain> = {
  petrol91: 'PETROL_91',
  petrol95: 'PETROL_95',
  diesel: 'DIESEL',
  phev: 'PHEV',
  bev: 'BEV',
  hev: 'HEV',
};

/**
 * Serializes a CommuteInput object to URLSearchParams.
 */
export function serializeCommuteToParams(input: CommuteInput): URLSearchParams {
  const params = new URLSearchParams();

  if (input.originSuburbId) params.set('from', input.originSuburbId);
  if (input.destinationSuburbId) params.set('to', input.destinationSuburbId);
  if (input.daysPerWeek !== undefined) params.set('days', input.daysPerWeek.toString());

  const power: VehiclePowertrain =
    input.powertrain ||
    (input.vehicleType ? VEHICLE_TYPE_TO_POWERTRAIN[input.vehicleType] : 'PETROL_91');
  if (power) params.set('power', power);

  const econ = input.fuelEconomy ?? input.consumptionOverride;
  if (econ !== undefined) params.set('econ', econ.toString());

  const park = input.parkingTier || 'CBD_EARLY_BIRD';
  if (park) params.set('park', park);

  const customPark = input.customParkingDaily ?? input.parkingDailyRate;
  if (customPark !== undefined) params.set('customPark', customPark.toString());

  const chargeSource =
    input.evChargingSource ||
    (input.evChargingMode ? (input.evChargingMode.toUpperCase() as EVChargingSource) : undefined);
  if (
    chargeSource &&
    (power === 'BEV' || power === 'PHEV' || input.vehicleType === 'bev' || input.vehicleType === 'phev')
  ) {
    params.set('chargeSource', chargeSource);
    params.set('evChargeMode', chargeSource.toLowerCase());
  }

  const kwhRate =
    input.homeKWhRate ?? (power === 'BEV' || power === 'PHEV' ? input.fuelPriceOverride : undefined);
  if (kwhRate !== undefined) params.set('kwhRate', kwhRate.toString());

  const fuelRate =
    input.customFuelPricePerL ?? (power !== 'BEV' && power !== 'PHEV' ? input.fuelPriceOverride : undefined);
  if (fuelRate !== undefined) params.set('fuelRate', fuelRate.toString());

  if (input.concession && input.concession !== 'adult') {
    params.set('conc', input.concession);
  }

  if (input.carpoolPassengers && input.carpoolPassengers > 1) {
    params.set('carpool', input.carpoolPassengers.toString());
  }

  if (input.includeMaintenanceWear !== undefined && !input.includeMaintenanceWear) {
    params.set('wear', '0');
  }

  if (input.hourlyTimeValue && input.hourlyTimeValue > 0) {
    params.set('timeRate', input.hourlyTimeValue.toString());
  }

  if (input.transitMode) {
    params.set('transitMode', input.transitMode);
  }

  if (input.isWaihekeRoute) {
    params.set('waiheke', '1');
  }

  if (input.scooterOwnership) {
    params.set('scooterType', input.scooterOwnership);
  }

  if (input.scooterCapitalCost !== undefined) {
    params.set('scooterCost', input.scooterCapitalCost.toString());
  }

  if (input.walkDistanceKm !== undefined) {
    params.set('walkKm', input.walkDistanceKm.toString());
  }

  return params;
}

/**
 * Parses URLSearchParams into a CommuteInput, using fallback values for missing keys.
 */
export function parseCommuteFromParams(
  params: URLSearchParams,
  fallback: CommuteInput
): CommuteInput {
  const rawPower = params.get('power');
  let resolvedPowertrain: VehiclePowertrain = fallback.powertrain || 'PETROL_91';
  let resolvedVehicleType: VehicleType = fallback.vehicleType || 'petrol91';

  if (rawPower) {
    const upper = rawPower.toUpperCase() as VehiclePowertrain;
    const lower = rawPower.toLowerCase() as VehicleType;

    if (POWERTRAIN_TO_VEHICLE_TYPE[upper]) {
      resolvedPowertrain = upper;
      resolvedVehicleType = POWERTRAIN_TO_VEHICLE_TYPE[upper];
    } else if (VEHICLE_TYPE_TO_POWERTRAIN[lower]) {
      resolvedVehicleType = lower;
      resolvedPowertrain = VEHICLE_TYPE_TO_POWERTRAIN[lower];
    }
  }

  const econVal = params.has('econ') ? Number(params.get('econ')) : undefined;
  const parkTierParam = params.get('park') as ParkingTier | undefined;
  const customParkVal = params.has('customPark') ? Number(params.get('customPark')) : undefined;
  const kwhRateVal = params.has('kwhRate') ? Number(params.get('kwhRate')) : undefined;
  const fuelRateVal = params.has('fuelRate') ? Number(params.get('fuelRate')) : undefined;
  const concVal = params.get('conc') as ConcessionType | undefined;
  const carpoolVal = params.has('carpool') ? Number(params.get('carpool')) : undefined;
  const timeVal = params.has('timeRate')
    ? Number(params.get('timeRate'))
    : params.has('timeVal')
    ? Number(params.get('timeVal'))
    : undefined;
  const wearVal = params.has('wear')
    ? params.get('wear') === '1' || params.get('wear') === 'true'
    : undefined;
  const rawTransitMode = params.get('transitMode') as TransitMode | undefined;
  const rawWaiheke = params.get('waiheke');
  const fromSuburb = params.get('from') || fallback.originSuburbId;
  const toSuburb = params.get('to') || fallback.destinationSuburbId;
  const isWaiheke =
    rawWaiheke === '1' ||
    rawWaiheke === 'true' ||
    fromSuburb === 'waiheke' ||
    toSuburb === 'waiheke' ||
    Boolean(fallback.isWaihekeRoute);

  const rawChargeSource = params.get('chargeSource') || params.get('evChargeMode');
  let evChargingSource: EVChargingSource | undefined = fallback.evChargingSource;
  let evChargingMode: EvChargingMode | undefined = fallback.evChargingMode;
  if (rawChargeSource) {
    const upper = rawChargeSource.toUpperCase() as EVChargingSource;
    if (upper === 'HOME_OFFPEAK' || upper === 'HOME_FLAT' || upper === 'PUBLIC_DC' || upper === 'CUSTOM') {
      evChargingSource = upper;
      evChargingMode = upper.toLowerCase() as EvChargingMode;
    }
  } else if ((resolvedVehicleType === 'bev' || resolvedVehicleType === 'phev') && !evChargingSource) {
    evChargingSource = 'HOME_OFFPEAK';
    evChargingMode = 'home_offpeak';
  }

  const defaultKwhRate =
    evChargingSource && evChargingSource !== 'CUSTOM'
      ? NZ_EV_CHARGING_RATES[evChargingSource]
      : evChargingMode && evChargingMode !== 'custom'
      ? EV_CHARGING_PRESETS[evChargingMode]?.rate
      : undefined;

  const fuelPriceOverride =
    resolvedVehicleType === 'bev'
      ? (kwhRateVal ?? defaultKwhRate ?? fallback.fuelPriceOverride)
      : (fuelRateVal ?? fallback.fuelPriceOverride);

  const homeKWhRate =
    kwhRateVal !== undefined && !isNaN(kwhRateVal)
      ? kwhRateVal
      : (defaultKwhRate ?? fallback.homeKWhRate);

  const daysPerWeek = params.has('days') ? Number(params.get('days')) : fallback.daysPerWeek;

  return {
    originSuburbId: params.get('from') || fallback.originSuburbId,
    destinationSuburbId: params.get('to') || fallback.destinationSuburbId,
    daysPerWeek: !isNaN(daysPerWeek) && daysPerWeek >= 1 && daysPerWeek <= 7 ? daysPerWeek : fallback.daysPerWeek,
    vehicleType: resolvedVehicleType,
    powertrain: resolvedPowertrain,
    consumptionOverride: econVal !== undefined && !isNaN(econVal) ? econVal : fallback.consumptionOverride,
    fuelEconomy: econVal !== undefined && !isNaN(econVal) ? econVal : fallback.fuelEconomy,
    parkingTier: parkTierParam || fallback.parkingTier,
    parkingDailyRate:
      customParkVal !== undefined && !isNaN(customParkVal)
        ? customParkVal
        : fallback.parkingDailyRate,
    customParkingDaily:
      customParkVal !== undefined && !isNaN(customParkVal)
        ? customParkVal
        : fallback.customParkingDaily,
    parkingDaysPerWeek: !isNaN(daysPerWeek) && daysPerWeek >= 1 && daysPerWeek <= 7 ? daysPerWeek : fallback.parkingDaysPerWeek,
    concession: concVal || fallback.concession,
    includeMaintenanceWear: wearVal !== undefined ? wearVal : fallback.includeMaintenanceWear,
    carpoolPassengers:
      carpoolVal !== undefined && !isNaN(carpoolVal) && carpoolVal >= 1
        ? carpoolVal
        : fallback.carpoolPassengers,
    fuelPriceOverride,
    homeKWhRate,
    customFuelPricePerL:
      fuelRateVal !== undefined && !isNaN(fuelRateVal) ? fuelRateVal : fallback.customFuelPricePerL,
    evChargingSource,
    evChargingMode,
    hourlyTimeValue: timeVal !== undefined && !isNaN(timeVal) && timeVal >= 0 ? timeVal : fallback.hourlyTimeValue,
    transitMode: rawTransitMode || (isWaiheke ? 'FERRY' : fallback.transitMode),
    isWaihekeRoute: isWaiheke,
    scooterOwnership:
      params.get('scooterType') === 'OWNED' || params.get('scooterType') === 'RENTAL'
        ? (params.get('scooterType') as 'OWNED' | 'RENTAL')
        : fallback.scooterOwnership,
    scooterCapitalCost:
      params.has('scooterCost') && !isNaN(Number(params.get('scooterCost')))
        ? Number(params.get('scooterCost'))
        : fallback.scooterCapitalCost,
    walkDistanceKm:
      params.has('walkKm') && !isNaN(Number(params.get('walkKm')))
        ? Number(params.get('walkKm'))
        : fallback.walkDistanceKm,
  };
}

/**
 * Returns a full serialized query string (e.g. "?from=albany&to=cbd&days=5").
 */
export function serializeCommuteToQueryString(input: CommuteInput): string {
  const params = serializeCommuteToParams(input);
  const str = params.toString();
  return str ? `?${str}` : '';
}
