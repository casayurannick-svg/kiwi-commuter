import { ConcessionType, VehicleConfig, VehicleType } from '@/types';

export const AT_HOP_ZONE_FARES: Record<number, number> = {
  1: 2.60,
  2: 4.45,
  3: 6.00,
  4: 7.70,
  5: 9.40,
};

export const AT_HOP_7_DAY_CAP = 50.00; // AT 7-Day Fare Cap introduced for buses, trains, and inner ferries

export const CONCESSION_MULTIPLIERS: Record<ConcessionType, { multiplier: number; label: string; description: string }> = {
  adult: {
    multiplier: 1.0,
    label: 'Standard Adult (AT HOP)',
    description: 'Standard AT HOP card fare',
  },
  tertiary: {
    multiplier: 0.8,
    label: 'Tertiary Student (20% off)',
    description: 'Enrolled students at approved NZ tertiary institutions',
  },
  community_connect: {
    multiplier: 0.5,
    label: 'Community Connect (50% off)',
    description: 'Community Services Card holders',
  },
  youth: {
    multiplier: 0.5,
    label: 'Youth 13–24 (50% off)',
    description: 'Youth discount on AT HOP',
  },
  supergold: {
    multiplier: 0.5, // Averaging off-peak free vs peak travel
    label: 'SuperGold Cardholder',
    description: 'Free off-peak (after 9am & weekends), standard during morning peak',
  },
};

export const NZTA_RUC_RATES: Record<VehicleType, { ratePerKm: number; description: string }> = {
  petrol91: {
    ratePerKm: 0.00,
    description: 'Excise duty collected at pump; no road user charges.',
  },
  petrol95: {
    ratePerKm: 0.00,
    description: 'Excise duty collected at pump; no road user charges.',
  },
  diesel: {
    ratePerKm: 0.076,
    description: 'NZTA standard diesel RUC: $76 per 1,000 km ($0.076/km).',
  },
  bev: {
    ratePerKm: 0.076,
    description: 'NZTA Light EV RUC: $76 per 1,000 km ($0.076/km) effective April 2024.',
  },
  phev: {
    ratePerKm: 0.038,
    description: 'NZTA PHEV RUC: $38 per 1,000 km ($0.038/km) effective April 2024.',
  },
};

export const VEHICLE_PRESETS: Record<VehicleType, VehicleConfig> = {
  petrol91: {
    id: 'petrol91',
    name: 'Petrol 91 (e.g. Swift, Corolla, Demio)',
    category: 'Combustion',
    defaultConsumption: 7.2,
    unit: 'L/100km',
    defaultFuelPrice: 2.72,
    rucRatePerKm: 0.00,
    description: 'Popular compact/hatchback with standard 91 unleaded fuel',
  },
  petrol95: {
    id: 'petrol95',
    name: 'Petrol 95/98 (e.g. Golf, Outback, SUV)',
    category: 'Combustion',
    defaultConsumption: 8.8,
    unit: 'L/100km',
    defaultFuelPrice: 2.94,
    rucRatePerKm: 0.00,
    description: 'Medium to large petrol cars & performance vehicles',
  },
  diesel: {
    id: 'diesel',
    name: 'Diesel (e.g. Hilux, Ranger, CX-5)',
    category: 'Combustion',
    defaultConsumption: 8.4,
    unit: 'L/100km',
    defaultFuelPrice: 2.05,
    rucRatePerKm: 0.076,
    description: 'Diesel vehicle with pump fuel + $76/1,000km NZTA RUC',
  },
  bev: {
    id: 'bev',
    name: 'Pure Electric EV (e.g. Model 3, Atto 3, Leaf)',
    category: 'Electric',
    defaultConsumption: 16.5,
    unit: 'kWh/100km',
    defaultFuelPrice: 0.28,
    rucRatePerKm: 0.076,
    description: 'Battery Electric Vehicle + home charging + $76/1,000km NZTA RUC',
  },
  phev: {
    id: 'phev',
    name: 'Plug-in Hybrid (e.g. Outlander, Prius Prime)',
    category: 'Hybrid',
    defaultConsumption: 3.8, // Combined blended equivalent
    unit: 'L/100km',
    defaultFuelPrice: 2.72,
    rucRatePerKm: 0.038,
    description: 'Plug-in hybrid operating on blended mode + $38/1,000km NZTA RUC',
  },
};

export const DEFAULT_PARKING_PRESETS = [
  { name: 'Auckland CBD Early Bird (Downtown / Civic)', rate: 18.00 },
  { name: 'Commercial Parking Casual (Wilson / Secure)', rate: 26.00 },
  { name: 'Fringe / City Fringe (Ponsonby, Grafton, Newmarket)', rate: 12.00 },
  { name: 'Free / Subsidized Workplace Parking', rate: 0.00 },
];

export const NZ_AA_MAINTENANCE_PER_KM = 0.18; // Amortized tires, brake pads, servicing, WOF, depreciation

export const CO2_FACTORS = {
  petrolPerLitre: 2.31, // kg CO2 / L
  dieselPerLitre: 2.68, // kg CO2 / L
  nzElectricityPerKwh: 0.09, // NZ grid has ~85% renewables, ~90g CO2/kWh
  ptPerPassengerKm: 0.038, // Average Auckland bus/train per passenger km
};
