import { EV_CHARGING_PRESETS, NZ_EV_CHARGING_RATES } from '@/config/fares.config';
import { SUBURB_CENTROIDS } from '@/config/suburbs';
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

  // US-36: Exact Address & Geocoded Coordinates Serialization
  if (input.originAddress && input.originAddress.trim()) {
    params.set('fromAddress', input.originAddress.trim());
  }
  if (input.destinationAddress && input.destinationAddress.trim()) {
    params.set('toAddress', input.destinationAddress.trim());
  }
  if (input.originCoordinates && input.originCoordinates.length === 2) {
    const lng = Number(input.originCoordinates[0].toFixed(6));
    const lat = Number(input.originCoordinates[1].toFixed(6));
    params.set('fromCoords', `${lng},${lat}`);
  }
  if (input.destinationCoordinates && input.destinationCoordinates.length === 2) {
    const lng = Number(input.destinationCoordinates[0].toFixed(6));
    const lat = Number(input.destinationCoordinates[1].toFixed(6));
    params.set('toCoords', `${lng},${lat}`);
  }
  if (input.firstMileMode) {
    params.set('firstMileMode', input.firstMileMode);
  }
  if (input.firstMileDistanceKm !== undefined && input.firstMileDistanceKm > 0) {
    params.set('firstMileDist', input.firstMileDistanceKm.toString());
  }
  if (input.drivingDistanceKm !== undefined && input.drivingDistanceKm > 0) {
    params.set('driveDist', input.drivingDistanceKm.toString());
  }
  if (input.drivingTimeMins !== undefined && input.drivingTimeMins > 0) {
    params.set('driveTime', input.drivingTimeMins.toString());
  }
  if (input.transitTimeMins !== undefined && input.transitTimeMins > 0) {
    params.set('transitTime', input.transitTimeMins.toString());
  }

  // US-38: Fixed Vehicle Ownership Costs Serialization
  if (input.annualWof !== undefined) {
    params.set('wof', input.annualWof.toString());
  }
  if (input.annualRego !== undefined) {
    params.set('rego', input.annualRego.toString());
  }
  if (input.insuranceEnabled !== undefined) {
    params.set('ins', input.insuranceEnabled ? '1' : '0');
  }
  if (input.customInsurance !== undefined && input.customInsurance !== null) {
    params.set('customIns', input.customInsurance.toString());
  }

  return params;
}

/**
 * Parses URLSearchParams into a CommuteInput, using fallback values for missing keys.
 * Handles parameter aliases, case normalization, and robust fallbacks.
 */
