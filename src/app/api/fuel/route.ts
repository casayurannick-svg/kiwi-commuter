import { getLatestFuelPrices } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const fuelSnapshots = await getLatestFuelPrices();

    // Calculate tank fill estimates for standard 50L car tank
    const tankFillEstimates = {
      unleaded91_50L: (fuelSnapshots.find((f) => f.fuelType === 'unleaded91')?.price || 2.72) * 50,
      premium95_50L: (fuelSnapshots.find((f) => f.fuelType === 'premium95')?.price || 2.94) * 50,
      diesel_65L: (fuelSnapshots.find((f) => f.fuelType === 'diesel')?.price || 2.05) * 65,
      evFullCharge_60kWh: (fuelSnapshots.find((f) => f.fuelType === 'electricity')?.price || 0.28) * 60,
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      region: 'Auckland, New Zealand',
      fuelSnapshots,
      tankFillEstimates,
      notes: 'Fuel prices tracked from MBIE weekly survey data and Auckland retail indicators. RUC for Diesel and EV is calculated separately per NZTA regulations.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fuel prices';
    console.error('Fuel API Error:', error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
