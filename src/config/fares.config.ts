import {
  ConcessionType,
  EVChargingSource,
  EvChargingMode,
  FareConcession,
  ParkingTier,
  VehicleConfig,
  VehiclePowertrain,
  VehicleType,
} from '@/types';

/**
 * NZ EV Charging Benchmarks ($/kWh)
 */
export const NZ_EV_CHARGING_RATES: Record<EVChargingSource, number> = {
  HOME_OFFPEAK: 0.18,
  HOME_FLAT: 0.30,
  PUBLIC_DC: 0.85,
  CUSTOM: 0.18,
};

/**
 * Standard NZ Retail Fuel Price Benchmark ($/L)
 * Used as fallback rate when user input is empty or NaN.
 */
export const DEFAULT_FUEL_RATE = 2.72;

/**
 * EV & PHEV Charging Presets (NZ Electricity & Public Fast Charging Benchmarks)
 * - Home Off-Peak: Overnight EV plans (e.g., Genesis EV plan, Electric Kiwi Night Owl) ~$0.18/kWh
 * - Home Flat: Standard flat-rate residential electricity ~$0.30/kWh
 * - Public DC Fast: Commercial rapid chargers (ChargeNet, Tesla Supercharger, We.EV) ~$0.85/kWh
 */
export const EV_CHARGING_PRESETS: Record<
  EvChargingMode,
  { label: string; rate: number; description: string }
> = {
  home_offpeak: {
    label: 'Home Off-Peak',
    rate: 0.18,
    description: 'Night tariff ($0.18/kWh)',
  },
  home_flat: {
    label: 'Home Flat',
    rate: 0.30,
    description: 'Standard residential ($0.30/kWh)',
  },
  public_dc: {
    label: 'Public DC Fast',
    rate: 0.85,
    description: 'ChargeNet / Supercharger ($0.85/kWh)',
  },
  custom: {
    label: 'Custom',
    rate: 0.18,
    description: 'User-specified rate',
  },
};


/**
 * Statutory New Zealand Road User Charges (RUC) Rates
 * Under the Road User Charges Act 2012 and the Road User Charges (Light Electric RUC) Amendment Regulations 2024.
 * Effective 1 April 2024: Light Electric Vehicles (BEVs) and Plug-in Hybrids (PHEVs) entered the RUC system.
 */
export interface StatutoryRucRate {
  powertrain: VehiclePowertrain;
  ratePer1000Km: number; // NZD per 1,000 km
  ratePerKm: number; // NZD per km
  adminTransactionFee: number; // Online purchasing fee per distance licence
  legislation: string;
  description: string;
}

export const STATUTORY_NZTA_RUC_RATES: Record<VehiclePowertrain, StatutoryRucRate> = {
  PETROL_91: {
    powertrain: 'PETROL_91',
    ratePer1000Km: 0.0,
    ratePerKm: 0.0,
    adminTransactionFee: 0.0,
    legislation: 'Land Transport Management Act 2003 (Excise Duty at Pump)',
    description: 'Road funding collected via Fuel Excise Duty (FED) embedded in retail pump price.',
  },
  PETROL_95: {
    powertrain: 'PETROL_95',
    ratePer1000Km: 0.0,
    ratePerKm: 0.0,
    adminTransactionFee: 0.0,
    legislation: 'Land Transport Management Act 2003 (Excise Duty at Pump)',
    description: 'Road funding collected via Fuel Excise Duty (FED) embedded in retail pump price.',
  },
  DIESEL: {
    powertrain: 'DIESEL',
    ratePer1000Km: 76.0,
    ratePerKm: 0.076,
    adminTransactionFee: 12.44,
    legislation: 'Road User Charges Act 2012 (Vehicle Type 1 / Diesel Light Vehicle)',
    description: 'Statutory RUC of $76 per 1,000 km for diesel powered light passenger vehicles.',
  },
  BEV: {
    powertrain: 'BEV',
    ratePer1000Km: 76.0,
    ratePerKm: 0.076,
    adminTransactionFee: 12.44,
    legislation: 'Road User Charges (Light Electric RUC) Amendment 2024',
    description: 'Light Electric Vehicle RUC: $76 per 1,000 km effective 1 April 2024.',
  },
  PHEV: {
    powertrain: 'PHEV',
    ratePer1000Km: 38.0,
    ratePerKm: 0.038,
    adminTransactionFee: 12.44,
    legislation: 'Road User Charges (PHEV Reduced Rate) Amendment 2024',
    description: 'Reduced RUC of $38 per 1,000 km acknowledging petrol excise duty paid in parallel.',
  },
  HEV: {
    powertrain: 'HEV',
    ratePer1000Km: 0.0,
    ratePerKm: 0.0,
    adminTransactionFee: 0.0,
    legislation: 'Land Transport Management Act 2003 (Excise Duty at Pump)',
    description: 'Conventional petrol hybrid (non-plug-in): Road funding collected via Fuel Excise Duty at pump (no RUC).',
  },
};