export function parseCommuteFromParams(
  params: URLSearchParams,
  fallback: CommuteInput
): CommuteInput {
  // Alias support for power, powertrain, and vehicleType
  const rawPower =
    params.get('power') ||
    params.get('powertrain') ||
    params.get('vehicleType') ||
    params.get('vehicle');

  let resolvedPowertrain: VehiclePowertrain = fallback.powertrain || 'PETROL_91';
  let resolvedVehicleType: VehicleType = fallback.vehicleType || 'petrol91';

  if (rawPower) {
    const trimmed = rawPower.trim();
    const upper = trimmed.toUpperCase() as VehiclePowertrain;
    const lower = trimmed.toLowerCase() as VehicleType;

    if (POWERTRAIN_TO_VEHICLE_TYPE[upper]) {
      resolvedPowertrain = upper;
      resolvedVehicleType = POWERTRAIN_TO_VEHICLE_TYPE[upper];
    } else if (VEHICLE_TYPE_TO_POWERTRAIN[lower]) {
      resolvedVehicleType = lower;
      resolvedPowertrain = VEHICLE_TYPE_TO_POWERTRAIN[lower];
    } else if (upper === 'PETROL' as VehiclePowertrain) {
      resolvedPowertrain = 'PETROL_91';
      resolvedVehicleType = 'petrol91';
    } else if (upper === 'DIESEL' as VehiclePowertrain) {
      resolvedPowertrain = 'DIESEL';
      resolvedVehicleType = 'diesel';
    } else if (upper === 'EV' as VehiclePowertrain || upper === 'ELECTRIC' as VehiclePowertrain) {
      resolvedPowertrain = 'BEV';
      resolvedVehicleType = 'bev';
    } else if (upper === 'HYBRID' as VehiclePowertrain) {
      resolvedPowertrain = 'HEV';
      resolvedVehicleType = 'hev';
    }
  }

  const econVal =
    params.has('econ') && !isNaN(Number(params.get('econ')))
      ? Number(params.get('econ'))
      : params.has('fuelEconomy') && !isNaN(Number(params.get('fuelEconomy')))
      ? Number(params.get('fuelEconomy'))
      : undefined;

  const parkTierParam = (params.get('park') || params.get('parkingTier')) as ParkingTier | undefined;

  // Alias support for custom parking daily rate
  const rawCustomPark =
    params.get('customPark') ||
    params.get('parkingDailyRate') ||
    params.get('parkingDaily') ||
    params.get('parkRate') ||
    params.get('dailyParking');
  const customParkVal =
    rawCustomPark !== null && !isNaN(Number(rawCustomPark))
      ? Number(rawCustomPark)
      : undefined;

  const kwhRateVal = params.has('kwhRate') && !isNaN(Number(params.get('kwhRate')))
    ? Number(params.get('kwhRate'))
    : undefined;

  const fuelRateVal =
    params.has('fuelRate') && !isNaN(Number(params.get('fuelRate')))
      ? Number(params.get('fuelRate'))
      : params.has('customFuelPricePerL') && !isNaN(Number(params.get('customFuelPricePerL')))
      ? Number(params.get('customFuelPricePerL'))
      : undefined;

  const concVal = (params.get('conc') || params.get('concession')) as ConcessionType | undefined;

  const carpoolVal =
    params.has('carpool') && !isNaN(Number(params.get('carpool')))
      ? Number(params.get('carpool'))
      : params.has('carpoolPassengers') && !isNaN(Number(params.get('carpoolPassengers')))
      ? Number(params.get('carpoolPassengers'))
      : undefined;

  const timeVal = params.has('timeRate') && !isNaN(Number(params.get('timeRate')))
    ? Number(params.get('timeRate'))
    : params.has('timeVal') && !isNaN(Number(params.get('timeVal')))
    ? Number(params.get('timeVal'))
    : params.has('hourlyTimeValue') && !isNaN(Number(params.get('hourlyTimeValue')))
    ? Number(params.get('hourlyTimeValue'))
    : undefined;

  const wearVal = params.has('wear')
    ? params.get('wear') === '1' || params.get('wear') === 'true'
    : params.has('includeMaintenanceWear')
    ? params.get('includeMaintenanceWear') === '1' || params.get('includeMaintenanceWear') === 'true'
    : undefined;

  const rawTransitMode = (params.get('transitMode') || params.get('mode')) as TransitMode | undefined;
  const rawWaiheke = params.get('waiheke') || params.get('isWaihekeRoute');
  const fromSuburbParam = params.get('from') || params.get('originSuburbId');
  const toSuburbParam = params.get('to') || params.get('destinationSuburbId');

  // US-36: Exact Address & Coordinate Parsing
  const originAddress =
    params.get('fromAddress') ||
    params.get('originAddress') ||
    params.get('fromAddr') ||
    fallback.originAddress;

  const destinationAddress =
    params.get('toAddress') ||
    params.get('destinationAddress') ||
    params.get('toAddr') ||
    fallback.destinationAddress;

  const rawFromCoords = params.get('fromCoords') || params.get('originCoords');
  let originCoordinates: [number, number] | undefined = fallback.originCoordinates;
  if (rawFromCoords) {
    const parts = rawFromCoords.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      originCoordinates = [parts[0], parts[1]];
    }
  } else if (fromSuburbParam) {
    const sub = SUBURB_CENTROIDS.find((s) => s.id === fromSuburbParam);
    if (sub) {
      originCoordinates = sub.coordinates;
    }
  }

  const rawToCoords = params.get('toCoords') || params.get('destCoords') || params.get('destinationCoords');
  let destinationCoordinates: [number, number] | undefined = fallback.destinationCoordinates;
  if (rawToCoords) {
    const parts = rawToCoords.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      destinationCoordinates = [parts[0], parts[1]];
    }
  } else if (toSuburbParam) {
    const sub = SUBURB_CENTROIDS.find((s) => s.id === toSuburbParam);
    if (sub) {
      destinationCoordinates = sub.coordinates;
    }
  }

  // Resolve suburb ID, falling back to closest centroid if coordinates are given without suburb ID
  let fromSuburb = fromSuburbParam || fallback.originSuburbId;
  if (!fromSuburbParam && originCoordinates) {
    let minDistance = Infinity;
    for (const sub of SUBURB_CENTROIDS) {
      const d = Math.hypot(sub.coordinates[0] - originCoordinates[0], sub.coordinates[1] - originCoordinates[1]);
      if (d < minDistance) {
        minDistance = d;
        fromSuburb = sub.id;
      }
    }
  }

  let toSuburb = toSuburbParam || fallback.destinationSuburbId;
  if (!toSuburbParam && destinationCoordinates) {
    let minDistance = Infinity;
    for (const sub of SUBURB_CENTROIDS) {
      const d = Math.hypot(sub.coordinates[0] - destinationCoordinates[0], sub.coordinates[1] - destinationCoordinates[1]);
      if (d < minDistance) {
        minDistance = d;
        toSuburb = sub.id;
      }
    }
  }

  const isWaiheke =
    rawWaiheke === '1' ||
    rawWaiheke === 'true' ||
    fromSuburb === 'waiheke' ||
    toSuburb === 'waiheke' ||
    Boolean(fallback.isWaihekeRoute);

  const rawFirstMileMode = (params.get('firstMileMode') || params.get('fmm'))?.toUpperCase();
  const firstMileMode: 'DRIVE' | 'WALK' | 'SCOOTER' | undefined =
    rawFirstMileMode === 'DRIVE' || rawFirstMileMode === 'WALK' || rawFirstMileMode === 'SCOOTER'
      ? rawFirstMileMode
      : fallback.firstMileMode;

  const firstMileDistanceKm =
    params.has('firstMileDist') && !isNaN(Number(params.get('firstMileDist')))
      ? Number(params.get('firstMileDist'))
      : params.has('firstMileDistanceKm') && !isNaN(Number(params.get('firstMileDistanceKm')))
      ? Number(params.get('firstMileDistanceKm'))
      : fallback.firstMileDistanceKm;

  // Alias support for driving distance
  const rawDriveDist =
    params.get('driveDist') ||
    params.get('drivingDistanceKm') ||
    params.get('distanceKm') ||
    params.get('distance') ||
    params.get('dist');
  const drivingDistanceKm =
    rawDriveDist !== null && !isNaN(Number(rawDriveDist))
      ? Number(rawDriveDist)
      : fallback.drivingDistanceKm;

  // Alias support for driving duration
  const rawDriveTime =
    params.get('driveTime') ||
    params.get('drivingTimeMins') ||
    params.get('driveDuration') ||
    params.get('drivingDuration');
  const drivingTimeMins =
    rawDriveTime !== null && !isNaN(Number(rawDriveTime))
      ? Number(rawDriveTime)
      : fallback.drivingTimeMins;

  // Alias support for transit duration
  const rawTransitTime =
    params.get('transitTime') ||
    params.get('transitTimeMins') ||
    params.get('transitDuration');
  const transitTimeMins =
    rawTransitTime !== null && !isNaN(Number(rawTransitTime))
      ? Number(rawTransitTime)
      : fallback.transitTimeMins;

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

  // Alias support for commute days per week
  const rawDays =
    params.get('days') ||
    params.get('daysPerWeek') ||
    params.get('commuteDays');
  const parsedDays =
    rawDays !== null && !isNaN(Number(rawDays))
      ? Number(rawDays)
      : fallback.daysPerWeek;
  const daysPerWeek =
    !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 7
      ? parsedDays
      : fallback.daysPerWeek;

  return {
    originSuburbId: fromSuburb,
    destinationSuburbId: toSuburb,
    originAddress,
    destinationAddress,
    originCoordinates,
    destinationCoordinates,
    daysPerWeek,
    vehicleType: resolvedVehicleType,
    powertrain: resolvedPowertrain,
    power: resolvedPowertrain,
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
    firstMileMode,
    firstMileDistanceKm,
    drivingDistanceKm,
    drivingTimeMins,
    transitTimeMins,
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
    annualWof:
      params.has('wof') && !isNaN(Number(params.get('wof')))
        ? Number(params.get('wof'))
        : fallback.annualWof,
    annualRego:
      params.has('rego') && !isNaN(Number(params.get('rego')))
        ? Number(params.get('rego'))
        : fallback.annualRego,
    insuranceEnabled: params.has('ins')
      ? params.get('ins') === '1' || params.get('ins') === 'true'
      : fallback.insuranceEnabled,
    customInsurance:
      params.has('customIns') && !isNaN(Number(params.get('customIns')))
        ? Number(params.get('customIns'))
        : fallback.customInsurance,
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