import { getSuburbById } from '@/config/suburbs';
import { calculateArbitrage } from '@/lib/calculator';
import { getDirectionsRoute } from '@/lib/mapbox';
import { CommuteInput, VehicleType } from '@/types';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const input: CommuteInput = {
      originSuburbId: body.originSuburbId || 'albany',
      destinationSuburbId: body.destinationSuburbId || 'cbd',
      daysPerWeek: typeof body.daysPerWeek === 'number' ? body.daysPerWeek : 5,
      vehicleType: body.vehicleType || 'petrol91',
      consumptionOverride: body.consumptionOverride ? Number(body.consumptionOverride) : undefined,
      fuelPriceOverride: body.fuelPriceOverride ? Number(body.fuelPriceOverride) : undefined,
      parkingDailyRate: typeof body.parkingDailyRate === 'number' ? body.parkingDailyRate : 18.0,
      parkingDaysPerWeek: typeof body.parkingDaysPerWeek === 'number' ? body.parkingDaysPerWeek : 5,
      concession: body.concession || 'adult',
      includeMaintenanceWear: Boolean(body.includeMaintenanceWear ?? true),
      maintenanceCostPerKm: body.maintenanceCostPerKm ? Number(body.maintenanceCostPerKm) : undefined,
      carpoolPassengers: body.carpoolPassengers ? Math.max(1, Number(body.carpoolPassengers)) : 1,
    };

    const arbitrage = calculateArbitrage(input);

    const origin = getSuburbById(input.originSuburbId);
    const destination = getSuburbById(input.destinationSuburbId);
    const routeGeometry = await getDirectionsRoute(origin, destination);

    return NextResponse.json({
      success: true,
      input,
      arbitrage,
      routeGeometry,
      origin,
      destination,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to evaluate commute arbitrage calculation';
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
  const originSuburbId = searchParams.get('origin') || 'albany';
  const destinationSuburbId = searchParams.get('destination') || 'cbd';
  const days = Number(searchParams.get('days') || '5');
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

  const arbitrage = calculateArbitrage(input);
  return NextResponse.json({ success: true, arbitrage });
}