export const NZTA_RUC_RATES: Record<VehicleType, { ratePerKm: number; description: string }> = {
  petrol91: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.PETROL_91.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.PETROL_91.description,
  },
  petrol95: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.PETROL_95.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.PETROL_95.description,
  },
  diesel: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.DIESEL.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.DIESEL.description,
  },
  bev: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.BEV.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.BEV.description,
  },
  phev: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.PHEV.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.PHEV.description,
  },
  hev: {
    ratePerKm: STATUTORY_NZTA_RUC_RATES.HEV.ratePerKm,
    description: STATUTORY_NZTA_RUC_RATES.HEV.description,
  },
};

/**
 * Auckland Transport (AT HOP) Zonal Fare Tables
 * Official zonal fare structure across bus and train services.
 * Updated to reflect February 2026 price changes.
 */
export const AT_HOP_ZONE_FARES: Record<number, number> = {
  1: 3.00,
  2: 4.90,
  3: 6.60,
  4: 8.50,
  5: 10.30,
};

export const AT_HOP_ZONE_FARES_BY_CONCESSION: Record<FareConcession, Record<number, number>> = {
  ADULT: {
    1: 3.00,
    2: 4.90,
    3: 6.60,
    4: 8.50,
    5: 10.30,
  },
  TERTIARY: {
    1: 2.40,
    2: 3.92,
    3: 5.28,
    4: 6.80,
    5: 8.24,
  },
  CHILD: {
    1: 1.50,
    2: 2.45,
    3: 3.30,
    4: 4.25,
    5: 5.15,
  },
};

/**
 * Auckland Transport Inner Harbour Ferry Fares
 * (Devonport, Bayswater, Birkenhead, Te Onewa Northcote Point)
 * Effective February 2026: Flat rate of $7.80 per trip (standard adult HOP).
 * Under AT integrated fares, transferring between ferry and connecting bus within 30 minutes charges no additional zone fare.
 * Eligible for the AT $50 7-day rolling fare cap.
 */
export const INNER_HARBOUR_FERRY_FARE = 7.80;
export const AT_INNER_HARBOUR_FERRY_FARE = 7.80;

/**
 * Auckland Transport 7-Day Fare Cap
 * Passengers never pay more than $50 for all bus, train, and inner ferry travel over any 7-day rolling window.
 * Note: Exempt commercial services like Waiheke Ferry (Fullers360) are NOT eligible for the $50 cap.
 */
export const AT_HOP_7_DAY_CAP = 50.00;

/**
 * Waiheke Ferry Rates (Fullers360 Commercial Ferry Service)
 * Statutory exemption from the AT $50 7-day fare cap.
 */
export const WAIHEKE_FERRY_FARES = {
  singleTripStandard: 32.00, // Standard adult one-way HOP fare
  dailyReturnStandard: 64.00,
  monthlyPass: 403.00, // Fullers Waiheke Commuter Monthly Pass
  concessionFares: {
    adult: 32.00,
    tertiary: 25.60,
    community_connect: 16.00,
    youth: 16.00,
    supergold: 16.00, // Off-peak concessions/resident
  } as Record<ConcessionType, number>,
};

export const CONCESSION_MULTIPLIERS: Record<
  ConcessionType,
  { multiplier: number; label: string; description: string; statutoryCategory: FareConcession }
> = {
  adult: {
    multiplier: 1.0,
    label: 'Standard Adult (AT HOP)',
    description: 'Standard AT HOP card fare',
    statutoryCategory: 'ADULT',
  },
  tertiary: {
    multiplier: 0.8,
    label: 'Tertiary Student (20% off)',
    description: 'Enrolled students at approved NZ tertiary institutions',
    statutoryCategory: 'TERTIARY',
  },
  community_connect: {
    multiplier: 0.5,
    label: 'Community Connect (50% off)',
    description: 'Community Services Card holders',
    statutoryCategory: 'CHILD',
  },
  youth: {
    multiplier: 0.5,
    label: 'Youth 13–24 (50% off)',
    description: 'Youth discount on AT HOP',
    statutoryCategory: 'CHILD',
  },
  supergold: {
    multiplier: 0.5, // Averaging off-peak free vs peak travel
    label: 'SuperGold Cardholder',
    description: 'Free off-peak (after 9am & weekends), standard during morning peak',
    statutoryCategory: 'ADULT',
  },
};

/**
 * Commercial Parking Medians in Auckland
 * Surveyed medians across Auckland Transport parking facilities and private commercial operators (Wilson, Secure).
 */
export const PARKING_TIER_RATES: Record<
  ParkingTier,
  { rate: number; label: string; description: string }
> = {
  CBD_EARLY_BIRD: {
    rate: 18.00,
    label: 'CBD Early Bird',
    description: 'Entry before 9:00 AM at Downtown / Civic / Fanshawe car parks.',
  },
  CBD_CASUAL: {
    rate: 26.00,
    label: 'CBD Casual All-Day',
    description: 'Casual daily maximum rate at commercial parking buildings.',
  },
  SUBURBAN_HUB: {
    rate: 6.00,
    label: 'Suburban Transit Hub',
    description: 'Fringe or park-and-ride facility (e.g. Newmarket, Takapuna, Henderson).',
  },
  FREE: {
    rate: 0.00,
    label: 'Free / Subsidized',
    description: 'Dedicated workplace parking or street parking without charge.',
  },
};

