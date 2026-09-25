import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES,
  CO2_FACTORS,
  CONCESSION_MULTIPLIERS,
  NZ_AA_MAINTENANCE_PER_KM,
  NZTA_RUC_RATES,
  VEHICLE_PRESETS,
} from '@/config/fares.config';
import { estimateRouteMetrics, getSuburbById } from '@/config/suburbs';
import { ArbitrageResult, CommuteInput, DrivingCostBreakdown, TransitCostBreakdown } from '@/types';

export const WEEKS_PER_MONTH = 52 / 12; // 4.33333333

export function calculateArbitrage(input: CommuteInput): ArbitrageResult {
  const origin = getSuburbById(input.originSuburbId);
  const destination = getSuburbById(input.destinationSuburbId);

  // Route metrics
  const route = estimateRouteMetrics(origin, destination);
  const distanceOneWayKm = route.distanceKm;
  const distanceRoundTripKm = distanceOneWayKm * 2;

  // Vehicle specifications
  const vehicle = VEHICLE_PRESETS[input.vehicleType] || VEHICLE_PRESETS.petrol91;
  const consumption = input.consumptionOverride ?? vehicle.defaultConsumption;
  const fuelPrice = input.fuelPriceOverride ?? vehicle.defaultFuelPrice;
  const rucRate = NZTA_RUC_RATES[input.vehicleType]?.ratePerKm ?? 0;
  const maintenanceRate = input.includeMaintenanceWear
    ? (input.maintenanceCostPerKm ?? NZ_AA_MAINTENANCE_PER_KM)
    : 0;

  const passengers = Math.max(1, input.carpoolPassengers || 1);

  // --- Driving Costs ---
  // Consumption for round trip
  const consumptionRoundTrip = (consumption / 100) * distanceRoundTripKm;
  const dailyFuelCost = (consumptionRoundTrip * fuelPrice) / passengers;
  const dailyRucCost = (distanceRoundTripKm * rucRate) / passengers;
  const dailyMaintenanceCost = (distanceRoundTripKm * maintenanceRate) / passengers;

  // Parking: applies for parkingDaysPerWeek days per week
  const effectiveParkingDays = Math.min(input.parkingDaysPerWeek, input.daysPerWeek);
  const weeklyParkingCost = (input.parkingDailyRate * effectiveParkingDays) / passengers;
  const dailyParkingCost = input.daysPerWeek > 0 ? weeklyParkingCost / input.daysPerWeek : 0;

  const dailyTotal = dailyFuelCost + dailyRucCost + dailyParkingCost + dailyMaintenanceCost;

  const weeklyFuelCost = dailyFuelCost * input.daysPerWeek;
  const weeklyRucCost = dailyRucCost * input.daysPerWeek;
  const weeklyMaintenanceCost = dailyMaintenanceCost * input.daysPerWeek;
  const weeklyTotal = weeklyFuelCost + weeklyRucCost + weeklyParkingCost + weeklyMaintenanceCost;

  const monthlyFuelCost = weeklyFuelCost * WEEKS_PER_MONTH;
  const monthlyRucCost = weeklyRucCost * WEEKS_PER_MONTH;
  const monthlyParkingCost = weeklyParkingCost * WEEKS_PER_MONTH;
  const monthlyMaintenanceCost = weeklyMaintenanceCost * WEEKS_PER_MONTH;
  const monthlyTotalDriving = weeklyTotal * WEEKS_PER_MONTH;

  const annualTotalDriving = monthlyTotalDriving * 12;

  // Monthly CO2 for driving (kg)
  let co2FactorPerUnit = CO2_FACTORS.petrolPerLitre;
  if (input.vehicleType === 'diesel') co2FactorPerUnit = CO2_FACTORS.dieselPerLitre;
  if (input.vehicleType === 'bev') co2FactorPerUnit = CO2_FACTORS.nzElectricityPerKwh;
  if (input.vehicleType === 'phev') co2FactorPerUnit = CO2_FACTORS.petrolPerLitre * 0.5;

  const monthlyFuelUnits = consumptionRoundTrip * input.daysPerWeek * WEEKS_PER_MONTH;
  const monthlyCo2KgDriving = monthlyFuelUnits * co2FactorPerUnit;

  const drivingBreakdown: DrivingCostBreakdown = {
    distanceOneWayKm: Math.round(distanceOneWayKm * 10) / 10,
    distanceRoundTripKm: Math.round(distanceRoundTripKm * 10) / 10,
    dailyFuelCost: round2(dailyFuelCost),
    dailyRucCost: round2(dailyRucCost),
    dailyParkingCost: round2(dailyParkingCost),
    dailyMaintenanceCost: round2(dailyMaintenanceCost),
    dailyTotal: round2(dailyTotal),

    weeklyFuelCost: round2(weeklyFuelCost),
    weeklyRucCost: round2(weeklyRucCost),
    weeklyParkingCost: round2(weeklyParkingCost),
    weeklyMaintenanceCost: round2(weeklyMaintenanceCost),
    weeklyTotal: round2(weeklyTotal),

    monthlyFuelCost: round2(monthlyFuelCost),
    monthlyRucCost: round2(monthlyRucCost),
    monthlyParkingCost: round2(monthlyParkingCost),
    monthlyMaintenanceCost: round2(monthlyMaintenanceCost),
    monthlyTotal: round2(monthlyTotalDriving),

    annualTotal: round2(annualTotalDriving),
    monthlyCo2Kg: Math.round(monthlyCo2KgDriving * 10) / 10,
  };

  // --- Public Transport (AT HOP) Costs ---
  const zoneCount = route.zonesTraveled;
  const singleTripStandardFare = AT_HOP_ZONE_FARES[zoneCount] || 2.60;
  const concessionInfo = CONCESSION_MULTIPLIERS[input.concession] || CONCESSION_MULTIPLIERS.adult;
  const singleTripConcessionFare = round2(singleTripStandardFare * concessionInfo.multiplier);

  const dailyTransitFare = singleTripConcessionFare * 2;
  const uncappedWeeklyFare = dailyTransitFare * input.daysPerWeek;

  // Apply AT HOP 7-Day $50 Cap
  const isHopCapApplied = uncappedWeeklyFare > AT_HOP_7_DAY_CAP;
  const hopCappedWeeklyFare = isHopCapApplied ? AT_HOP_7_DAY_CAP : uncappedWeeklyFare;

  const weeklyTransitTotal = hopCappedWeeklyFare;
  const monthlyTransitTotal = weeklyTransitTotal * WEEKS_PER_MONTH;
  const annualTransitTotal = monthlyTransitTotal * 12;

  // Monthly CO2 for transit (kg)
  const monthlyTransitPassengerKm = distanceRoundTripKm * input.daysPerWeek * WEEKS_PER_MONTH;
  const monthlyCo2KgTransit = monthlyTransitPassengerKm * CO2_FACTORS.ptPerPassengerKm;

  const transitBreakdown: TransitCostBreakdown = {
    zoneCount,
    singleTripStandardFare: round2(singleTripStandardFare),
    singleTripConcessionFare: round2(singleTripConcessionFare),
    dailyFare: round2(dailyTransitFare),
    uncappedWeeklyFare: round2(uncappedWeeklyFare),
    isHopCapApplied,
    hopCappedWeeklyFare: round2(hopCappedWeeklyFare),
    weeklyTotal: round2(weeklyTransitTotal),
    monthlyTotal: round2(monthlyTransitTotal),
    annualTotal: round2(annualTransitTotal),
    monthlyCo2Kg: Math.round(monthlyCo2KgTransit * 10) / 10,
    primaryMode: origin.primaryTransitMode,
    estimatedTransitTimeMins: route.transitTimeMins,
  };

  // --- Arbitrage Calculations ---
  const monthlySavings = round2(monthlyTotalDriving - monthlyTransitTotal);
  const annualSavings = round2(monthlySavings * 12);
  const co2SavedMonthlyKg = Math.max(0, Math.round((monthlyCo2KgDriving - monthlyCo2KgTransit) * 10) / 10);

  // Break-even days per week calculation
  // Find minimum days/week where transit is cheaper than driving
  let breakEvenDaysPerWeek = 1;
  for (let d = 1; d <= 7; d++) {
    const dDriveWeekly = (dailyFuelCost + dailyRucCost + dailyMaintenanceCost) * d +
      (input.parkingDailyRate * Math.min(input.parkingDaysPerWeek, d)) / passengers;
    const dTransitWeekly = Math.min(dailyTransitFare * d, AT_HOP_7_DAY_CAP);
    if (dDriveWeekly > dTransitWeekly) {
      breakEvenDaysPerWeek = d;
      break;
    }
  }

  // Hours reclaimed (e.g. relaxing / working on bus/train rather than driving in stop-start traffic)
  const totalCommuteDaysMonthly = input.daysPerWeek * WEEKS_PER_MONTH;
  const transitHoursMonthly = (route.transitTimeMins * 2 * totalCommuteDaysMonthly) / 60;
  // Assume on PT 75% of time is productive/relaxing reading, compared to 0% driving
  const hoursReclaimedMonthly = Math.round(transitHoursMonthly * 0.75 * 10) / 10;

  let arbitrageVerdict: 'transit_wins' | 'driving_wins' | 'break_even' = 'break_even';
  let arbitrageTagline = 'Costs are virtually identical between driving and public transit.';

  if (monthlySavings > 25) {
    arbitrageVerdict = 'transit_wins';
    arbitrageTagline = `Public Transport saves you $${monthlySavings.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month ($${annualSavings.toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr)${isHopCapApplied ? ' with the AT $50 7-Day Cap!' : '!'}`;
  } else if (monthlySavings < -25) {
    arbitrageVerdict = 'driving_wins';
    arbitrageTagline = `Driving is currently $${Math.abs(monthlySavings).toLocaleString('en-NZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month cheaper than transit for your current setup.`;
  }

  return {
    driving: drivingBreakdown,
    transit: transitBreakdown,
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
  };
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
