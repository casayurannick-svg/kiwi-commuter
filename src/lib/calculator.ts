import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  CO2_FACTORS,
  CONCESSION_MULTIPLIERS,
  DEFAULT_FUEL_RATE,
  DEFAULT_ANNUAL_WOF,
  DEFAULT_ANNUAL_REGO,
  DEFAULT_ANNUAL_INSURANCE,
  FIXED_COST_COMMUTE_APPORTIONMENT,
  EV_CHARGING_PRESETS,
  IRD_MILEAGE_RATE_PER_KM,
  NZ_AA_MAINTENANCE_PER_KM,
  NZ_EV_CHARGING_RATES,
  NZTA_RUC_RATES,
  PARKING_TIER_RATES,
  STATUTORY_NZTA_RUC_RATES,
  VEHICLE_PRESETS,
  WAIHEKE_FERRY_FARES,
} from '@/config/fares.config';
import { resolveFerryFareTier } from '@/constants/fares';
import { estimateRouteMetrics, getSuburbById } from '@/config/suburbs';
import {
  CalculationMode,
  CommuteComparisonResult,
  CommuteInput,
  DrivingCostBreakdown,
  JourneyLeg,
  TimeMetrics,
  TransitCostBreakdown,
  TransitStation,
  VehiclePowertrain,
  VehicleType,
} from '@/types';
import { findNearestTransitStation } from './stations';
import { haversineDistanceKm } from './routes';

export const WEEKS_PER_MONTH = 52 / 12; // 4.33333333
export { IRD_MILEAGE_RATE_PER_KM };

/**
 * FEAT-73 & FEAT-74: Statutory NZTA Road User Charges (RUC) Rates ($/km)
 * - Light EV (EV / BEV): $76.00 per 1,000 km ($0.076/km)
 * - Plug-in Hybrid (PHEV): $38.00 per 1,000 km ($0.038/km)
 * - Diesel Light Vehicle: $76.00 per 1,000 km ($0.076/km)
 * - Petrol (91/95) & Conventional Hybrid (HEV): Exempt ($0.00/km)
 */
export const NZ_RUC_LIGHT_EV_RATE_PER_KM = 0.076;
export const NZ_RUC_PHEV_RATE_PER_KM = 0.038;
export const NZ_RUC_DIESEL_RATE_PER_KM = 0.076;

export const NZ_RUC_RATES = {
  LIGHT_EV: NZ_RUC_LIGHT_EV_RATE_PER_KM,
  EV: NZ_RUC_LIGHT_EV_RATE_PER_KM,
  BEV: NZ_RUC_LIGHT_EV_RATE_PER_KM,
  PHEV: NZ_RUC_PHEV_RATE_PER_KM,
  DIESEL: NZ_RUC_DIESEL_RATE_PER_KM,
  HEV: 0.0,
  PETROL: 0.0,
  PETROL_91: 0.0,
  PETROL_95: 0.0,
} as const;

