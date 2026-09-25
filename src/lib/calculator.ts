import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  CO2_FACTORS,
  CONCESSION_MULTIPLIERS,
  EV_CHARGING_PRESETS,
  NZ_AA_MAINTENANCE_PER_KM,
  NZ_EV_CHARGING_RATES,
  NZTA_RUC_RATES,
  PARKING_TIER_RATES,
  STATUTORY_NZTA_RUC_RATES,
  VEHICLE_PRESETS,
  WAIHEKE_FERRY_FARES,
} from '@/config/fares.config';
import { estimateRouteMetrics, getSuburbById } from '@/config/suburbs';
import {
  CommuteComparisonResult,
  CommuteInput,
  DrivingCostBreakdown,
  TimeMetrics,
  TransitCostBreakdown,
  VehiclePowertrain,
  VehicleType,
} from '@/types';

export const WEEKS_PER_MONTH = 52 / 12; // 4.33333333

const POWERTRAIN_TO_VEHICLE_TYPE: Record<VehiclePowertrain, VehicleType> = {
  PETROL_91: 'petrol91',
  PETROL_95: 'petrol95',
  DIESEL: 'diesel',
  BEV: 'bev',
  PHEV: 'phev',
};

/**
 * Primary pure calculation engine for Kiwi Commuter Cost & Arbitrage.
 * Computes exact daily, monthly, and annual financial deltas between driving
 * (fuel/energy, statutory NZTA RUC, and commercial parking) and Auckland Transport
 * public transit (zonal fares and the AT $50 7-day fare cap).
 */
