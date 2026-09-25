import { getLatestBenchmarkSummary, getLatestFuelPrices } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    const summary = await getLatestBenchmarkSummary();
    const fuelSnapshots = await getLatestFuelPrices();

    const tankFillEstimates = {
      unleaded91_50L: Number((summary.regular_91 * 50).toFixed(2)),
      premium95_50L: Number((summary.premium_95 * 50).toFixed(2)),
      diesel_65L: Number((summary.diesel * 65).toFixed(2)),
      evFullCharge_60kWh: 16.8, // 60kWh * $0.28
    };

    return NextResponse.json({
      regular_91: summary.regular_91,
      premium_95: summary.premium_95,
      diesel: summary.diesel,
      date: summary.date,
      source: summary.source,
      // Compatibility additions
      success: true,
      fuelSnapshots,
      tankFillEstimates,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch fuel prices';
    console.error('Fuel API Error:', error);
    return NextResponse.json(
      {
        regular_91: 2.72,
        premium_95: 2.94,
        diesel: 2.05,
        date: new Date().toISOString().split('T')[0],
        source: 'fallback',
        error: message,
      },
      { status: 500 }
    );
  }
}