const POWERTRAIN_TO_VEHICLE_TYPE: Record<VehiclePowertrain, VehicleType> = {
  PETROL_91: 'petrol91',
  PETROL_95: 'petrol95',
  DIESEL: 'diesel',
  BEV: 'bev',
  PHEV: 'phev',
  HEV: 'hev',
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

  // Route distance and zones (US-35: support Google Routes API driving road distance)
  const route = estimateRouteMetrics(origin, destination);
  const distanceOneWayKm =
    typeof input.drivingDistanceKm === 'number' && input.drivingDistanceKm > 0
      ? input.drivingDistanceKm
      : typeof input.distanceKm === 'number' && input.distanceKm > 0
      ? input.distanceKm
      : route.distanceKm;
  const distanceRoundTripKm = Math.round(distanceOneWayKm * 2 * 10) / 10;

  // Resolve vehicle type and powertrain (FEAT-73 & FEAT-74: support EV, BEV, PHEV propulsion profiles)
  const rawPower = input.powertrain || input.power || input.propulsion;
  const rawPowerStr = typeof rawPower === 'string' ? rawPower.toUpperCase() : undefined;

  const rawVehicleType = input.vehicleType as string | undefined;
  const rawVehicleTypeStr = typeof rawVehicleType === 'string' ? rawVehicleType.toUpperCase() : undefined;

  const normalizedPower: VehiclePowertrain | undefined =
    rawPowerStr === 'PETROL'
      ? 'PETROL_91'
      : rawPowerStr === 'EV'
      ? 'BEV'
      : (rawPowerStr as VehiclePowertrain | undefined) ||
        (rawVehicleTypeStr === 'EV' || rawVehicleTypeStr === 'BEV'
          ? 'BEV'
          : rawVehicleTypeStr === 'PHEV'
          ? 'PHEV'
          : undefined);

  const effectiveVehicleType: VehicleType =
    normalizedPower && POWERTRAIN_TO_VEHICLE_TYPE[normalizedPower]
      ? POWERTRAIN_TO_VEHICLE_TYPE[normalizedPower]
      : rawVehicleTypeStr === 'DIESEL' || input.vehicleType === 'diesel' || normalizedPower === 'DIESEL'
      ? 'diesel'
      : rawVehicleTypeStr === 'EV' || rawVehicleTypeStr === 'BEV' || input.vehicleType === 'bev' || normalizedPower === 'BEV'
      ? 'bev'
      : rawVehicleTypeStr === 'PHEV' || input.vehicleType === 'phev' || normalizedPower === 'PHEV'
      ? 'phev'
      : rawVehicleTypeStr === 'HEV' || input.vehicleType === 'hev' || normalizedPower === 'HEV'
      ? 'hev'
      : rawVehicleTypeStr === 'PETROL95' || rawVehicleTypeStr === 'PETROL_95' || input.vehicleType === 'petrol95'
      ? 'petrol95'
      : (input.vehicleType as VehicleType) || 'petrol91';

  const effectivePowertrain: VehiclePowertrain =
    normalizedPower && STATUTORY_NZTA_RUC_RATES[normalizedPower]
      ? normalizedPower
      : effectiveVehicleType === 'diesel'
      ? 'DIESEL'
      : effectiveVehicleType === 'bev'
      ? 'BEV'
      : effectiveVehicleType === 'phev'
      ? 'PHEV'
      : effectiveVehicleType === 'hev'
      ? 'HEV'
      : effectiveVehicleType === 'petrol95'
      ? 'PETROL_95'
      : 'PETROL_91';

  const vehicle = VEHICLE_PRESETS[effectiveVehicleType] || VEHICLE_PRESETS.petrol91;
  const rawEfficiency =
    input.consumptionOverride ??
    input.fuelEconomy ??
    input.efficiency;
  const hasCustomConsumption =
    typeof rawEfficiency === 'number' &&
    !isNaN(rawEfficiency) &&
    rawEfficiency > 0;
  const consumption = hasCustomConsumption
    ? rawEfficiency!
    : vehicle.defaultConsumption;

  const isEbike = input.transitMode === 'EBIKE' || input.transitMode === 'E-Bike';
  const isHev = effectivePowertrain === 'HEV' || effectiveVehicleType === 'hev';
  const isDiesel = effectivePowertrain === 'DIESEL' || effectiveVehicleType === 'diesel';

  // Statutory RUC rate ($/km):
  // Light EV (EV / BEV): $0.076/km ($76.00 / 1,000 km)
  // Plug-in Hybrid (PHEV): $0.038/km ($38.00 / 1,000 km)
  // Diesel light vehicle: $0.076/km ($76.00 / 1,000 km)
  // Conventional hybrid (HEV) and Petrol (91/95): Exempt ($0.00/km)
  let rucRate = 0;
  if (!isHev) {
    if (effectivePowertrain === 'BEV' || effectiveVehicleType === 'bev') {
      rucRate = NZ_RUC_LIGHT_EV_RATE_PER_KM; // 0.076
    } else if (effectivePowertrain === 'PHEV' || effectiveVehicleType === 'phev') {
      rucRate = NZ_RUC_PHEV_RATE_PER_KM; // 0.038
    } else if (isDiesel) {
      rucRate = NZ_RUC_DIESEL_RATE_PER_KM; // 0.076
    } else if (STATUTORY_NZTA_RUC_RATES[effectivePowertrain]) {
      rucRate = STATUTORY_NZTA_RUC_RATES[effectivePowertrain].ratePerKm;
    } else if (NZTA_RUC_RATES[effectiveVehicleType]) {
      rucRate = NZTA_RUC_RATES[effectiveVehicleType].ratePerKm;
    }
  }

  // Vehicle maintenance & wear ($/km)
  const maintenanceRate = input.includeMaintenanceWear
    ? (input.maintenanceCostPerKm ?? NZ_AA_MAINTENANCE_PER_KM)
    : 0;

  const passengers = Math.max(
    1,
    typeof input.carpoolPassengers === 'number' && !isNaN(input.carpoolPassengers)
      ? input.carpoolPassengers
      : typeof input.passengerCount === 'number' && !isNaN(input.passengerCount)
      ? input.passengerCount
      : 1
  );

  // BUG-43 & BUG-44: Micromobility (E-Bike, E-Scooter) are inherently single-rider vehicles.
  // The carpool passenger multiplier must NOT be applied to their energy costs or breakeven math.
  // transitPassengers is locked to 1 for these modes; it equals passengers for all other modes.
  const isMicromobilityMode =
    input.transitMode === 'EBIKE' ||
    input.transitMode === 'E-Bike' ||
    input.transitMode === 'ESCOOTER' ||
    input.transitMode === 'MICROMOBILITY_TRANSIT' ||
    input.transitMode === 'Scooter & Ride' ||
    input.transitMode === 'Scooter & Transit';
  const transitPassengers = isMicromobilityMode ? 1 : passengers;

  // Parking daily rate: support parkingTier preset or explicit parkingDailyRate
  // BUG-44: Retain private vehicle parking costs regardless of the compared alternative mode.
  let effectiveParkingRate =
    typeof input.parkingDailyRate === 'number'
      ? input.parkingDailyRate
      : 0;
  if (input.parkingTier && input.parkingTier !== 'CUSTOM' && PARKING_TIER_RATES[input.parkingTier]) {
    if (typeof input.parkingDailyRate !== 'number' || input.parkingDailyRate === 0) {
      effectiveParkingRate = PARKING_TIER_RATES[input.parkingTier].rate;
    }
  }

  // Helper to resolve EV / PHEV electricity rate ($/kWh)
  const resolveEvKwhRate = (): number => {
    if (typeof input.kwhRate === 'number' && !isNaN(input.kwhRate) && input.kwhRate > 0) {
      return input.kwhRate;
    }
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
    const phevEvEfficiency = typeof input.efficiency === 'number' && input.efficiency > 0 ? input.efficiency : 16.5; // kWh/100km
    // US-26: Prioritize custom L/100km override if provided, falling back to 6.0 L/100km baseline average
    const phevPetrolEfficiency = hasCustomConsumption
      ? input.consumptionOverride!
      : 6.0; // L/100km
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
    const rawPrice = input.customFuelPricePerL ?? input.fuelPriceOverride;
    const fuelPrice =
      typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0
        ? rawPrice
        : vehicle.defaultFuelPrice || DEFAULT_FUEL_RATE;
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

  // US-38: Fixed Vehicle Ownership Costs (WOF, Rego, Insurance)
  const annualWof =
    typeof input.annualWof === 'number' && !isNaN(input.annualWof)
      ? input.annualWof
      : DEFAULT_ANNUAL_WOF;
  const annualRego =
    typeof input.annualRego === 'number' && !isNaN(input.annualRego)
      ? input.annualRego
      : DEFAULT_ANNUAL_REGO;
  const isInsuranceActive = input.insuranceEnabled !== false;

  // Mutual exclusivity for insurance: if a user inputs a custom value in the text box, it must completely override the default $1,311 value
  let activeInsurance = 0;
  if (isInsuranceActive) {
    if (
      typeof input.customInsurance === 'number' &&
      !isNaN(input.customInsurance) &&
      input.customInsurance >= 0
    ) {
      activeInsurance = input.customInsurance;
    } else {
      activeInsurance =
        typeof input.defaultInsurance === 'number' && !isNaN(input.defaultInsurance)
          ? input.defaultInsurance
          : DEFAULT_ANNUAL_INSURANCE;
    }
  }

  const totalAnnualFixedCosts = annualWof + annualRego + activeInsurance;
  const annualCommuteFixedCosts = totalAnnualFixedCosts * FIXED_COST_COMMUTE_APPORTIONMENT;
  const monthlyFixedApportioned = annualCommuteFixedCosts / 12;

  // Divide monthly commute apportioned sum by average commute days to establish daily fixed baseline
  const averageCommuteDaysPerMonth = input.daysPerWeek > 0 ? input.daysPerWeek * WEEKS_PER_MONTH : 1;
  const dailyFixedBaseline = input.daysPerWeek > 0 ? monthlyFixedApportioned / averageCommuteDaysPerMonth : 0;

  const dailyFixedCost = round2(dailyFixedBaseline / passengers);
  const weeklyFixedCost = round2(dailyFixedCost * input.daysPerWeek);
  const monthlyFixedCost = round2(weeklyFixedCost * WEEKS_PER_MONTH);
  const annualFixedCost = round2(monthlyFixedCost * 12);

  const dailyTotalDriving = round2(
    dailyFuelCost + dailyRucCost + dailyParkingCost + dailyMaintenanceCost + dailyFixedCost
  );

  const weeklyFuelCost = round2(dailyFuelCost * input.daysPerWeek);
  const weeklyRucCost = round2(dailyRucCost * input.daysPerWeek);
  const weeklyMaintenanceCost = round2(dailyMaintenanceCost * input.daysPerWeek);
  const weeklyTotalDriving = round2(
    weeklyFuelCost + weeklyRucCost + weeklyParkingCost + weeklyMaintenanceCost + weeklyFixedCost
  );

  const monthlyFuelCost = round2(weeklyFuelCost * WEEKS_PER_MONTH);
  const monthlyRucCost = round2(weeklyRucCost * WEEKS_PER_MONTH);
  const monthlyParkingCost = round2(weeklyParkingCost * WEEKS_PER_MONTH);
  const monthlyMaintenanceCost = round2(weeklyMaintenanceCost * WEEKS_PER_MONTH);
  const monthlyTotalDriving = round2(weeklyTotalDriving * WEEKS_PER_MONTH);

  // FEAT-60: IRD True Cost Mileage Mode
  // If 'IRD_TRUE_COST' is active, calculate distance_in_km * IRD_MILEAGE_RATE_PER_KM.
  // IRD mileage rate comprehensively covers fuel, depreciation, WOF, Rego, maintenance, and insurance.
  const calculationMode: CalculationMode = input.calculationMode || input.calcMode || 'FUEL';
  const isIrdMode = calculationMode === 'IRD_TRUE_COST';

  const dailyIrdCost = round2((distanceRoundTripKm * IRD_MILEAGE_RATE_PER_KM) / passengers);
  const weeklyIrdCost = round2(dailyIrdCost * input.daysPerWeek);
  const monthlyIrdCost = round2(weeklyIrdCost * WEEKS_PER_MONTH);

  const effectiveDailyFuelCost = isIrdMode ? 0 : dailyFuelCost;
  const effectiveDailyRucCost = isIrdMode ? 0 : dailyRucCost;
  const effectiveDailyMaintenanceCost = isIrdMode ? 0 : dailyMaintenanceCost;
  const effectiveDailyFixedCost = isIrdMode ? 0 : dailyFixedCost;

  const effectiveWeeklyFuelCost = isIrdMode ? 0 : weeklyFuelCost;
  const effectiveWeeklyRucCost = isIrdMode ? 0 : weeklyRucCost;
  const effectiveWeeklyMaintenanceCost = isIrdMode ? 0 : weeklyMaintenanceCost;
  const effectiveWeeklyFixedCost = isIrdMode ? 0 : weeklyFixedCost;

  const effectiveMonthlyFuelCost = isIrdMode ? 0 : monthlyFuelCost;
  const effectiveMonthlyRucCost = isIrdMode ? 0 : monthlyRucCost;
  const effectiveMonthlyMaintenanceCost = isIrdMode ? 0 : monthlyMaintenanceCost;
  const effectiveMonthlyFixedCost = isIrdMode ? 0 : monthlyFixedCost;
  const effectiveAnnualFixedCost = isIrdMode ? 0 : annualFixedCost;

  const effectiveDailyTotalDriving = isIrdMode
    ? round2(dailyIrdCost + dailyParkingCost)
    : dailyTotalDriving;
  const effectiveWeeklyTotalDriving = isIrdMode
    ? round2(weeklyIrdCost + weeklyParkingCost)
    : weeklyTotalDriving;
  const effectiveMonthlyTotalDriving = isIrdMode
    ? round2(monthlyIrdCost + monthlyParkingCost)
    : monthlyTotalDriving;
  const effectiveAnnualTotalDriving = round2(effectiveMonthlyTotalDriving * 12);

  const drivingBreakdown: DrivingCostBreakdown = {
    distanceOneWayKm: round1(distanceOneWayKm),
    distanceRoundTripKm: round1(distanceRoundTripKm),
    dailyFuelCost: effectiveDailyFuelCost,
    dailyRucCost: effectiveDailyRucCost,
    dailyParkingCost,
    dailyMaintenanceCost: effectiveDailyMaintenanceCost,
    dailyFixedCost: effectiveDailyFixedCost,
    dailyFixedCosts: effectiveDailyFixedCost,
    dailyIrdCost: isIrdMode ? dailyIrdCost : undefined,
    dailyTotal: effectiveDailyTotalDriving,

    weeklyFuelCost: effectiveWeeklyFuelCost,
    weeklyRucCost: effectiveWeeklyRucCost,
    weeklyParkingCost,
    weeklyMaintenanceCost: effectiveWeeklyMaintenanceCost,
    weeklyFixedCost: effectiveWeeklyFixedCost,
    weeklyFixedCosts: effectiveWeeklyFixedCost,
    weeklyIrdCost: isIrdMode ? weeklyIrdCost : undefined,
    weeklyTotal: effectiveWeeklyTotalDriving,

    monthlyFuelCost: effectiveMonthlyFuelCost,
    monthlyRucCost: effectiveMonthlyRucCost,
    monthlyParkingCost,
    monthlyMaintenanceCost: effectiveMonthlyMaintenanceCost,
    monthlyFixedCost: effectiveMonthlyFixedCost,
    monthlyFixedCosts: effectiveMonthlyFixedCost,
    monthlyIrdCost: isIrdMode ? monthlyIrdCost : undefined,
    monthlyTotal: effectiveMonthlyTotalDriving,

    annualFixedCost: effectiveAnnualFixedCost,
    annualFixedCosts: effectiveAnnualFixedCost,
    annualTotal: effectiveAnnualTotalDriving,
    monthlyCo2Kg: round1(monthlyCo2KgDriving),
    calculationMode,
  };

  // --- Public Transport (AT HOP / Ferry / E-Bike) Costs ---
  const isMicromobility =
    !isEbike &&
    (input.transitMode === 'MICROMOBILITY_TRANSIT' ||
      input.transitMode === 'Scooter & Ride' ||
      input.transitMode === 'Scooter & Transit');

  // US-10: Ferry Classification & Pricing Fix
  const hasFerryStep = Boolean(
    input.transitSteps?.some(
      (s) =>
        s.travelMode === 'FERRY' ||
        s.vehicleType === 'FERRY' ||
        s.line?.toLowerCase().includes('ferry') ||
        s.line?.toUpperCase() === 'DEV' ||
        s.departureStop?.toLowerCase().includes('ferry') ||
        s.arrivalStop?.toLowerCase().includes('ferry') ||
        s.departureStop?.toLowerCase().includes('wharf') ||
        s.arrivalStop?.toLowerCase().includes('wharf')
    )
  );

  const hasFerryLine = Boolean(
    input.transitLines?.some(
      (l) => l.toLowerCase().includes('ferry') || l.toUpperCase() === 'DEV'
    )
  );

  const hasReturnedSteps = Boolean(
    (input.transitSteps && input.transitSteps.length > 0) ||
    (input.transitLines && input.transitLines.length > 0)
  );

  const hasTrainStep = Boolean(
    input.transitSteps?.some((s) => s.travelMode === 'TRAIN' || s.vehicleType === 'TRAIN') ||
    input.transitLines?.some((l) => l.toLowerCase().includes('train'))
  );

  // BUG-54 & BUG-70: If actual transit steps/legs were returned in route array, check if any ferry leg exists.
  // For transitMode=FERRY with firstMileMode (WALK/CYCLE/SCOOTER/DRIVE), ferry waypoint injection strictly applies.
  const isFerry =
    !isEbike &&
    !isMicromobility &&
    (hasReturnedSteps
      ? (hasFerryStep || hasFerryLine || (Boolean(input.firstMileMode) && (input.transitMode === 'FERRY' || input.transitMode === 'Ferry')))
      : (hasFerryStep ||
          hasFerryLine ||
          input.transitMode === 'FERRY' ||
          input.transitMode === 'Ferry' ||
          (!input.transitMode &&
            (origin.primaryTransitMode === 'Ferry' ||
              destination.primaryTransitMode === 'Ferry' ||
              input.originSuburbId === 'devonport' ||
              input.destinationSuburbId === 'devonport' ||
              input.originSuburbId === 'bayswater' ||
              input.destinationSuburbId === 'bayswater' ||
              input.originSuburbId === 'birkenhead' ||
              input.destinationSuburbId === 'birkenhead' ||
              input.originSuburbId === 'half-moon-bay' ||
              input.destinationSuburbId === 'half-moon-bay' ||
              input.originSuburbId === 'hobsonville' ||
              input.destinationSuburbId === 'hobsonville' ||
              input.originSuburbId === 'beach-haven' ||
              input.destinationSuburbId === 'beach-haven' ||
              input.originSuburbId === 'gulf-harbour' ||
              input.destinationSuburbId === 'gulf-harbour' ||
              input.originSuburbId === 'pine-harbour' ||
              input.destinationSuburbId === 'pine-harbour' ||
              input.originSuburbId === 'west-harbour' ||
              input.destinationSuburbId === 'west-harbour'))));

  const isWaiheke = Boolean(
    input.isWaihekeRoute ||
    (isFerry && (input.originSuburbId === 'waiheke' || input.destinationSuburbId === 'waiheke'))
  );

  const isInnerHarbourFerry = isFerry && !isWaiheke;

  const ferryTier = isInnerHarbourFerry
    ? resolveFerryFareTier({
        originSuburbId: input.originSuburbId,
        destinationSuburbId: input.destinationSuburbId,
        originCoordinates: input.originCoordinates || origin.coordinates,
        destinationCoordinates: input.destinationCoordinates || destination.coordinates,
        transitSteps: input.transitSteps,
        transitLines: input.transitLines,
      })
    : null;

  // BUG-47: Ensure zoneCount is at least 1
  const zoneCount = Math.max(1, route.zonesTraveled);

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
    // BUG-43: E-Bike is a single-rider vehicle — use transitPassengers (always 1) not passengers.
    const ebikeCostPerKm = typeof input.ebikeCostPerKm === 'number' ? input.ebikeCostPerKm : 0.0027;
    const perPersonDailyEbikeCost = round2(distanceRoundTripKm * ebikeCostPerKm);
    const perPersonSingleTrip = round2(perPersonDailyEbikeCost / 2);

    singleTripStandardFare = round2(perPersonSingleTrip * transitPassengers);
    singleTripConcessionFare = singleTripStandardFare;

    dailyTransitFare = round2(perPersonDailyEbikeCost * transitPassengers);
    uncappedWeeklyFare = round2(dailyTransitFare * input.daysPerWeek);

    isHopCapApplied = false;
    hopCappedWeeklyFare = uncappedWeeklyFare;
    weeklyTransitTotal = uncappedWeeklyFare;
    monthlyTransitTotal = round2(weeklyTransitTotal * WEEKS_PER_MONTH);
    hopFareMonthly = 0;
  } else if (isFerry && isWaiheke) {
    // US-20: Waiheke Ferry (Fullers360) bypasses the AT $50 weekly cap and applies Fullers commercial rates
    const perPersonStandard = WAIHEKE_FERRY_FARES.singleTripStandard;
    const concessionRate = WAIHEKE_FERRY_FARES.concessionFares[input.concession] ?? perPersonStandard;
    const perPersonConcession = round2(concessionRate);

    singleTripStandardFare = round2(perPersonStandard * passengers);
    singleTripConcessionFare = round2(perPersonConcession * passengers);

    const perPersonDaily = round2(perPersonConcession * 2);
    dailyTransitFare = round2(perPersonDaily * passengers);
    const perPersonUncappedWeekly = round2(perPersonDaily * input.daysPerWeek);
    uncappedWeeklyFare = round2(perPersonUncappedWeekly * passengers);

    // Fullers Waiheke Ferry is exempt from AT $50 7-day cap
    isHopCapApplied = false;
    hopCappedWeeklyFare = uncappedWeeklyFare;
    weeklyTransitTotal = hopCappedWeeklyFare;

    // Use monthly pass rate if adult 5-day commute weekly total exceeds monthly pass breakdown
    const perPersonRawMonthly = round2(perPersonUncappedWeekly * WEEKS_PER_MONTH);
    const perPersonMonthly =
      input.concession === 'adult' && perPersonRawMonthly > WAIHEKE_FERRY_FARES.monthlyPass
        ? WAIHEKE_FERRY_FARES.monthlyPass
        : perPersonRawMonthly;
    monthlyTransitTotal = round2(perPersonMonthly * passengers);
    hopFareMonthly = monthlyTransitTotal;
  } else if (isInnerHarbourFerry) {
    // Auckland Transport Ferry Fare Calibration (Inner Harbor $7.80, Mid Harbor $10.40, Outer Harbor $13.80)
    const effectiveFerryTier =
      ferryTier ||
      resolveFerryFareTier({
        originSuburbId: input.originSuburbId,
        destinationSuburbId: input.destinationSuburbId,
        originCoordinates: input.originCoordinates || origin.coordinates,
        destinationCoordinates: input.destinationCoordinates || destination.coordinates,
        transitSteps: input.transitSteps,
        transitLines: input.transitLines,
      });
    const perPersonStandard = effectiveFerryTier.rate;
    let perPersonConcession: number;

    if (input.fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession]) {
      if (input.fareConcession === 'TERTIARY') {
        perPersonConcession = round2(perPersonStandard * 0.8);
      } else if (input.fareConcession === 'CHILD') {
        perPersonConcession = round2(perPersonStandard * 0.5);
      } else {
        perPersonConcession = perPersonStandard;
      }
    } else {
      const concessionInfo =
        CONCESSION_MULTIPLIERS[input.concession] || CONCESSION_MULTIPLIERS.adult;
      perPersonConcession = round2(perPersonStandard * concessionInfo.multiplier);
    }

    const baseDailyHopFarePerPerson = round2(perPersonConcession * 2);
    const baseUncappedWeeklyFarePerPerson = round2(baseDailyHopFarePerPerson * input.daysPerWeek);

    // Inner & Mid Harbour Ferries ARE eligible for the AT HOP 7-day $50 cap (BUG-37; Outer Harbor is exempt)
    isHopCapApplied = effectiveFerryTier.capEligible && baseUncappedWeeklyFarePerPerson > AT_HOP_7_DAY_CAP;
    const cappedWeeklyPerPerson = isHopCapApplied ? AT_HOP_7_DAY_CAP : baseUncappedWeeklyFarePerPerson;

    singleTripStandardFare = round2(perPersonStandard * transitPassengers);
    singleTripConcessionFare = round2(perPersonConcession * transitPassengers);
    dailyTransitFare = round2(baseDailyHopFarePerPerson * transitPassengers);
    uncappedWeeklyFare = round2(baseUncappedWeeklyFarePerPerson * transitPassengers);
    hopCappedWeeklyFare = round2(cappedWeeklyPerPerson * transitPassengers);
    const baseWeeklyHopFare = hopCappedWeeklyFare;
    const baseMonthlyHopFare = round2(baseWeeklyHopFare * WEEKS_PER_MONTH);
    hopFareMonthly = baseMonthlyHopFare;

    weeklyTransitTotal = baseWeeklyHopFare;
    monthlyTransitTotal = baseMonthlyHopFare;
  } else {
    // Standard AT HOP Zonal Fares (bus and train)
    // BUG-47: Clamp zone tier lookups to avoid fare leaks or undefined 3.00 fallbacks on multi-zone journeys
    const maxZoneTier = Math.max(...Object.keys(AT_HOP_ZONE_FARES).map(Number));
    const effectiveZoneCount = Math.min(zoneCount, maxZoneTier);
    let perPersonStandard = AT_HOP_ZONE_FARES[effectiveZoneCount] ?? AT_HOP_ZONE_FARES[maxZoneTier] ?? 7.90;
    if (zoneCount >= 5) {
      // BUG-47: Auckland Transport fare zones cap out at the maximum standard tier (Zone 4+ is $7.90)
      perPersonStandard = 7.90;
    }
    let perPersonConcession: number;

    // Concession calculation
    if (input.fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession]) {
      const concessionTable = AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession];
      const maxConcessionZone = Math.max(...Object.keys(concessionTable).map(Number));
      const clampedConcessionZone = Math.min(zoneCount, maxConcessionZone);
      perPersonConcession =
        zoneCount >= 5 && input.fareConcession === 'ADULT'
          ? 7.90
          : (concessionTable[clampedConcessionZone] ?? concessionTable[maxConcessionZone]);
    } else {
      const concessionInfo =
        CONCESSION_MULTIPLIERS[input.concession] || CONCESSION_MULTIPLIERS.adult;
      perPersonConcession = round2(perPersonStandard * concessionInfo.multiplier);
    }

    const baseDailyHopFarePerPerson = round2(perPersonConcession * 2);
    const baseUncappedWeeklyFarePerPerson = round2(baseDailyHopFarePerPerson * input.daysPerWeek);

    // Apply AT HOP 7-Day $50 Cap per commuter, then scale by passenger count (BUG-37)
    isHopCapApplied = baseUncappedWeeklyFarePerPerson > AT_HOP_7_DAY_CAP;
    const cappedWeeklyPerPerson = isHopCapApplied ? AT_HOP_7_DAY_CAP : baseUncappedWeeklyFarePerPerson;

    singleTripStandardFare = round2(perPersonStandard * transitPassengers);
    singleTripConcessionFare = round2(perPersonConcession * transitPassengers);
    dailyTransitFare = round2(baseDailyHopFarePerPerson * transitPassengers);
    uncappedWeeklyFare = round2(baseUncappedWeeklyFarePerPerson * transitPassengers);
    hopCappedWeeklyFare = round2(cappedWeeklyPerPerson * transitPassengers);
    const baseWeeklyHopFare = hopCappedWeeklyFare;
    const baseMonthlyHopFare = round2(baseWeeklyHopFare * WEEKS_PER_MONTH);
    hopFareMonthly = baseMonthlyHopFare;

    if (isMicromobility && input.scooterOwnership === 'RENTAL') {
      // US-23: Rental Scooter: $1 unlock + $0.45/min per leg per person
      // BUG-43: Scooters are single-rider — use transitPassengers (always 1) not passengers.
      const costPerLeg = (1.00 + (scooterDurationMinsPerLeg * 0.45)) * transitPassengers;
      scooterRentalFeesDaily = round2(costPerLeg * 2);
      const weeklyRentalFees = round2(scooterRentalFeesDaily * input.daysPerWeek);
      scooterRentalFeesMonthly = round2(weeklyRentalFees * WEEKS_PER_MONTH);

      dailyTransitFare = round2(dailyTransitFare + scooterRentalFeesDaily);
      uncappedWeeklyFare = round2(uncappedWeeklyFare + weeklyRentalFees);
      weeklyTransitTotal = round2(baseWeeklyHopFare + weeklyRentalFees);
      monthlyTransitTotal = round2(baseMonthlyHopFare + scooterRentalFeesMonthly);
    } else {
      weeklyTransitTotal = baseWeeklyHopFare;
      monthlyTransitTotal = baseMonthlyHopFare;
    }
  }

  // --- US-28 & BUG-63: First-Mile Running Cost & Spatial Nearest Station Search ---
  const HOBSONVILLE_FERRY_COORDS: [number, number] = [174.6680, -36.7980];
  const originCoords: [number, number] | undefined = input.originCoordinates;

  const isFerryModeActive =
    input.transitMode === 'FERRY' ||
    input.transitMode === 'Ferry' ||
    input.originSuburbId === 'hobsonville';

  const distToHobsonvilleTerminal = originCoords
    ? haversineDistanceKm(originCoords, HOBSONVILLE_FERRY_COORDS)
    : input.originSuburbId === 'hobsonville'
    ? 1.2
    : undefined;
  const isOriginFerryTerminal =
    typeof distToHobsonvilleTerminal === 'number' && distToHobsonvilleTerminal < 0.15;

  const isAllBusRoute = hasReturnedSteps && !hasFerryStep && !hasFerryLine;

  const hasExplicitOrigin = Boolean(
    input.originAddress ||
    input.originCoordinates ||
    input.firstMileMode ||
    (typeof input.firstMileDistanceKm === 'number' && input.firstMileDistanceKm > 0)
  );

  // BUG-63, BUG-69 & BUG-70: Unconditionally enforce ferry waypoints regardless of firstMileMode (WALK, CYCLE, SCOOTER, DRIVE) or distance
  const isFerryWaypointInjection =
    Boolean(isFerryModeActive) &&
    hasExplicitOrigin &&
    !isOriginFerryTerminal &&
    (input.originSuburbId === 'hobsonville' || typeof distToHobsonvilleTerminal === 'number' || Boolean(input.firstMileMode)) &&
    (!isAllBusRoute || Boolean(input.firstMileMode));

  const hobsonvilleTerminalStation: TransitStation | undefined = isFerryWaypointInjection
    ? {
        id: 'hobsonville-point-ferry',
        name: 'Hobsonville Point Ferry Terminal',
        mode: 'Ferry',
        zone: 3,
        region: 'West Auckland',
        hasParkAndRide: true,
        coordinates: HOBSONVILLE_FERRY_COORDS,
        distanceKm:
          typeof input.firstMileDistanceKm === 'number' && input.firstMileDistanceKm > 0
            ? input.firstMileDistanceKm
            : round1(typeof distToHobsonvilleTerminal === 'number' ? distToHobsonvilleTerminal : 1.2),
      }
    : undefined;

  const nearestStation =
    hobsonvilleTerminalStation || (originCoords ? findNearestTransitStation(originCoords) : undefined);
  const firstMileMode =
    input.firstMileMode ?? (isFerryWaypointInjection ? 'DRIVE' : input.originCoordinates ? 'DRIVE' : undefined);
  const firstMileDistanceKm =
    isOriginFerryTerminal
      ? 0
      : typeof input.firstMileDistanceKm === 'number' && input.firstMileDistanceKm > 0
      ? input.firstMileDistanceKm
      : nearestStation
      ? nearestStation.distanceKm
      : 0;

  let firstMileDailyCost = 0;
  let firstMileWeeklyCost = 0;
  let firstMileMonthlyCost = 0;
  let firstMileDurationMins = 0;

  if (!isEbike && firstMileDistanceKm > 0 && firstMileMode) {
    if (firstMileMode === 'DRIVE') {
      const firstMileRoundTripKm = firstMileDistanceKm * 2;
      let firstMileFuelCost = 0;
      if (effectiveVehicleType === 'bev') {
        const evRate = resolveEvKwhRate();
        const consumptionRoundTrip = (consumption / 100) * firstMileRoundTripKm;
        firstMileFuelCost = round2((consumptionRoundTrip * evRate) / passengers);
      } else if (effectiveVehicleType === 'phev') {
        const evRate = resolveEvKwhRate();
        const phevEvEfficiency = typeof input.efficiency === 'number' && input.efficiency > 0 ? input.efficiency : 16.5;
        const consumptionRoundTrip = (phevEvEfficiency / 100) * firstMileRoundTripKm;
        firstMileFuelCost = round2((consumptionRoundTrip * evRate) / passengers);
      } else {
        const rawPrice = input.customFuelPricePerL ?? input.fuelPriceOverride;
        const fuelPrice =
          typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0
            ? rawPrice
            : vehicle.defaultFuelPrice || DEFAULT_FUEL_RATE;
        const consumptionRoundTrip = (consumption / 100) * firstMileRoundTripKm;
        firstMileFuelCost = round2((consumptionRoundTrip * fuelPrice) / passengers);
      }
      const firstMileRucCost = round2((firstMileRoundTripKm * rucRate) / passengers);
      const firstMileMaintenanceCost = round2((firstMileRoundTripKm * maintenanceRate) / passengers);
      firstMileDailyCost = round2(firstMileFuelCost + firstMileRucCost + firstMileMaintenanceCost);
      firstMileWeeklyCost = round2(firstMileDailyCost * input.daysPerWeek);
      firstMileMonthlyCost = round2(firstMileWeeklyCost * WEEKS_PER_MONTH);
      firstMileDurationMins =
        typeof input.firstMileDurationMins === 'number' && input.firstMileDurationMins > 0
          ? input.firstMileDurationMins
          : Math.max(3, Math.round(firstMileDistanceKm * 2.5));
    } else if (firstMileMode === 'SCOOTER') {
      firstMileDurationMins =
        typeof input.firstMileDurationMins === 'number' && input.firstMileDurationMins > 0
          ? input.firstMileDurationMins
          : round1((firstMileDistanceKm / 15) * 60);
      if (input.scooterOwnership === 'RENTAL') {
        const costPerLeg = 1.00 + (firstMileDurationMins * 0.45);
        firstMileDailyCost = round2(costPerLeg * 2);
        firstMileWeeklyCost = round2(firstMileDailyCost * input.daysPerWeek);
        firstMileMonthlyCost = round2(firstMileWeeklyCost * WEEKS_PER_MONTH);
      }
    } else if (firstMileMode === 'CYCLE') {
      // BUG-63: Cycling first-mile to station/terminal (free, ~15 km/h)
      firstMileDurationMins =
        typeof input.firstMileDurationMins === 'number' && input.firstMileDurationMins > 0
          ? input.firstMileDurationMins
          : Math.max(3, Math.round((firstMileDistanceKm / 15) * 60));
      firstMileDailyCost = 0;
      firstMileWeeklyCost = 0;
      firstMileMonthlyCost = 0;
    } else {
      // WALK
      firstMileDurationMins =
        typeof input.firstMileDurationMins === 'number' && input.firstMileDurationMins > 0
          ? input.firstMileDurationMins
          : Math.round((firstMileDistanceKm / 5) * 60);
      firstMileDailyCost = 0;
      firstMileWeeklyCost = 0;
      firstMileMonthlyCost = 0;
    }
  }

  // Aggregate first-mile running costs with transit totals
  dailyTransitFare = round2(dailyTransitFare + firstMileDailyCost);
  uncappedWeeklyFare = round2(uncappedWeeklyFare + firstMileWeeklyCost);
  weeklyTransitTotal = round2(weeklyTransitTotal + firstMileWeeklyCost);
  monthlyTransitTotal = round2(monthlyTransitTotal + firstMileMonthlyCost);

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
      : (hasReturnedSteps && hasTrainStep) || (!hasReturnedSteps && origin.primaryTransitMode === 'Train')
      ? 'Train'
      : 'Bus',
    estimatedTransitTimeMins:
      typeof input.transitTimeMins === 'number' && input.transitTimeMins > 0
        ? input.transitTimeMins
        : adjustedTransitTimeMins,
    scooterRentalFeesDaily: isMicromobility && input.scooterOwnership === 'RENTAL' ? scooterRentalFeesDaily : undefined,
    scooterRentalFeesMonthly: isMicromobility && input.scooterOwnership === 'RENTAL' ? scooterRentalFeesMonthly : undefined,
    scooterDurationMins: isMicromobility ? scooterDurationMinsPerLeg : undefined,
    hopFareMonthly: hopFareMonthly,
    firstMileDailyCost: firstMileDailyCost > 0 ? firstMileDailyCost : undefined,
    firstMileMonthlyCost: firstMileMonthlyCost > 0 ? firstMileMonthlyCost : undefined,
    firstMileDistanceKm: firstMileDistanceKm > 0 ? round1(firstMileDistanceKm) : undefined,
    firstMileDurationMins: firstMileDurationMins > 0 ? firstMileDurationMins : undefined,
    firstMileMode: isEbike ? undefined : firstMileMode,
    nearestStationName: nearestStation?.name,
    passengers,
    perPersonSingleFare: round2(singleTripConcessionFare / transitPassengers),
    perPersonDailyFare: round2((dailyTransitFare - firstMileDailyCost) / transitPassengers),
  };

  // --- Financial Arbitrage Deltas ---
  const dailySavings = round2(effectiveDailyTotalDriving - dailyTransitFare);
  const weeklySavings = round2(effectiveWeeklyTotalDriving - weeklyTransitTotal);
  const monthlySavings = round2(effectiveMonthlyTotalDriving - monthlyTransitTotal);
  const annualSavings = round2(monthlySavings * 12);
  const co2SavedMonthlyKg = Math.max(0, round1(monthlyCo2KgDriving - monthlyCo2KgTransit));

  // Break-even days per week calculation
  let breakEvenDaysPerWeek = 1;
  for (let d = 1; d <= 7; d++) {
    const dDriveBase = isIrdMode
      ? dailyIrdCost
      : (dailyFuelCost + dailyRucCost + dailyMaintenanceCost + dailyFixedCost);
    const dDriveWeekly =
      dDriveBase * d +
      (effectiveParkingRate * Math.min(input.parkingDaysPerWeek, d)) / passengers;
    // BUG-43: Use transitPassengers for transit breakeven — ebike is always 1 rider.
    const perCommuterTransitDaily = (dailyTransitFare - firstMileDailyCost) / transitPassengers;
    const perCommuterFirstMileDaily = firstMileDailyCost / transitPassengers;
    const dTransitWeekly =
      (Math.min(perCommuterTransitDaily * d, AT_HOP_7_DAY_CAP) + perCommuterFirstMileDaily * d) * transitPassengers;
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
    const monthlyCarSavings = effectiveMonthlyTotalDriving - monthlyTransitTotal;
    if (upfront > 0 && monthlyCarSavings > 0) {
      paybackMonths = round1(upfront / monthlyCarSavings);
    } else if (upfront === 0) {
      paybackMonths = 0;
    }
  } else if (isMicromobility && input.scooterOwnership === 'OWNED') {
    const capitalCost = typeof input.scooterCapitalCost === 'number' ? input.scooterCapitalCost : 900;
    const monthlyCarSavings = effectiveMonthlyTotalDriving - monthlyTransitTotal;
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
  const effectiveTransitMins =
    typeof input.transitRideDurationMins === 'number' && input.transitRideDurationMins > 0
      ? input.transitRideDurationMins
      : isFerryWaypointInjection
      ? 35
      : Math.max(15, adjustedTransitTimeMins);

  const synthesizedTransitTimeMins = isFerryWaypointInjection
    ? (firstMileDurationMins > 0
        ? firstMileDurationMins
        : firstMileMode === 'DRIVE'
        ? Math.max(3, Math.round(firstMileDistanceKm * 2.5))
        : firstMileMode === 'CYCLE'
        ? Math.max(3, Math.round((firstMileDistanceKm / 15) * 60))
        : Math.round(firstMileDistanceKm * 12)) +
      effectiveTransitMins +
      8
    : adjustedTransitTimeMins;

  const oneWayTransitMinutes =
    typeof input.transitTimeMins === 'number' ? input.transitTimeMins : synthesizedTransitTimeMins;
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

  // --- US-28: Segmented Journey Legs (First-Mile, Transit, Last-Mile) ---
  const journeyLegs: JourneyLeg[] = [];
  if (isEbike) {
    journeyLegs.push({
      id: 'leg-ebike',
      title: 'E-Bike Commute',
      type: 'TRANSIT',
      mode: 'EBIKE',
      originName: input.originAddress || origin.name,
      destinationName: input.destinationAddress || destination.name,
      distanceKm: round1(distanceOneWayKm),
      durationMins: Math.round((distanceOneWayKm / 20) * 60),
      cost: round2(dailyTransitFare / 2),
      costFormatted: `$${(dailyTransitFare / 2).toFixed(2)}`,
      iconName: 'Bike',
      notes: 'Direct active commute via cycleways',
    });
  } else {
    const isAlreadyAtStation =
      isOriginFerryTerminal ||
      (nearestStation && nearestStation.distanceKm < 0.15 && !input.firstMileDistanceKm);

    const stationName = isOriginFerryTerminal
      ? 'Hobsonville Point Ferry Terminal'
      : nearestStation
      ? nearestStation.name
      : `${origin.name} Station`;
    const fMode: 'DRIVE' | 'WALK' | 'SCOOTER' | 'CYCLE' = firstMileMode || 'DRIVE';
    const effectiveFirstMileDist =
      firstMileDistanceKm > 0 ? firstMileDistanceKm : (nearestStation ? nearestStation.distanceKm : 2.5);
    const effectiveFirstMileDuration =
      firstMileDurationMins > 0
        ? firstMileDurationMins
        : fMode === 'DRIVE'
        ? Math.max(3, Math.round(effectiveFirstMileDist * 2.5))
        : fMode === 'CYCLE'
        ? Math.max(3, Math.round((effectiveFirstMileDist / 15) * 60))
        : Math.round(effectiveFirstMileDist * 12);

    const firstMileTitle = isFerryWaypointInjection
      ? fMode === 'DRIVE'
        ? 'Drive to Ferry Terminal'
        : fMode === 'CYCLE'
        ? 'Cycle to Ferry Terminal'
        : fMode === 'SCOOTER'
        ? 'Scooter to Ferry Terminal'
        : 'Walk to Ferry Terminal'
      : fMode === 'DRIVE'
      ? 'Drive to Station'
      : fMode === 'CYCLE'
      ? 'Cycle to Station'
      : fMode === 'SCOOTER'
      ? 'Scooter to Station'
      : 'Walk to Station';

    if (!isAlreadyAtStation) {
      journeyLegs.push({
        id: 'leg-first-mile',
        title: firstMileTitle,
        type: 'FIRST_MILE',
        mode: fMode,
        originName: input.originAddress || origin.name,
        destinationName: stationName,
        distanceKm: round1(effectiveFirstMileDist),
        durationMins: effectiveFirstMileDuration,
        cost: round2(firstMileDailyCost / 2),
        costFormatted: (firstMileDailyCost / 2) > 0 ? `$${(firstMileDailyCost / 2).toFixed(2)}` : 'Free',
        iconName:
          fMode === 'DRIVE' ? 'Car' : fMode === 'CYCLE' ? 'Bike' : fMode === 'SCOOTER' ? 'Zap' : 'Footprints',
        notes: nearestStation?.hasParkAndRide ? 'Park & Ride Available' : undefined,
      });
    }

    const transitRideMode: 'TRAIN' | 'FERRY' | 'BUS' =
      isFerry || isFerryWaypointInjection
        ? 'FERRY'
        : (hasReturnedSteps && hasTrainStep) || (!hasReturnedSteps && origin.primaryTransitMode === 'Train')
        ? 'TRAIN'
        : 'BUS';
    const transitDist = Math.max(1, round1(distanceOneWayKm - (isAlreadyAtStation ? 0 : effectiveFirstMileDist)));

    const stepsTransitMins =
      Array.isArray(input.transitSteps) && input.transitSteps.length > 0
        ? input.transitSteps.reduce((acc, s) => acc + (s.durationMins || 0), 0)
        : 0;

    const transitMins =
      typeof input.transitRideDurationMins === 'number' && input.transitRideDurationMins > 0
        ? input.transitRideDurationMins
        : stepsTransitMins > 0
        ? stepsTransitMins
        : isFerryWaypointInjection
        ? 35
        : typeof input.transitTimeMins === 'number' && input.transitTimeMins > 0
        ? Math.max(15, Math.round(input.transitTimeMins - (isAlreadyAtStation ? 0 : effectiveFirstMileDuration) - 8))
        : Math.max(5, Math.round(adjustedTransitTimeMins - (isAlreadyAtStation ? 0 : effectiveFirstMileDuration) - 8));

    const isTransitFerry = isFerry;
    const isTransitTrain = transitRideMode === 'TRAIN';
    const transitTitle =
      input.transitLines && input.transitLines.length > 0
        ? `${isTransitFerry ? 'Ferry' : isTransitTrain ? 'Train' : 'Bus'} ${input.transitLines.join(' + ')} Ride`
        : `${transitBreakdown.primaryMode || (isTransitFerry ? 'Ferry' : isTransitTrain ? 'Train' : 'Transit')} Ride`;

    const transitNotes =
      input.transitSteps && input.transitSteps.length > 1
        ? input.transitSteps.map((s) => `${s.line} (${s.durationMins}m)`).join(' → ')
        : isHopCapApplied
        ? (passengers > 1 ? `Covered by AT $${50 * passengers}/wk Cap (${passengers} pax)` : 'Covered by AT $50 Weekly Cap')
        : isInnerHarbourFerry
        ? (passengers > 1
            ? `${ferryTier?.name || 'Ferry'} Fare ($${((ferryTier?.rate ?? 7.80) * passengers).toFixed(2)} for ${passengers} pax)`
            : `${ferryTier?.name || 'Ferry'} Fare ($${(ferryTier?.rate ?? 7.80).toFixed(2)})`)
        : (passengers > 1 ? `${zoneCount}-Zone AT HOP Fare (${passengers} pax)` : `${zoneCount}-Zone AT HOP Fare`);

    journeyLegs.push({
      id: 'leg-transit',
      title: transitTitle,
      type: 'TRANSIT',
      mode: transitRideMode,
      originName: stationName,
      destinationName: input.destinationAddress ? input.destinationAddress.split(',')[0] : `${destination.name} Hub`,
      distanceKm: transitDist,
      durationMins: transitMins,
      cost: singleTripConcessionFare,
      costFormatted:
        passengers > 1
          ? `$${singleTripConcessionFare.toFixed(2)} total (${passengers} pax)`
          : `$${singleTripConcessionFare.toFixed(2)}`,
      iconName: transitRideMode === 'TRAIN' ? 'Train' : transitRideMode === 'FERRY' ? 'Ship' : 'Bus',
      notes: transitNotes,
      transitSteps: input.transitSteps,
    });

    journeyLegs.push({
      id: 'leg-last-mile',
      title: 'Walk to Desk',
      type: 'LAST_MILE',
      mode: 'WALK',
      originName: input.destinationAddress ? input.destinationAddress.split(',')[0] : `${destination.name} Hub`,
      destinationName: input.destinationAddress || destination.name,
      distanceKm: 0.6,
      durationMins: 8,
      cost: 0,
      costFormatted: 'Free',
      iconName: 'Building',
      notes: 'Final walking stretch to office',
    });
  }

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
    journeyLegs,
    nearestStation,
    calculationMode,
  };
}

