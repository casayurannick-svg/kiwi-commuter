// Statutory & Domain Core Enums/Unions
export type VehiclePowertrain = 'PETROL_91' | 'PETROL_95' | 'DIESEL' | 'PHEV' | 'BEV';

export type FareConcession = 'ADULT' | 'CHILD' | 'TERTIARY';

export type ParkingTier = 'CBD_EARLY_BIRD' | 'CBD_CASUAL' | 'SUBURBAN_HUB' | 'FREE';

export interface SuburbCentroid {
  id: string;
  name: string;
  region: 'Auckland Central' | 'North Shore' | 'West Auckland' | 'East Auckland' | 'South Auckland';
  coordinates: [number, number]; // [lng, lat]
  defaultZonesToCBD: number;
  approxDistanceKmToCBD: number;
}

// Backward compatibility & application types
export type VehicleType = 'petrol91' | 'petrol95' | 'diesel' | 'bev' | 'phev';

export type ConcessionType = 'adult' | 'tertiary' | 'community_connect' | 'youth' | 'supergold';

export interface VehicleConfig {
  id: VehicleType;
  powertrain: VehiclePowertrain;
  name: string;
  category: 'Combustion' | 'Electric' | 'Hybrid';
  defaultConsumption: number; // L/100km or kWh/100km
  unit: 'L/100km' | 'kWh/100km';
  defaultFuelPrice: number; // NZD per litre or per kWh
  rucRatePerKm: number; // NZD per km (NZTA Road User Charges)
  description: string;
}

export interface Suburb extends SuburbCentroid {
  zone: 1 | 2 | 3 | 4 | 5;
  drivingDistanceToCbdKm: number;
  drivingTimePeakMins: number;
  drivingTimeOffPeakMins: number;
  primaryTransitMode: 'Bus' | 'Train' | 'Northern Busway' | 'Ferry';
  transitTimeToCbdMins: number;
  transitRouteNotes: string;
}

export interface CommuteInput {
  originSuburbId: string;
  destinationSuburbId: string;
  daysPerWeek: number; // 1 to 7
  vehicleType: VehicleType;
  powertrain?: VehiclePowertrain;
  consumptionOverride?: number; // custom L/100km or kWh/100km
  fuelPriceOverride?: number; // custom $/L or $/kWh
  parkingDailyRate: number; // NZD
  parkingDaysPerWeek: number; // days paying parking
  parkingTier?: ParkingTier;
  concession: ConcessionType;
  fareConcession?: FareConcession;
  includeMaintenanceWear: boolean;
  maintenanceCostPerKm?: number; // NZ AA average ~$0.18/km
  carpoolPassengers: number; // 1 = solo driver, 2 = split driving costs with 1 passenger
  fuelEconomy?: number; // Alias for consumptionOverride
  customParkingDaily?: number; // Alias for parkingDailyRate
  homeKWhRate?: number; // Alias for BEV electricity rate
  customFuelPricePerL?: number; // Alias for ICE fuel price
  evChargingMode?: EvChargingMode; // Preset: home_offpeak, home_flat, public_dc, custom
}

export type EvChargingMode = 'home_offpeak' | 'home_flat' | 'public_dc' | 'custom';

export interface DrivingCostBreakdown {
  distanceOneWayKm: number;
  distanceRoundTripKm: number;
  dailyFuelCost: number;
  dailyRucCost: number;
  dailyParkingCost: number;
  dailyMaintenanceCost: number;
  dailyTotal: number;

  weeklyFuelCost: number;
  weeklyRucCost: number;
  weeklyParkingCost: number;
  weeklyMaintenanceCost: number;
  weeklyTotal: number;

  monthlyFuelCost: number;
  monthlyRucCost: number;
  monthlyParkingCost: number;
  monthlyMaintenanceCost: number;
  monthlyTotal: number;

  annualTotal: number;
  monthlyCo2Kg: number;
}

export interface TransitCostBreakdown {
  zoneCount: number;
  singleTripStandardFare: number;
  singleTripConcessionFare: number;
  dailyFare: number;
  uncappedWeeklyFare: number;
  isHopCapApplied: boolean;
  hopCappedWeeklyFare: number;
  weeklyTotal: number;
  monthlyTotal: number;
  annualTotal: number;
  monthlyCo2Kg: number;
  primaryMode: string;
  estimatedTransitTimeMins: number;
}

export interface CommuteComparisonResult {
  driving: DrivingCostBreakdown;
  transit: TransitCostBreakdown;
  dailySavings: number;
  weeklySavings: number;
  monthlySavings: number; // driving.monthlyTotal - transit.monthlyTotal
  annualSavings: number;
  breakEvenDaysPerWeek: number;
  co2SavedMonthlyKg: number;
  hoursReclaimedMonthly: number; // unproductive driving vs potential transit reading/laptop time
  arbitrageVerdict: 'transit_wins' | 'driving_wins' | 'break_even';
  arbitrageTagline: string;
  distanceKm: number;
  drivingTimeMins: number;
  transitTimeMins: number;
}

export type ArbitrageResult = CommuteComparisonResult;

export interface FuelSnapshot {
  fuelType: 'unleaded91' | 'premium95' | 'diesel' | 'electricity';
  price: number;
  unit: string;
  nationalAverage?: number;
  aucklandAverage: number;
  updatedAt: string;
  source: string;
  trendPct7d?: number;
}

export interface ParkingRateSchedule {
  zoneName: string;
  facility: string;
  dailyEarlyBird: number;
  dailyCasualMax: number;
  monthlyUnallocated: number;
  updatedAt: string;
}

export interface RouteGeometry {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {
    distanceKm: number;
    durationMins: number;
  };
}
