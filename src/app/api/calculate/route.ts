import { getSuburbById } from '@/config/suburbs';
import { calculateCommuteArbitrage } from '@/lib/calculator';
import { getDirectionsRoute } from '@/lib/mapbox';
import { getLatestBenchmarkSummary } from '@/lib/supabase';
import { CommuteInput, VehicleType } from '@/types';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Determine custom fuel price override if provided
    let fuelPriceOverride: number | undefined = undefined;
    if (typeof body.customFuelPricePerL === 'number' && body.customFuelPricePerL > 0) {
      fuelPriceOverride = body.customFuelPricePerL;
    } else if (typeof body.fuelPriceOverride === 'number' && body.fuelPriceOverride > 0) {
      fuelPriceOverride = body.fuelPriceOverride;
    } else {
      // Enrich with latest benchmark from Supabase / MBIE dataset
      const benchmark = await getLatestBenchmarkSummary();
      const vType = body.vehicleType || 'petrol91';
      if (vType === 'petrol91' || body.powertrain === 'PETROL_91') {
        fuelPriceOverride = benchmark.regular_91;
      } else if (vType === 'petrol95' || body.powertrain === 'PETROL_95') {
        fuelPriceOverride = benchmark.premium_95;
      } else if (vType === 'diesel' || body.powertrain === 'DIESEL') {
        fuelPriceOverride = benchmark.diesel;
      }
    }

    const input: CommuteInput = {
      originSuburbId: body.originSuburbId || 'epsom',
      destinationSuburbId: body.destinationSuburbId || 'cbd',
      daysPerWeek: typeof body.daysPerWeek === 'number' ? body.daysPerWeek : 3,
      vehicleType: body.vehicleType || 'petrol91',
      powertrain: body.powertrain,
      consumptionOverride: body.consumptionOverride ? Number(body.consumptionOverride) : undefined,
      fuelPriceOverride,
      parkingDailyRate: typeof body.parkingDailyRate === 'number' ? body.parkingDailyRate : 18.0,
      parkingDaysPerWeek: typeof body.parkingDaysPerWeek === 'number' ? body.parkingDaysPerWeek : 3,
      parkingTier: body.parkingTier,
      concession: body.concession || 'adult',
      fareConcession: body.fareConcession,
      includeMaintenanceWear: Boolean(body.includeMaintenanceWear ?? true),
      maintenanceCostPerKm: body.maintenanceCostPerKm ? Number(body.maintenanceCostPerKm) : undefined,
      carpoolPassengers: body.carpoolPassengers ? Math.max(1, Number(body.carpoolPassengers)) : 1,
    };

    const arbitrage = calculateCommuteArbitrage(input);

    const origin = getSuburbById(input.originSuburbId);
    const destination = getSuburbById(input.destinationSuburbId);
    const routeGeometry = await getDirectionsRoute(origin, destination);

    return NextResponse.json({
      ...arbitrage,
      success: true,
      input,
      arbitrage,
      result: arbitrage, // alias
      routeGeometry,
      origin,
      destination,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to evaluate commute arbitrage calculation';
    console.error('Calculate API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const originSuburbId = searchParams.get('origin') || 'epsom';
  const destinationSuburbId = searchParams.get('destination') || 'cbd';
  const days = Number(searchParams.get('days') || '3');
  const vehicle = (searchParams.get('vehicle') as VehicleType) || 'petrol91';
  const parking = Number(searchParams.get('parking') || '18');

  const input: CommuteInput = {
    originSuburbId,
    destinationSuburbId,
    daysPerWeek: days,
    vehicleType: vehicle,
    parkingDailyRate: parking,
    parkingDaysPerWeek: days,
    concession: 'adult',
    includeMaintenanceWear: true,
    carpoolPassengers: 1,
  };

  const arbitrage = calculateCommuteArbitrage(input);
  return NextResponse.json({ success: true, arbitrage, result: arbitrage });
}