// Backward compatible alias
export const calculateArbitrage = calculateCommuteArbitrage;

export interface DrivingCostOptions {
  consumption?: number; // L/100km or kWh/100km
  fuelPrice?: number; // $/L or $/kWh
  powertrain?: VehiclePowertrain;
  vehicleType?: VehicleType | 'EV' | 'PHEV' | string;
  propulsion?: string;
  efficiency?: number; // kWh/100km
  kwhRate?: number; // $/kWh
  passengers?: number;
  ratePerKm?: number;
  includeMaintenance?: boolean;
  maintenanceRate?: number;
  includeRuc?: boolean;
  parkingCost?: number;
  annualWof?: number;
  annualRego?: number;
  annualInsurance?: number;
  includeFixedCosts?: boolean;
}

/**
 * Calculates driving cost for a given distance in km and calculation mode.
 * FEAT-60 & BUG-61: If 'IRD_TRUE_COST' is active, calculate `(distance_in_km * IRD_MILEAGE_RATE_PER_KM) / passengers + parking`.
 * Granular line items (WOF, Rego, Insurance, RUC, Wear & Tires) are strictly bypassed and zeroed out.
 * In 'FUEL' mode, calculates fuel consumption cost for distance_in_km based on vehicle parameters,
 * plus any optional granular costs (RUC, maintenance, fixed ownership).
 */