export const DEFAULT_PARKING_PRESETS = [
  { name: 'Auckland CBD Early Bird (Downtown / Civic)', rate: PARKING_TIER_RATES.CBD_EARLY_BIRD.rate, tier: 'CBD_EARLY_BIRD' as ParkingTier },
  { name: 'Commercial Parking Casual (Wilson / Secure)', rate: PARKING_TIER_RATES.CBD_CASUAL.rate, tier: 'CBD_CASUAL' as ParkingTier },
  { name: 'Fringe / Suburban Hub (Newmarket, Takapuna)', rate: PARKING_TIER_RATES.SUBURBAN_HUB.rate, tier: 'SUBURBAN_HUB' as ParkingTier },
  { name: 'Free / Subsidized Workplace Parking', rate: PARKING_TIER_RATES.FREE.rate, tier: 'FREE' as ParkingTier },
];

export const VEHICLE_PRESETS: Record<VehicleType, VehicleConfig> = {
  petrol91: {
    id: 'petrol91',
    powertrain: 'PETROL_91',
    name: 'Petrol 91 (e.g. Swift, Corolla, Demio)',
    category: 'Combustion',
    defaultConsumption: 7.2,
    unit: 'L/100km',
    defaultFuelPrice: 2.72,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.PETROL_91.ratePerKm,
    description: 'Popular compact/hatchback with standard 91 unleaded fuel',
  },
  petrol95: {
    id: 'petrol95',
    powertrain: 'PETROL_95',
    name: 'Petrol 95/98 (e.g. Golf, Outback, SUV)',
    category: 'Combustion',
    defaultConsumption: 8.8,
    unit: 'L/100km',
    defaultFuelPrice: 2.94,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.PETROL_95.ratePerKm,
    description: 'Medium to large petrol cars & performance vehicles',
  },
  diesel: {
    id: 'diesel',
    powertrain: 'DIESEL',
    name: 'Diesel (e.g. Hilux, Ranger, CX-5)',
    category: 'Combustion',
    defaultConsumption: 8.4,
    unit: 'L/100km',
    defaultFuelPrice: 2.05,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.DIESEL.ratePerKm,
    description: 'Diesel vehicle with pump fuel + $76/1,000km NZTA RUC',
  },
  bev: {
    id: 'bev',
    powertrain: 'BEV',
    name: 'Pure Electric EV (e.g. Model 3, Atto 3, Leaf)',
    category: 'Electric',
    defaultConsumption: 16.5,
    unit: 'kWh/100km',
    defaultFuelPrice: 0.28,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.BEV.ratePerKm,
    description: 'Battery Electric Vehicle + home charging + $76/1,000km NZTA RUC',
  },
  phev: {
    id: 'phev',
    powertrain: 'PHEV',
    name: 'Plug-in Hybrid (e.g. Outlander, Prius Prime)',
    category: 'Hybrid',
    defaultConsumption: 3.8, // Combined blended equivalent
    unit: 'L/100km',
    defaultFuelPrice: 2.72,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.PHEV.ratePerKm,
    description: 'Plug-in hybrid operating on blended mode + $38/1,000km NZTA RUC',
  },
  hev: {
    id: 'hev',
    powertrain: 'HEV',
    name: 'Hybrid (Non-Plug-in) (e.g. Prius, Aqua, Corolla Hybrid)',
    category: 'Hybrid',
    defaultConsumption: 4.5,
    unit: 'L/100km',
    defaultFuelPrice: 2.72,
    rucRatePerKm: STATUTORY_NZTA_RUC_RATES.HEV.ratePerKm,
    description: 'Conventional petrol hybrid (non-plug-in) with pump fuel and $0 RUC',
  },
};

export const NZ_AA_MAINTENANCE_PER_KM = 0.18; // Amortized tires, brake pads, servicing, WOF, depreciation

export const CO2_FACTORS = {
  petrolPerLitre: 2.31, // kg CO2 / L
  dieselPerLitre: 2.68, // kg CO2 / L
  nzElectricityPerKwh: 0.09, // NZ grid has ~85% renewables, ~90g CO2/kWh
  ptPerPassengerKm: 0.038, // Average Auckland bus/train per passenger km
};

/**
 * US-38: NZ Fixed Vehicle Ownership Costs Benchmarks (Annual)
 * - WOF: ~$85/yr inspection (AA / VTNZ)
 * - Rego: ~$173/yr NZTA vehicle licensing for private petrol/diesel light vehicle
 * - Insurance: ~$1,311/yr median NZ comprehensive vehicle insurance premium
 * - Commute Apportionment: 70% of vehicle ownership allocated to commute travel
 */
export const DEFAULT_ANNUAL_WOF = 85;
export const DEFAULT_ANNUAL_REGO = 173;
export const DEFAULT_ANNUAL_INSURANCE = 1311;
export const FIXED_COST_COMMUTE_APPORTIONMENT = 0.70;

