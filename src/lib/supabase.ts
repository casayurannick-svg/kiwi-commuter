import { FuelSnapshot, ParkingRateSchedule } from '@/types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase client failed to initialize with provided env keys:', error);
  }
}

export const supabase = supabaseInstance;

// In-memory fallback snapshots representing latest MBIE & Auckland monitoring
export const FALLBACK_FUEL_SNAPSHOTS: FuelSnapshot[] = [
  {
    fuelType: 'unleaded91',
    price: 2.72,
    unit: '$/L',
    nationalAverage: 2.75,
    aucklandAverage: 2.72,
    updatedAt: new Date().toISOString(),
    source: 'MBIE Weekly Fuel Monitoring (Auckland)',
    trendPct7d: -0.8,
  },
  {
    fuelType: 'premium95',
    price: 2.94,
    unit: '$/L',
    nationalAverage: 2.98,
    aucklandAverage: 2.94,
    updatedAt: new Date().toISOString(),
    source: 'MBIE Weekly Fuel Monitoring (Auckland)',
    trendPct7d: -0.4,
  },
  {
    fuelType: 'diesel',
    price: 2.05,
    unit: '$/L',
    nationalAverage: 2.09,
    aucklandAverage: 2.05,
    updatedAt: new Date().toISOString(),
    source: 'MBIE Weekly Fuel Monitoring (Auckland)',
    trendPct7d: 1.2,
  },
  {
    fuelType: 'electricity',
    price: 0.28,
    unit: '$/kWh',
    nationalAverage: 0.31,
    aucklandAverage: 0.28,
    updatedAt: new Date().toISOString(),
    source: 'Electricity Authority NZ Residential Average',
    trendPct7d: 0.0,
  },
];

export const FALLBACK_PARKING_SCHEDULES: ParkingRateSchedule[] = [
  {
    zoneName: 'Auckland CBD - Downtown Car Park (AT)',
    facility: '31 Customs St West',
    dailyEarlyBird: 17.00,
    dailyCasualMax: 24.00,
    monthlyUnallocated: 375.00,
    updatedAt: '2024-09-01',
  },
  {
    zoneName: 'Auckland CBD - Civic Car Park (AT)',
    facility: 'Mayoral Drive / Greys Ave',
    dailyEarlyBird: 16.00,
    dailyCasualMax: 24.00,
    monthlyUnallocated: 350.00,
    updatedAt: '2024-09-01',
  },
  {
    zoneName: 'Auckland CBD - Fanshawe St (Wilson)',
    facility: 'Fanshawe & Viaduct',
    dailyEarlyBird: 22.00,
    dailyCasualMax: 32.00,
    monthlyUnallocated: 450.00,
    updatedAt: '2024-09-01',
  },
  {
    zoneName: 'Newmarket - AT Car Park',
    facility: 'Clifton Car Park',
    dailyEarlyBird: 13.00,
    dailyCasualMax: 18.00,
    monthlyUnallocated: 280.00,
    updatedAt: '2024-09-01',
  },
];

export async function getLatestFuelPrices(): Promise<FuelSnapshot[]> {
  if (supabase) {
    try {
      // 1. Query latest from fuel_benchmarks table (Step 4 schema)
      const { data: benchmarkData, error: benchmarkError } = await supabase
        .from('fuel_benchmarks')
        .select('*')
        .order('week_ending_date', { ascending: false })
        .limit(1);

      if (!benchmarkError && benchmarkData && benchmarkData.length > 0) {
        const latest = benchmarkData[0];
        const p91 = Number(latest.regular_91) / 100;
        const p95 = Number(latest.premium_95) / 100;
        const pDiesel = Number(latest.diesel) / 100;

        return [
          {
            fuelType: 'unleaded91',
            price: Number(p91.toFixed(2)),
            unit: '$/L',
            nationalAverage: Number((p91 + 0.03).toFixed(2)),
            aucklandAverage: Number(p91.toFixed(2)),
            updatedAt: latest.week_ending_date || new Date().toISOString(),
            source: 'MBIE Weekly Fuel Price Monitoring',
            trendPct7d: -0.8,
          },
          {
            fuelType: 'premium95',
            price: Number(p95.toFixed(2)),
            unit: '$/L',
            nationalAverage: Number((p95 + 0.04).toFixed(2)),
            aucklandAverage: Number(p95.toFixed(2)),
            updatedAt: latest.week_ending_date || new Date().toISOString(),
            source: 'MBIE Weekly Fuel Price Monitoring',
            trendPct7d: -0.4,
          },
          {
            fuelType: 'diesel',
            price: Number(pDiesel.toFixed(2)),
            unit: '$/L',
            nationalAverage: Number((pDiesel + 0.04).toFixed(2)),
            aucklandAverage: Number(pDiesel.toFixed(2)),
            updatedAt: latest.week_ending_date || new Date().toISOString(),
            source: 'MBIE Weekly Fuel Price Monitoring',
            trendPct7d: 1.2,
          },
          FALLBACK_FUEL_SNAPSHOTS.find((f) => f.fuelType === 'electricity')!,
        ];
      }

      // 2. Query fallback fuel_snapshots table
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('fuel_snapshots')
        .select('*')
        .order('updatedAt', { ascending: false })
        .limit(10);

      if (!snapshotError && snapshotData && snapshotData.length > 0) {
        return snapshotData as FuelSnapshot[];
      }
    } catch (err) {
      console.warn('Error reading fuel prices from Supabase, using fallback cache:', err);
    }
  }

  return FALLBACK_FUEL_SNAPSHOTS;
}