export function calculateDrivingCost(
  distanceKm: number,
  mode: CalculationMode = 'FUEL',
  options: DrivingCostOptions = {}
): number {
  const rate = options.ratePerKm ?? IRD_MILEAGE_RATE_PER_KM;
  const passengers = Math.max(1, options.passengers ?? 1);
  const parking = options.parkingCost ?? 0;

  if (mode === 'IRD_TRUE_COST') {
    // BUG-61: WOF, Rego, Insurance, RUC, and Wear & Tires are strictly zeroed out / bypassed
    // in the final addition so only (distance * 1.20) / passengers + parking is returned.
    const cost = (distanceKm * rate) / passengers;
    return round2(cost + parking);
  }

  const rawType = (
    options.propulsion ||
    options.vehicleType ||
    options.powertrain ||
    'petrol91'
  ).toString().toLowerCase();

  let effectiveVehicleType: VehicleType = 'petrol91';
  if (rawType.includes('phev')) {
    effectiveVehicleType = 'phev';
  } else if (rawType.includes('bev') || rawType.includes('ev') || rawType.includes('electric')) {
    effectiveVehicleType = 'bev';
  } else if (rawType.includes('diesel')) {
    effectiveVehicleType = 'diesel';
  } else if (rawType.includes('hybrid') || rawType.includes('hev')) {
    effectiveVehicleType = 'hev';
  } else if (rawType.includes('95') || rawType.includes('98')) {
    effectiveVehicleType = 'petrol95';
  } else if (VEHICLE_PRESETS[options.vehicleType as VehicleType]) {
    effectiveVehicleType = options.vehicleType as VehicleType;
  }

  const vehicle = VEHICLE_PRESETS[effectiveVehicleType] || VEHICLE_PRESETS.petrol91;
  const consumption = options.efficiency ?? options.consumption ?? vehicle.defaultConsumption;

  let fuelCost = 0;
  if (effectiveVehicleType === 'bev') {
    const kwhRate = options.kwhRate ?? options.fuelPrice ?? vehicle.defaultFuelPrice;
    fuelCost = round2(((distanceKm * consumption) / 100) * kwhRate);
  } else if (effectiveVehicleType === 'phev') {
    const electricKm = Math.min(distanceKm, 35);
    const petrolKm = Math.max(0, distanceKm - 35);
    const evRate = options.kwhRate ?? 0.18;
    const phevEvEfficiency = options.efficiency ?? 16.5;
    const phevPetrolEfficiency = options.consumption ?? 6.0;
    const petrolPrice = options.fuelPrice ?? 2.72;
    fuelCost = round2(((electricKm * phevEvEfficiency) / 100) * evRate + ((petrolKm * phevPetrolEfficiency) / 100) * petrolPrice);
  } else {
    const fuelPrice = options.fuelPrice ?? vehicle.defaultFuelPrice;
    fuelCost = round2(((distanceKm * consumption) / 100) * fuelPrice);
  }

  let rucCost = 0;
  if (options.includeRuc) {
    let rucRate = vehicle.rucRatePerKm ?? 0;
    if (effectiveVehicleType === 'bev') {
      rucRate = NZ_RUC_LIGHT_EV_RATE_PER_KM;
    } else if (effectiveVehicleType === 'phev') {
      rucRate = NZ_RUC_PHEV_RATE_PER_KM;
    } else if (effectiveVehicleType === 'diesel') {
      rucRate = NZ_RUC_DIESEL_RATE_PER_KM;
    }
    rucCost = round2(distanceKm * rucRate);
  }

  let maintenanceCost = 0;
  if (options.includeMaintenance) {
    const maintRate = options.maintenanceRate ?? NZ_AA_MAINTENANCE_PER_KM;
    maintenanceCost = distanceKm * maintRate;
  }

  let fixedCost = 0;
  if (options.includeFixedCosts) {
    const wof = options.annualWof ?? 85;
    const rego = options.annualRego ?? 173;
    const insurance = options.annualInsurance ?? 1311;
    // 70% commute apportionment / 260 working days per year
    fixedCost = ((wof + rego + insurance) * 0.70) / (52 * 5);
  }

  return round2((fuelCost + rucCost + maintenanceCost + fixedCost) / passengers + parking);
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function round1(num: number): number {
  return Math.round((num + Number.EPSILON) * 10) / 10;
}