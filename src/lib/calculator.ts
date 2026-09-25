import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  CO2_FACTORS,
  CONCESSION_MULTIPLIERS,
  EV_CHARGING_PRESETS,
  NZ_AA_MAINTENANCE_PER_KM,
  NZTA_RUC_RATES,
  PARKING_TIER_RATES,
  STATUTORY_NZTA_RUC_RATES,
  VEHICLE_PRESETS,
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

  // Statutory RUC rate ($/km)
  const rucRate =
    input.powertrain && STATUTORY_NZTA_RUC_RATES[input.powertrain]
      ? STATUTORY_NZTA_RUC_RATES[input.powertrain].ratePerKm
      : NZTA_RUC_RATES[effectiveVehicleType]?.ratePerKm ?? 0;

  // Vehicle maintenance & wear ($/km)
  const maintenanceRate = input.includeMaintenanceWear
    ? (input.maintenanceCostPerKm ?? NZ_AA_MAINTENANCE_PER_KM)
    : 0;

  const passengers = Math.max(1, input.carpoolPassengers || 1);

  // Parking daily rate: support parkingTier preset or explicit parkingDailyRate
  let effectiveParkingRate = typeof input.parkingDailyRate === 'number' ? input.parkingDailyRate : 0;
  if (input.parkingTier && PARKING_TIER_RATES[input.parkingTier]) {
    if (typeof input.parkingDailyRate !== 'number' || input.parkingDailyRate === 0) {
      effectiveParkingRate = PARKING_TIER_RATES[input.parkingTier].rate;
    }
  }

  // Helper to resolve EV / PHEV electricity rate ($/kWh)
  const resolveEvKwhRate = (): number => {
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

  // --- Public Transport (AT HOP) Costs ---
  const zoneCount = route.zonesTraveled;
  const singleTripStandardFare = AT_HOP_ZONE_FARES[zoneCount] || 2.60;

  // Concession calculation
  let singleTripConcessionFare: number;
  if (input.fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession]) {
    singleTripConcessionFare = AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession][zoneCount];
  } else {
    const concessionInfo =
      CONCESSION_MULTIPLIERS[input.concession] || CONCESSION_MULTIPLIERS.adult;
    singleTripConcessionFare = round2(singleTripStandardFare * concessionInfo.multiplier);
  }

  const dailyTransitFare = round2(singleTripConcessionFare * 2);
  const uncappedWeeklyFare = round2(dailyTransitFare * input.daysPerWeek);

  // Apply AT HOP 7-Day $50 Cap
  const isHopCapApplied = uncappedWeeklyFare > AT_HOP_7_DAY_CAP;
  const hopCappedWeeklyFare = isHopCapApplied ? AT_HOP_7_DAY_CAP : uncappedWeeklyFare;

  const weeklyTransitTotal = round2(hopCappedWeeklyFare);
  const monthlyTransitTotal = round2(weeklyTransitTotal * WEEKS_PER_MONTH);
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
    primaryMode: origin.primaryTransitMode,
    estimatedTransitTimeMins: route.transitTimeMins,
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
  const transitHoursMonthly = (route.transitTimeMins * 2 * totalCommuteDaysMonthly) / 60;
  const hoursReclaimedMonthly = round1(transitHoursMonthly * 0.75);

  let arbitrageVerdict: 'transit_wins' | 'driving_wins' | 'break_even' = 'break_even';
  let arbitrageTagline = 'Costs are virtually identical between driving and public transit.';

  if (monthlySavings > 25) {
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

  // Time metrics and opportunity cost calculations
  const oneWayDriveMinutes = route.drivingTimePeakMins;
  const oneWayTransitMinutes = route.transitTimeMins;
  const drivingHoursMonthly = (oneWayDriveMinutes * 2 * totalCommuteDaysMonthly) / 60;
  // Positive = driving takes more hours/mo; Negative = transit takes more hours/mo
  const monthlyTimeDeltaHours = round1(drivingHoursMonthly - transitHoursMonthly);

  const hourlyTimeValue = input.hourlyTimeValue ?? 0;
  const monetizedMonthlyTimeCost = round2(monthlyTimeDeltaHours * hourlyTimeValue);
  const generalizedMonthlySavings = round2(monthlySavings + monetizedMonthlyTimeCost);

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
    drivingTimeMins: route.drivingTimePeakMins,
    transitTimeMins: route.transitTimeMins,
    timeMetrics,
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
