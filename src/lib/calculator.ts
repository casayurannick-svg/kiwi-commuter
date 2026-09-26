import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  CO2_FACTORS,
  CONCESSION_MULTIPLIERS,
  DEFAULT_FUEL_RATE,
  EV_CHARGING_PRESETS,
  INNER_HARBOUR_FERRY_FARE,
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
  JourneyLeg,
  TimeMetrics,
  TransitCostBreakdown,
  VehiclePowertrain,
  VehicleType,
} from '@/types';
import { findNearestTransitStation } from './stations';

export const WEEKS_PER_MONTH = 52 / 12; // 4.33333333

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

  // Resolve vehicle type and powertrain
  const effectiveVehicleType: VehicleType =
    input.powertrain && POWERTRAIN_TO_VEHICLE_TYPE[input.powertrain]
      ? POWERTRAIN_TO_VEHICLE_TYPE[input.powertrain]
      : input.vehicleType || 'petrol91';

  const vehicle = VEHICLE_PRESETS[effectiveVehicleType] || VEHICLE_PRESETS.petrol91;
  const hasCustomConsumption =
    typeof input.consumptionOverride === 'number' &&
    !isNaN(input.consumptionOverride) &&
    input.consumptionOverride > 0;
  const consumption = hasCustomConsumption
    ? input.consumptionOverride!
    : vehicle.defaultConsumption;

  const isEbike = input.transitMode === 'EBIKE' || input.transitMode === 'E-Bike';
  const isHev = input.powertrain === 'HEV' || effectiveVehicleType === 'hev';

  // Statutory RUC rate ($/km) - HEV is exempt ($0.00/km)
  const rucRate = isEbike || isHev
    ? 0
    : input.powertrain && STATUTORY_NZTA_RUC_RATES[input.powertrain]
    ? STATUTORY_NZTA_RUC_RATES[input.powertrain].ratePerKm
    : NZTA_RUC_RATES[effectiveVehicleType]?.ratePerKm ?? 0;

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

  const isFerry =
    !isEbike &&
    !isMicromobility &&
    (hasFerryStep ||
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
          input.destinationSuburbId === 'birkenhead')));

  const isWaiheke = Boolean(
    input.isWaihekeRoute ||
    (isFerry && (input.originSuburbId === 'waiheke' || input.destinationSuburbId === 'waiheke'))
  );

  const isInnerHarbourFerry = isFerry && !isWaiheke;

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
    const perPersonDailyEbikeCost = round2(distanceRoundTripKm * ebikeCostPerKm);
    const perPersonSingleTrip = round2(perPersonDailyEbikeCost / 2);

    singleTripStandardFare = round2(perPersonSingleTrip * passengers);
    singleTripConcessionFare = singleTripStandardFare;

    dailyTransitFare = round2(perPersonDailyEbikeCost * passengers);
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
    // US-10: Inner Harbour Ferry (Devonport, Bayswater, Birkenhead, Northcote Pt)
    // Bypasses standard bus zones and applies flat $7.80 fare.
    // Under AT integrated fares, transferring to connecting bus within 30 mins charges no additional fare.
    const perPersonStandard = INNER_HARBOUR_FERRY_FARE;
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

    // Inner Harbour Ferries ARE eligible for the AT HOP 7-day $50 cap
    // Cap is applied per commuter and then scaled by passenger count (BUG-37)
    isHopCapApplied = baseUncappedWeeklyFarePerPerson > AT_HOP_7_DAY_CAP;
    const cappedWeeklyPerPerson = isHopCapApplied ? AT_HOP_7_DAY_CAP : baseUncappedWeeklyFarePerPerson;

    singleTripStandardFare = round2(perPersonStandard * passengers);
    singleTripConcessionFare = round2(perPersonConcession * passengers);
    dailyTransitFare = round2(baseDailyHopFarePerPerson * passengers);
    uncappedWeeklyFare = round2(baseUncappedWeeklyFarePerPerson * passengers);
    hopCappedWeeklyFare = round2(cappedWeeklyPerPerson * passengers);
    const baseWeeklyHopFare = hopCappedWeeklyFare;
    const baseMonthlyHopFare = round2(baseWeeklyHopFare * WEEKS_PER_MONTH);
    hopFareMonthly = baseMonthlyHopFare;

    weeklyTransitTotal = baseWeeklyHopFare;
    monthlyTransitTotal = baseMonthlyHopFare;
  } else {
    // Standard AT HOP Zonal Fares (bus and train)
    const perPersonStandard = AT_HOP_ZONE_FARES[zoneCount] || 3.00;
    let perPersonConcession: number;

    // Concession calculation
    if (input.fareConcession && AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession]) {
      perPersonConcession = AT_HOP_ZONE_FARES_BY_CONCESSION[input.fareConcession][zoneCount];
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

    singleTripStandardFare = round2(perPersonStandard * passengers);
    singleTripConcessionFare = round2(perPersonConcession * passengers);
    dailyTransitFare = round2(baseDailyHopFarePerPerson * passengers);
    uncappedWeeklyFare = round2(baseUncappedWeeklyFarePerPerson * passengers);
    hopCappedWeeklyFare = round2(cappedWeeklyPerPerson * passengers);
    const baseWeeklyHopFare = hopCappedWeeklyFare;
    const baseMonthlyHopFare = round2(baseWeeklyHopFare * WEEKS_PER_MONTH);
    hopFareMonthly = baseMonthlyHopFare;

    if (isMicromobility && input.scooterOwnership === 'RENTAL') {
      // US-23: Rental Scooter: $1 unlock + $0.45/min per leg per person
      // 2 legs per day return
      const costPerLeg = (1.00 + (scooterDurationMinsPerLeg * 0.45)) * passengers;
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

  // --- US-28: First-Mile Running Cost & Spatial Nearest Station Search ---
  const originCoords: [number, number] | undefined = input.originCoordinates;
  const nearestStation = originCoords ? findNearestTransitStation(originCoords) : undefined;
  const firstMileMode = input.firstMileMode ?? (input.originCoordinates ? 'DRIVE' : undefined);
  const firstMileDistanceKm =
    typeof input.firstMileDistanceKm === 'number'
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
        const phevEvEfficiency = 16.5;
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
      firstMileDurationMins = Math.max(3, Math.round(firstMileDistanceKm * 2.5));
    } else if (firstMileMode === 'SCOOTER') {
      firstMileDurationMins = round1((firstMileDistanceKm / 15) * 60);
      if (input.scooterOwnership === 'RENTAL') {
        const costPerLeg = 1.00 + (firstMileDurationMins * 0.45);
        firstMileDailyCost = round2(costPerLeg * 2);
        firstMileWeeklyCost = round2(firstMileDailyCost * input.daysPerWeek);
        firstMileMonthlyCost = round2(firstMileWeeklyCost * WEEKS_PER_MONTH);
      }
    } else {
      // WALK
      firstMileDurationMins = Math.round((firstMileDistanceKm / 5) * 60);
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
      : origin.primaryTransitMode,
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
    perPersonSingleFare: round2(singleTripConcessionFare / passengers),
    perPersonDailyFare: round2((dailyTransitFare - firstMileDailyCost) / passengers),
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
    const perCommuterTransitDaily = (dailyTransitFare - firstMileDailyCost) / passengers;
    const perCommuterFirstMileDaily = firstMileDailyCost / passengers;
    const dTransitWeekly =
      (Math.min(perCommuterTransitDaily * d, AT_HOP_7_DAY_CAP) + perCommuterFirstMileDaily * d) * passengers;
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
      costFormatted:
        passengers > 1
          ? `$${(dailyTransitFare / 2).toFixed(2)} total (${passengers} pax)`
          : `$${(dailyTransitFare / 2).toFixed(2)}`,
      iconName: 'Bike',
      notes: 'Direct active commute via cycleways',
    });
  } else {
    const stationName = nearestStation ? nearestStation.name : `${origin.name} Station`;
    const fMode: 'DRIVE' | 'WALK' | 'SCOOTER' = firstMileMode || 'DRIVE';
    const effectiveFirstMileDist = firstMileDistanceKm > 0 ? firstMileDistanceKm : (nearestStation ? nearestStation.distanceKm : 2.5);
    const effectiveFirstMileDuration = firstMileDurationMins > 0 ? firstMileDurationMins : (fMode === 'DRIVE' ? Math.max(3, Math.round(effectiveFirstMileDist * 2.5)) : Math.round(effectiveFirstMileDist * 12));

    journeyLegs.push({
      id: 'leg-first-mile',
      title: fMode === 'DRIVE' ? 'Drive to Station' : fMode === 'SCOOTER' ? 'Scooter to Station' : 'Walk to Station',
      type: 'FIRST_MILE',
      mode: fMode,
      originName: input.originAddress || origin.name,
      destinationName: stationName,
      distanceKm: round1(effectiveFirstMileDist),
      durationMins: effectiveFirstMileDuration,
      cost: round2(firstMileDailyCost / 2),
      costFormatted: (firstMileDailyCost / 2) > 0 ? `$${(firstMileDailyCost / 2).toFixed(2)}` : 'Free',
      iconName: fMode === 'DRIVE' ? 'Car' : fMode === 'SCOOTER' ? 'Zap' : 'Footprints',
      notes: nearestStation?.hasParkAndRide ? 'Park & Ride Available' : undefined,
    });

    const transitRideMode =
      origin.primaryTransitMode === 'Train'
        ? 'TRAIN'
        : origin.primaryTransitMode === 'Ferry' || isFerry
        ? 'FERRY'
        : 'BUS';
    const transitDist = Math.max(1, round1(distanceOneWayKm - effectiveFirstMileDist));

    // Priority for middle transit leg duration:
    // 1. Pure in-vehicle transit ride duration from live timetable routing (e.g. 31-36 mins)
    // 2. Total door-to-door transit time minus first-mile and last-mile duration
    // 3. Fallback: static suburb estimate minus first-mile and last-mile
    const transitMins =
      typeof input.transitRideDurationMins === 'number' && input.transitRideDurationMins > 0
        ? input.transitRideDurationMins
        : typeof input.transitTimeMins === 'number' && input.transitTimeMins > 0
        ? Math.max(15, Math.round(input.transitTimeMins - effectiveFirstMileDuration - 8))
        : Math.max(5, Math.round(adjustedTransitTimeMins - effectiveFirstMileDuration - 8));

    // Compose dynamic title and notes reflecting multi-leg transit routes
    const isTransitFerry = isFerry || transitRideMode === 'FERRY';
    const transitTitle =
      input.transitLines && input.transitLines.length > 0
        ? `${isTransitFerry ? 'Ferry' : 'Bus'} ${input.transitLines.join(' + ')} Ride`
        : `${transitBreakdown.primaryMode || (isTransitFerry ? 'Ferry' : 'Transit')} Ride`;

    const transitNotes =
      input.transitSteps && input.transitSteps.length > 1
        ? input.transitSteps.map((s) => `${s.line} (${s.durationMins}m)`).join(' → ')
        : isHopCapApplied
        ? (passengers > 1 ? `Covered by AT $${50 * passengers}/wk Cap (${passengers} pax)` : 'Covered by AT $50 Weekly Cap')
        : isInnerHarbourFerry
        ? (passengers > 1 ? `Inner Harbour Ferry Fare ($${(7.80 * passengers).toFixed(2)} for ${passengers} pax)` : 'Inner Harbour Ferry Fare ($7.80)')
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