export function calculateCommuteArbitrage(input: CommuteInput): CommuteComparisonResult {
  const origin = getSuburbById(input.originSuburbId);
  const destination = getSuburbById(input.destinationSuburbId);

  // Route distance and zones
  const route = estimateRouteMetrics(origin, destination);
  const distanceOneWayKm = route.distanceKm;
  const distanceRoundTripKm = distanceOneWayKm * 2;

  // Resolve vehicle type and powertrain
  const effectiveVehicleType: VehicleType =
    input.powertrain && POWERTRAIN_TO_VEHICLE_TYPE[input.powertrain]
      ? POWERTRAIN_TO_VEHICLE_TYPE[input.powertrain]
      : input.vehicleType || 'petrol91';

  const vehicle = VEHICLE_PRESETS[effectiveVehicleType] || VEHICLE_PRESETS.petrol91;
  const consumption = input.consumptionOverride ?? vehicle.defaultConsumption;

  const isEbike = input.transitMode === 'EBIKE' || input.transitMode === 'E-Bike';

  // Statutory RUC rate ($/km)
  const rucRate = isEbike
    ? 0
    : input.powertrain && STATUTORY_NZTA_RUC_RATES[input.powertrain]
    ? STATUTORY_NZTA_RUC_RATES[input.powertrain].ratePerKm
    : NZTA_RUC_RATES[effectiveVehicleType]?.ratePerKm ?? 0;

  // Vehicle maintenance & wear ($/km)
  const maintenanceRate = input.includeMaintenanceWear
    ? (input.maintenanceCostPerKm ?? NZ_AA_MAINTENANCE_PER_KM)
    : 0;

  const passengers = Math.max(1, input.carpoolPassengers || 1);

  // Parking daily rate: support parkingTier preset or explicit parkingDailyRate
  let effectiveParkingRate = isEbike
    ? 0
    : typeof input.parkingDailyRate === 'number'
    ? input.parkingDailyRate
    : 0;
  if (!isEbike && input.parkingTier && PARKING_TIER_RATES[input.parkingTier]) {
    if (typeof input.parkingDailyRate !== 'number' || input.parkingDailyRate === 0) {
      effectiveParkingRate = PARKING_TIER_RATES[input.parkingTier].rate;
    }
  }

  // Helper to resolve EV / PHEV electricity rate ($/kWh)
  const resolveEvKwhRate = (): number => {
    if (input.evChargingSource) {
      if (input.evChargingSource === 'CUSTOM') {
        return input.homeKWhRate ?? input.fuelPriceOverride ?? 0.18;
      }
      if (NZ_EV_CHARGING_RATES[input.evChargingSource] !== undefined) {
        return NZ_EV_CHARGING_RATES[input.evChargingSource];
      }
    }
    if (input.evChargingMode && input.evChargingMode !== 'custom') {
      return EV_CHARGING_PRESETS[input.evChargingMode]?.rate ?? 0.18;
    }
    return input.homeKWhRate ?? input.fuelPriceOverride ?? 0.18;
  };

  // --- Driving Costs ---
  let dailyFuelCost = 0;
  let monthlyCo2KgDriving = 0;

  if (effectiveVehicleType === 'bev') {
    const evRate = resolveEvKwhRate();
    const consumptionRoundTrip = (consumption / 100) * distanceRoundTripKm;
    dailyFuelCost = round2((consumptionRoundTrip * evRate) / passengers);
    const monthlyFuelUnits = consumptionRoundTrip * input.daysPerWeek * WEEKS_PER_MONTH;
    monthlyCo2KgDriving = monthlyFuelUnits * CO2_FACTORS.nzElectricityPerKwh;
  } else if (effectiveVehicleType === 'phev') {
    // US-09: PHEV calculates first 35 km electric on the selected rate, and remainder on petrol (default $2.72/L, 6.0 L/100km).
    const electricKm = Math.min(distanceRoundTripKm, 35);
    const petrolKm = Math.max(0, distanceRoundTripKm - 35);
    const evRate = resolveEvKwhRate();
    const phevEvEfficiency = 16.5; // kWh/100km
    const phevPetrolEfficiency = 6.0; // L/100km
    const petrolPrice = input.customFuelPricePerL ?? 2.72;

    const dailyElectricCost = ((electricKm * phevEvEfficiency) / 100) * evRate;
    const dailyPetrolCost = ((petrolKm * phevPetrolEfficiency) / 100) * petrolPrice;
    dailyFuelCost = round2((dailyElectricCost + dailyPetrolCost) / passengers);

    const monthlyElectricKwh = ((electricKm * phevEvEfficiency) / 100) * input.daysPerWeek * WEEKS_PER_MONTH;
    const monthlyPetrolL = ((petrolKm * phevPetrolEfficiency) / 100) * input.daysPerWeek * WEEKS_PER_MONTH;
    monthlyCo2KgDriving =
      monthlyElectricKwh * CO2_FACTORS.nzElectricityPerKwh +
      monthlyPetrolL * CO2_FACTORS.petrolPerLitre;
  } else {
    const fuelPrice = input.customFuelPricePerL ?? input.fuelPriceOverride ?? vehicle.defaultFuelPrice;
    const consumptionRoundTrip = (consumption / 100) * distanceRoundTripKm;
    dailyFuelCost = round2((consumptionRoundTrip * fuelPrice) / passengers);

    let co2FactorPerUnit = CO2_FACTORS.petrolPerLitre;
    if (effectiveVehicleType === 'diesel') co2FactorPerUnit = CO2_FACTORS.dieselPerLitre;
    const monthlyFuelUnits = consumptionRoundTrip * input.daysPerWeek * WEEKS_PER_MONTH;
    monthlyCo2KgDriving = monthlyFuelUnits * co2FactorPerUnit;
  }

  const dailyRucCost = round2((distanceRoundTripKm * rucRate) / passengers);
  const dailyMaintenanceCost = round2((distanceRoundTripKm * maintenanceRate) / passengers);

  // Parking: applies for parkingDaysPerWeek days per week (defaults to daysPerWeek)
  const parkingDays = typeof input.parkingDaysPerWeek === 'number' ? input.parkingDaysPerWeek : input.daysPerWeek;
  const effectiveParkingDays = Math.min(parkingDays, input.daysPerWeek);
  const weeklyParkingCost = round2((effectiveParkingRate * effectiveParkingDays) / passengers);
  const dailyParkingCost = input.daysPerWeek > 0 ? round2(weeklyParkingCost / input.daysPerWeek) : 0;

  const dailyTotalDriving = round2(
    dailyFuelCost + dailyRucCost + dailyParkingCost + dailyMaintenanceCost
  );

  const weeklyFuelCost = round2(dailyFuelCost * input.daysPerWeek);
  const weeklyRucCost = round2(dailyRucCost * input.daysPerWeek);
  const weeklyMaintenanceCost = round2(dailyMaintenanceCost * input.daysPerWeek);
  const weeklyTotalDriving = round2(
    weeklyFuelCost + weeklyRucCost + weeklyParkingCost + weeklyMaintenanceCost
  );

  const monthlyFuelCost = round2(weeklyFuelCost * WEEKS_PER_MONTH);
  const monthlyRucCost = round2(weeklyRucCost * WEEKS_PER_MONTH);
  const monthlyParkingCost = round2(weeklyParkingCost * WEEKS_PER_MONTH);
  const monthlyMaintenanceCost = round2(weeklyMaintenanceCost * WEEKS_PER_MONTH);
  const monthlyTotalDriving = round2(weeklyTotalDriving * WEEKS_PER_MONTH);

  const annualTotalDriving = round2(monthlyTotalDriving * 12);

  const drivingBreakdown: DrivingCostBreakdown = {
    distanceOneWayKm: round1(distanceOneWayKm),
    distanceRoundTripKm: round1(distanceRoundTripKm),
    dailyFuelCost,
    dailyRucCost,
    dailyParkingCost,
    dailyMaintenanceCost,
    dailyTotal: dailyTotalDriving,

    weeklyFuelCost,
    weeklyRucCost,
    weeklyParkingCost,
    weeklyMaintenanceCost,
    weeklyTotal: weeklyTotalDriving,

    monthlyFuelCost,
    monthlyRucCost,
    monthlyParkingCost,
    monthlyMaintenanceCost,
    monthlyTotal: monthlyTotalDriving,

    annualTotal: annualTotalDriving,
    monthlyCo2Kg: round1(monthlyCo2KgDriving),
  };

  // --- Public Transport (AT HOP / Ferry / E-Bike) Costs ---
  const isMicromobility =
    !isEbike &&
    (input.transitMode === 'MICROMOBILITY_TRANSIT' ||
      input.transitMode === 'Scooter & Ride' ||
      input.transitMode === 'Scooter & Transit');

  const isFerry =
    !isEbike &&
    !isMicromobility &&
    (input.transitMode === 'FERRY' ||
      input.transitMode === 'Ferry' ||
      (!input.transitMode && origin.primaryTransitMode === 'Ferry'));

  const isWaiheke = Boolean(
    input.isWaihekeRoute ||
    (isFerry && (input.originSuburbId === 'waiheke' || input.destinationSuburbId === 'waiheke'))
  );

  const zoneCount = route.zonesTraveled;

  // US-23: Micro-mobility calculations
  const walkDistanceKm = typeof input.walkDistanceKm === 'number' ? input.walkDistanceKm : 2.0;
  // Scooter duration at 15 km/h: (d / 15) * 60 = d * 4 mins
  const scooterDurationMinsPerLeg = round1((walkDistanceKm / 15) * 60);
  // Default walk speed is 5 km/h (12 mins/km). By scooting, time saved per leg = (12 - 4) * d = 8 * d mins.
  const walkDurationMinsPerLeg = (walkDistanceKm / 5) * 60;
  const transitTimeSavedPerLeg = Math.max(0, walkDurationMinsPerLeg - scooterDurationMinsPerLeg);
  const adjustedTransitTimeMins = isMicromobility
    ? Math.max(5, Math.round(route.transitTimeMins - transitTimeSavedPerLeg))
    : route.transitTimeMins;

  let singleTripStandardFare: number;
  let singleTripConcessionFare: number;
  let dailyTransitFare: number;
  let uncappedWeeklyFare: number;
  let isHopCapApplied = false;
  let hopCappedWeeklyFare: number;
  let weeklyTransitTotal: number;
  let monthlyTransitTotal: number;

  let scooterRentalFeesDaily = 0;
  let scooterRentalFeesMonthly = 0;
  let hopFareMonthly = 0;

  if (isEbike) {
    // US-11: E-Bike mode: calculate energy cost based on distance * ebikeCostPerKm
    const ebikeCostPerKm = typeof input.ebikeCostPerKm === 'number' ? input.ebikeCostPerKm : 0.0027;
    const dailyEbikeEnergyCost = round2(distanceRoundTripKm * ebikeCostPerKm);
    singleTripStandardFare = round2(dailyEbikeEnergyCost / 2);
    singleTripConcessionFare = singleTripStandardFare;

    dailyTransitFare = dailyEbikeEnergyCost;
    uncappedWeeklyFare = round2(dailyTransitFare * input.daysPerWeek);

    isHopCapApplied = false;
    hopCappedWeeklyFare = uncappedWeeklyFare;
    weeklyTransitTotal = uncappedWeeklyFare;
    monthlyTransitTotal = round2(weeklyTransitTotal * WEEKS_PER_MONTH);
    hopFareMonthly = 0;
  } else if (isFerry && isWaiheke) {
    // US-20: Waiheke Ferry (Fullers360) bypasses the AT $50 weekly cap and applies Fullers commercial rates
    singleTripStandardFare = WAIHEKE_FERRY_FARES.singleTripStandard;
    const concessionRate = WAIHEKE_FERRY_FARES.concessionFares[input.concession] ?? singleTripStandardFare;
    singleTripConcessionFare = round2(concessionRate);

    dailyTransitFare = round2(singleTripConcessionFare * 2);
    uncappedWeeklyFare = round2(dailyTransitFare * input.daysPerWeek);

    // Fullers Waiheke Ferry is exempt from AT $50 7-day cap
    isHopCapApplied = false;
    hopCappedWeeklyFare = uncappedWeeklyFare;
    weeklyTransitTotal = hopCappedWeeklyFare;

    // Use monthly pass rate if adult 5-day commute weekly total exceeds monthly pass breakdown
    const rawMonthly = round2(weeklyTransitTotal * WEEKS_PER_MONTH);
    monthlyTransitTotal =
      input.concession === 'adult' && rawMonthly > WAIHEKE_FERRY_FARES.monthlyPass
        ? WAIHEKE_FERRY_FARES.monthlyPass
        : rawMonthly;
    hopFareMonthly = monthlyTransitTotal;
  } else {
    // Standard AT HOP Zonal Fares (Devonport, Birkenhead, Hobsonville ferries & bus/train)
    singleTripStandardFare = AT_HOP_ZONE_FARES[zoneCount] || 2.60;

    // Concession calculation
    if (input.fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession]) {
      singleTripConcessionFare = AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession][zoneCount];
    } else {
      const concessionInfo =
        CONCESSION_MULTIPLIERS[input.concession] || CONCESSION_MULTIPLIERS.adult;
      singleTripConcessionFare = round2(singleTripStandardFare * concessionInfo.multiplier);
    }

    const baseDailyHopFare = round2(singleTripConcessionFare * 2);
    const baseUncappedWeeklyFare = round2(baseDailyHopFare * input.daysPerWeek);

    // Apply AT HOP 7-Day $50 Cap
    isHopCapApplied = baseUncappedWeeklyFare > AT_HOP_7_DAY_CAP;
    hopCappedWeeklyFare = isHopCapApplied ? AT_HOP_7_DAY_CAP : baseUncappedWeeklyFare;
    const baseWeeklyHopFare = round2(hopCappedWeeklyFare);
    const baseMonthlyHopFare = round2(baseWeeklyHopFare * WEEKS_PER_MONTH);
    hopFareMonthly = baseMonthlyHopFare;

    if (isMicromobility && input.scooterOwnership === 'RENTAL') {
      // US-23: Rental Scooter: $1 unlock + $0.45/min per leg
      // 2 legs per day return
      const costPerLeg = 1.00 + (scooterDurationMinsPerLeg * 0.45);
      scooterRentalFeesDaily = round2(costPerLeg * 2);
      const weeklyRentalFees = round2(scooterRentalFeesDaily * input.daysPerWeek);
      scooterRentalFeesMonthly = round2(weeklyRentalFees * WEEKS_PER_MONTH);

      dailyTransitFare = round2(baseDailyHopFare + scooterRentalFeesDaily);
      uncappedWeeklyFare = round2(baseUncappedWeeklyFare + weeklyRentalFees);
      weeklyTransitTotal = round2(baseWeeklyHopFare + weeklyRentalFees);
      monthlyTransitTotal = round2(baseMonthlyHopFare + scooterRentalFeesMonthly);
    } else {
      dailyTransitFare = baseDailyHopFare;
      uncappedWeeklyFare = baseUncappedWeeklyFare;
      weeklyTransitTotal = baseWeeklyHopFare;
      monthlyTransitTotal = baseMonthlyHopFare;
    }
  }

  const annualTransitTotal = round2(monthlyTransitTotal * 12);

  // Monthly CO2 for transit (kg)
  const monthlyTransitPassengerKm = distanceRoundTripKm * input.daysPerWeek * WEEKS_PER_MONTH;
  const monthlyCo2KgTransit = monthlyTransitPassengerKm * CO2_FACTORS.ptPerPassengerKm;

  const transitBreakdown: TransitCostBreakdown = {
    zoneCount,
    singleTripStandardFare: round2(singleTripStandardFare),
    singleTripConcessionFare,
    dailyFare: dailyTransitFare,
    uncappedWeeklyFare,
    isHopCapApplied,
    hopCappedWeeklyFare,
    weeklyTotal: weeklyTransitTotal,
    monthlyTotal: monthlyTransitTotal,
    annualTotal: annualTransitTotal,
    monthlyCo2Kg: round1(monthlyCo2KgTransit),
    primaryMode: isEbike
      ? 'E-Bike'
      : isMicromobility
      ? 'Scooter & Ride'
      : isFerry
      ? 'Ferry'
      : origin.primaryTransitMode,
    estimatedTransitTimeMins: adjustedTransitTimeMins,
    scooterRentalFeesDaily: isMicromobility && input.scooterOwnership === 'RENTAL' ? scooterRentalFeesDaily : undefined,
    scooterRentalFeesMonthly: isMicromobility && input.scooterOwnership === 'RENTAL' ? scooterRentalFeesMonthly : undefined,
    scooterDurationMins: isMicromobility ? scooterDurationMinsPerLeg : undefined,
    hopFareMonthly: isMicromobility ? hopFareMonthly : undefined,
  };

  // --- Financial Arbitrage Deltas ---
  const dailySavings = round2(dailyTotalDriving - dailyTransitFare);
  const weeklySavings = round2(weeklyTotalDriving - weeklyTransitTotal);
  const monthlySavings = round2(monthlyTotalDriving - monthlyTransitTotal);
  const annualSavings = round2(monthlySavings * 12);
  const co2SavedMonthlyKg = Math.max(0, round1(monthlyCo2KgDriving - monthlyCo2KgTransit));

  // Break-even days per week calculation
  let breakEvenDaysPerWeek = 1;
  for (let d = 1; d <= 7; d++) {
    const dDriveWeekly =
      (dailyFuelCost + dailyRucCost + dailyMaintenanceCost) * d +
      (effectiveParkingRate * Math.min(input.parkingDaysPerWeek, d)) / passengers;
    const dTransitWeekly = Math.min(dailyTransitFare * d, AT_HOP_7_DAY_CAP);
    if (dDriveWeekly > dTransitWeekly) {
      breakEvenDaysPerWeek = d;
      break;
    }
  }

  // Hours reclaimed on transit
  const totalCommuteDaysMonthly = input.daysPerWeek * WEEKS_PER_MONTH;
  const transitHoursMonthly = (adjustedTransitTimeMins * 2 * totalCommuteDaysMonthly) / 60;
  const hoursReclaimedMonthly = round1(transitHoursMonthly * 0.75);

  // US-11 & US-23: Payback Timeline calculation
  let paybackMonths: number | null = null;
  if (isEbike) {
    const upfront = typeof input.upfrontSetupCost === 'number' ? input.upfrontSetupCost : 2500;
    const monthlyCarSavings = monthlyTotalDriving - monthlyTransitTotal;
    if (upfront > 0 && monthlyCarSavings > 0) {
      paybackMonths = round1(upfront / monthlyCarSavings);
    } else if (upfront === 0) {
      paybackMonths = 0;
    }
  } else if (isMicromobility && input.scooterOwnership === 'OWNED') {
    const capitalCost = typeof input.scooterCapitalCost === 'number' ? input.scooterCapitalCost : 900;
    const monthlyCarSavings = monthlyTotalDriving - monthlyTransitTotal;
    if (capitalCost > 0 && monthlyCarSavings > 0) {
      paybackMonths = round1(capitalCost / monthlyCarSavings);
    } else if (capitalCost === 0) {
      paybackMonths = 0;
    }
  }

  let arbitrageVerdict: 'transit_wins' | 'driving_wins' | 'break_even' = 'break_even';
  let arbitrageTagline = 'Costs are virtually identical between driving and public transit.';

  if (isEbike && paybackMonths !== null && paybackMonths > 0) {
    arbitrageVerdict = 'transit_wins';
    arbitrageTagline = `E-Bike pays for itself in ${paybackMonths} months ($${monthlySavings.toFixed(0)}/mo savings vs car)!`;
  } else if (isMicromobility && input.scooterOwnership === 'OWNED' && paybackMonths !== null && paybackMonths > 0) {
    arbitrageVerdict = 'transit_wins';
    arbitrageTagline = `Owned Scooter pays for itself in ${paybackMonths} months ($${monthlySavings.toFixed(0)}/mo savings vs car)!`;
  } else if (monthlySavings > 25) {
    arbitrageVerdict = 'transit_wins';
    arbitrageTagline = `Public Transport saves you $${monthlySavings.toLocaleString('en-NZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}/month ($${annualSavings.toLocaleString('en-NZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}/yr)${isHopCapApplied ? ' with the AT $50 7-Day Cap!' : '!'}`;
  } else if (monthlySavings < -25) {
    arbitrageVerdict = 'driving_wins';
    arbitrageTagline = `Driving is currently $${Math.abs(monthlySavings).toLocaleString('en-NZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}/month cheaper than transit for your current setup.`;
  }

  // Time metrics and opportunity cost calculations (US-13)
  const oneWayDriveMinutes =
    typeof input.drivingTimeMins === 'number' ? input.drivingTimeMins : route.drivingTimePeakMins;
  const oneWayTransitMinutes =
    typeof input.transitTimeMins === 'number' ? input.transitTimeMins : adjustedTransitTimeMins;
  // ((transit - drive) * 2 * daysPerWeek * 4.33) / 60
  const monthlyTimeDeltaHours = round2(
    ((oneWayTransitMinutes - oneWayDriveMinutes) * 2 * input.daysPerWeek * 4.33) / 60
  );

  const hourlyTimeValue = input.hourlyTimeValue ?? 0;
  const monetizedMonthlyTimeCost = round2(monthlyTimeDeltaHours * hourlyTimeValue);
  const generalizedMonthlySavings = round2(monthlySavings - monetizedMonthlyTimeCost);

  const timeMetrics: TimeMetrics = {
    oneWayDriveMinutes,
    oneWayTransitMinutes,
    monthlyTimeDeltaHours,
    monetizedMonthlyTimeCost,
    generalizedMonthlySavings,
  };

  return {
    driving: drivingBreakdown,
    transit: transitBreakdown,
    dailySavings,
    weeklySavings,
    monthlySavings,
    annualSavings,
    breakEvenDaysPerWeek,
    co2SavedMonthlyKg,
    hoursReclaimedMonthly,
    arbitrageVerdict,
    arbitrageTagline,
    distanceKm: distanceOneWayKm,
    drivingTimeMins: oneWayDriveMinutes,
    transitTimeMins: oneWayTransitMinutes,
    timeMetrics,
    paybackMonths,
    scooterOwnership: input.scooterOwnership,
  };
}

// Backward compatible alias
export const calculateArbitrage = calculateCommuteArbitrage;

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function round1(num: number): number {
  return Math.round((num + Number.EPSILON) * 10) / 10;
}
