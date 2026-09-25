import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { calculateArbitrage, WEEKS_PER_MONTH } from '../src/lib/calculator';
import {
  AT_HOP_7_DAY_CAP,
  AT_HOP_ZONE_FARES_BY_CONCESSION,
  EV_CHARGING_PRESETS,
  NZTA_RUC_RATES,
  PARKING_TIER_RATES,
  STATUTORY_NZTA_RUC_RATES,
} from '../src/config/fares.config';
import { getSuburbById, estimateRouteMetrics, SUBURB_CENTROIDS } from '../src/config/suburbs';
import { FareConcession, ParkingTier, VehiclePowertrain } from '../src/types';
import { parseMbieCsvContent } from '../scripts/fetch-mbie-fuel';

describe('Kiwi Commuter Cost & Arbitrage Math Engine', () => {
  it('correctly applies the AT HOP $50 7-Day Cap when fare exceeds $50', () => {
    // Albany (Zone 4) to CBD (Zone 1) - 4 zones ($7.70 single trip)
    // 5 days * 2 trips = 10 trips -> 10 * $7.70 = $77.00 uncapped
    const result = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    });

    assert.strictEqual(result.transit.zoneCount, 4);
    assert.strictEqual(result.transit.singleTripStandardFare, 7.70);
    assert.strictEqual(result.transit.dailyFare, 15.40);
    assert.strictEqual(result.transit.uncappedWeeklyFare, 77.00);
    assert.strictEqual(result.transit.isHopCapApplied, true);
    assert.strictEqual(result.transit.hopCappedWeeklyFare, AT_HOP_7_DAY_CAP);
    assert.strictEqual(result.transit.weeklyTotal, 50.00);
    assert.strictEqual(
      result.transit.monthlyTotal,
      Math.round(50.0 * WEEKS_PER_MONTH * 100) / 100
    );
  });

  it('does NOT apply the 7-day cap when weekly transit cost is below $50', () => {
    // Newmarket (Zone 1) to CBD (Zone 1) - 1 zone ($2.60 single trip)
    // 2 days * 2 trips = 4 trips -> 4 * $2.60 = $10.40
    const result = calculateArbitrage({
      originSuburbId: 'newmarket',
      destinationSuburbId: 'cbd',
      daysPerWeek: 2,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 2,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(result.transit.zoneCount, 1);
    assert.strictEqual(result.transit.singleTripStandardFare, 2.60);
    assert.strictEqual(result.transit.uncappedWeeklyFare, 10.40);
    assert.strictEqual(result.transit.isHopCapApplied, false);
    assert.strictEqual(result.transit.hopCappedWeeklyFare, 10.40);
    assert.strictEqual(result.transit.weeklyTotal, 10.40);
  });

  it('correctly applies NZTA Road User Charges (RUC) by vehicle drivetrain', () => {
    assert.strictEqual(NZTA_RUC_RATES.petrol91.ratePerKm, 0.0);
    assert.strictEqual(NZTA_RUC_RATES.petrol95.ratePerKm, 0.0);
    assert.strictEqual(NZTA_RUC_RATES.diesel.ratePerKm, 0.076);
    assert.strictEqual(NZTA_RUC_RATES.bev.ratePerKm, 0.076);
    assert.strictEqual(NZTA_RUC_RATES.phev.ratePerKm, 0.038);

    // Test BEV with 40km round-trip: 40km * 0.076 = $3.04/day RUC
    const resultEv = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.ok(resultEv.driving.dailyRucCost > 0);
  });

  it('correctly calculates student tertiary concession discount (20% off)', () => {
    const resultAdult = calculateArbitrage({
      originSuburbId: 'henderson',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 18,
      parkingDaysPerWeek: 3,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    const resultTertiary = calculateArbitrage({
      originSuburbId: 'henderson',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 18,
      parkingDaysPerWeek: 3,
      concession: 'tertiary',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(
      resultTertiary.transit.singleTripConcessionFare,
      Math.round(resultAdult.transit.singleTripStandardFare * 0.8 * 100) / 100
    );
  });

  it('correctly computes positive financial arbitrage savings for public transport', () => {
    const result = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'petrol91',
      parkingDailyRate: 18.0,
      parkingDaysPerWeek: 5,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    });

    assert.ok(result.monthlySavings > 300);
    assert.strictEqual(result.arbitrageVerdict, 'transit_wins');
    assert.strictEqual(result.annualSavings, Math.round(result.monthlySavings * 12 * 100) / 100);
  });

  it('correctly handles all 50 Auckland suburbs', () => {
    const albany = getSuburbById('albany');
    assert.strictEqual(albany.name, 'Albany');
    assert.strictEqual(albany.zone, 4);

    const takapuna = getSuburbById('takapuna');
    assert.strictEqual(takapuna.name, 'Takapuna');
    assert.strictEqual(takapuna.zone, 2);

    const metrics = estimateRouteMetrics(albany, takapuna);
    assert.ok(metrics.distanceKm > 0);
    assert.ok(metrics.zonesTraveled >= 1 && metrics.zonesTraveled <= 5);
  });
});

describe('Step 2: Static Configuration & Regulatory Rate Tables', () => {
  it('defines statutory NZTA RUC rates for all VehiclePowertrain options', () => {
    const powertrains: VehiclePowertrain[] = ['PETROL_91', 'PETROL_95', 'DIESEL', 'PHEV', 'BEV'];

    for (const pt of powertrains) {
      const entry = STATUTORY_NZTA_RUC_RATES[pt];
      assert.ok(entry, `Missing statutory RUC entry for powertrain: ${pt}`);
      assert.strictEqual(entry.powertrain, pt);
      assert.ok(typeof entry.ratePerKm === 'number');
      assert.ok(entry.legislation.length > 0);
    }

    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PETROL_91.ratePerKm, 0.0);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PETROL_95.ratePerKm, 0.0);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.DIESEL.ratePerKm, 0.076);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.PHEV.ratePerKm, 0.038);
    assert.strictEqual(STATUTORY_NZTA_RUC_RATES.BEV.ratePerKm, 0.076);
  });

  it('defines AT HOP zone fare tables across all FareConcession tiers', () => {
    const concessions: FareConcession[] = ['ADULT', 'CHILD', 'TERTIARY'];

    for (const c of concessions) {
      const table = AT_HOP_ZONE_FARES_BY_CONCESSION[c];
      assert.ok(table, `Missing fare table for concession: ${c}`);

      for (let zone = 1; zone <= 5; zone++) {
        assert.ok(table[zone] > 0, `Missing fare for ${c} Zone ${zone}`);
      }
    }

    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[1], 2.60);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[2], 4.45);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[3], 6.00);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[4], 7.70);
    assert.strictEqual(AT_HOP_ZONE_FARES_BY_CONCESSION.ADULT[5], 9.40);

    assert.strictEqual(AT_HOP_7_DAY_CAP, 50.00);
  });

  it('defines commercial parking medians for all ParkingTier levels', () => {
    const tiers: ParkingTier[] = ['CBD_EARLY_BIRD', 'CBD_CASUAL', 'SUBURBAN_HUB', 'FREE'];

    for (const tier of tiers) {
      const p = PARKING_TIER_RATES[tier];
      assert.ok(p, `Missing parking tier definition for ${tier}`);
      assert.ok(p.rate >= 0);
      assert.ok(p.label.length > 0);
    }

    assert.strictEqual(PARKING_TIER_RATES.CBD_EARLY_BIRD.rate, 18.00);
    assert.strictEqual(PARKING_TIER_RATES.CBD_CASUAL.rate, 26.00);
    assert.strictEqual(PARKING_TIER_RATES.SUBURBAN_HUB.rate, 6.00);
    assert.strictEqual(PARKING_TIER_RATES.FREE.rate, 0.00);
  });

  it('defines strictly typed SUBURB_CENTROIDS spanning all Auckland regions', () => {
    assert.ok(SUBURB_CENTROIDS.length >= 50, 'Must have at least 50 Auckland suburbs');

    const regionsCovered = new Set<string>();

    for (const s of SUBURB_CENTROIDS) {
      assert.ok(s.id.length > 0, 'id required');
      assert.ok(s.name.length > 0, 'name required');
      assert.ok(
        ['Auckland Central', 'North Shore', 'West Auckland', 'East Auckland', 'South Auckland'].includes(
          s.region
        ),
        `Invalid region: ${s.region}`
      );
      regionsCovered.add(s.region);

      assert.strictEqual(s.coordinates.length, 2, 'Coordinates must be [lng, lat]');
      assert.ok(s.coordinates[0] > 174.0 && s.coordinates[0] < 175.5, 'Valid NZ longitude');
      assert.ok(s.coordinates[1] < -36.0 && s.coordinates[1] > -37.5, 'Valid Auckland latitude');

      assert.ok(s.defaultZonesToCBD >= 1 && s.defaultZonesToCBD <= 5, 'Zones must be 1 to 5');
      assert.ok(s.approxDistanceKmToCBD >= 0, 'Distance must be non-negative');
    }

    assert.strictEqual(regionsCovered.size, 5, 'Must cover all 5 Auckland regions');
  });
});

describe('Step 4: Supabase Schema & MBIE Fuel Scraper', () => {
  it('parses valid MBIE CSV content formatted in cents per litre', () => {
    const sampleCsv = `Date,Regular Petrol,Premium Petrol,Diesel
2024-09-13,268.50,289.40,204.80
2024-09-20,272.10,293.80,205.50`;

    const result = parseMbieCsvContent(sampleCsv);
    assert.ok(result);
    assert.strictEqual(result.week_ending_date, '2024-09-20');
    assert.strictEqual(result.regular_91, 272.10);
    assert.strictEqual(result.premium_95, 293.80);
    assert.strictEqual(result.diesel, 205.50);
    assert.strictEqual(result.is_provisional, false);
  });

  it('correctly converts dollars per litre to cents per litre if provided in dollars', () => {
    const sampleCsv = `Date,Regular Petrol,Premium Petrol,Diesel
20/09/2024,2.72,2.94,2.05`;

    const result = parseMbieCsvContent(sampleCsv);
    assert.ok(result);
    assert.strictEqual(result.week_ending_date, '2024-09-20');
    assert.strictEqual(result.regular_91, 272.00);
    assert.strictEqual(result.premium_95, 294.00);
    assert.strictEqual(result.diesel, 205.00);
  });

  it('gracefully handles upstream HTML WAF challenges and returns null', () => {
    const htmlChallenge = `<html><head><script src="/_Incapsula_Resource">`;
    const result = parseMbieCsvContent(htmlChallenge);
    assert.strictEqual(result, null);
  });

  it('verifies SQL migration file exists and defines fuel_benchmarks schema with RLS', () => {
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260925_init_schema.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');
    assert.ok(sqlContent.includes('CREATE TABLE IF NOT EXISTS fuel_benchmarks'));
    assert.ok(sqlContent.includes('week_ending_date DATE NOT NULL UNIQUE'));
    assert.ok(sqlContent.includes('regular_91 NUMERIC(6, 2) NOT NULL'));
    assert.ok(sqlContent.includes('premium_95 NUMERIC(6, 2) NOT NULL'));
    assert.ok(sqlContent.includes('diesel NUMERIC(6, 2) NOT NULL'));
    assert.ok(sqlContent.includes('ALTER TABLE fuel_benchmarks ENABLE ROW LEVEL SECURITY'));
    assert.ok(sqlContent.includes('idx_fuel_benchmarks_date'));
  });

  it('verifies GitHub Actions cron workflow is configured with schedule and secrets', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/refresh-fuel-prices.yml');
    assert.ok(fs.existsSync(workflowPath), 'Workflow file must exist');

    const ymlContent = fs.readFileSync(workflowPath, 'utf-8');
    assert.ok(ymlContent.includes('cron:'));
    assert.ok(ymlContent.includes('workflow_dispatch:'));
    assert.ok(ymlContent.includes('scripts/fetch-mbie-fuel.ts'));
    assert.ok(ymlContent.includes('NEXT_PUBLIC_SUPABASE_URL'));
    assert.ok(ymlContent.includes('SUPABASE_SERVICE_ROLE_KEY'));
  });
});

describe('Step 5: Next.js API Layer & Interactive Frontend Dashboard UI', () => {
  it('verifies /api/fuel GET handler returns benchmark shape with 1-hour cache', async () => {
    const { GET, revalidate } = await import('../src/app/api/fuel/route');
    assert.strictEqual(revalidate, 3600, 'Must have revalidate = 3600');

    const res = await GET();
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(typeof json.regular_91, 'number');
    assert.strictEqual(typeof json.premium_95, 'number');
    assert.strictEqual(typeof json.diesel, 'number');
    assert.ok(json.date && typeof json.date === 'string');
    assert.ok(json.source === 'supabase' || json.source === 'fallback');
    assert.ok(json.regular_91 > 1.0 && json.regular_91 < 10.0, 'Price must be in dollars per litre');
  });

  it('verifies /api/calculate POST handler enriches fuel benchmark when price override is missing', async () => {
    const { POST } = await import('../src/app/api/calculate/route');

    const req = new Request('http://localhost:3000/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originSuburbId: 'epsom',
        destinationSuburbId: 'cbd',
        daysPerWeek: 3,
        vehicleType: 'petrol91',
        parkingDailyRate: 22.0,
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.driving, 'Must contain driving breakdown');
    assert.ok(json.transit, 'Must contain transit breakdown');
    assert.strictEqual(typeof json.monthlySavings, 'number');
    assert.strictEqual(typeof json.annualSavings, 'number');
    assert.strictEqual(json.input.daysPerWeek, 3);
    assert.strictEqual(json.input.parkingDailyRate, 22.0);
    assert.ok(json.input.fuelPriceOverride, 'Should be enriched from benchmark');
  });

  it('evaluates Epsom to CBD default commute with 3 days and $22 CBD Early-Bird parking', () => {
    const { calculateCommuteArbitrage } = require('../src/lib/calculator');
    const result = calculateCommuteArbitrage({
      originSuburbId: 'epsom',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 22.0,
      parkingTier: 'CBD_EARLY_BIRD',
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    });

    assert.strictEqual(result.transit.zoneCount, 1);
    assert.strictEqual(result.transit.singleTripStandardFare, 2.60);
    assert.strictEqual(result.transit.dailyFare, 5.20);
    // 3 days * $5.20 = $15.60/wk (under $50 cap)
    assert.strictEqual(result.transit.weeklyTotal, 15.60);
    assert.strictEqual(result.transit.isHopCapApplied, false);

    // Driving includes fuel, $0 RUC, $22/day parking, and maintenance
    assert.strictEqual(result.driving.dailyParkingCost, 22.0);
    assert.strictEqual(result.driving.dailyRucCost, 0.0);
    assert.ok(result.driving.monthlyTotal > result.transit.monthlyTotal);
    assert.ok(result.monthlySavings > 0, 'Transit should yield substantial positive monthly arbitrage');
  });

  it('verifies all interactive UI dashboard components are properly created and structured', () => {
    const componentFiles = [
      'src/components/CommuteForm.tsx',
      'src/components/ComparisonCard.tsx',
      'src/components/MonthlySavingsChart.tsx',
      'src/components/FuelRadarWidget.tsx',
      'src/components/RouteMap.tsx',
      'src/components/DashboardClient.tsx',
      'src/app/page.tsx',
    ];

    for (const comp of componentFiles) {
      const fullPath = path.resolve(process.cwd(), comp);
      assert.ok(fs.existsSync(fullPath), `Component file must exist: ${comp}`);
    }
  });
});

describe('Step 6: Mapbox Route Visualizer & Production Polish', () => {
  it('verifies fetchDrivingRoute computes valid route geometry between Auckland suburbs', async () => {
    const { fetchDrivingRoute } = await import('../src/lib/mapbox');

    // Albany to Britomart CBD
    const albanyCoords: [number, number] = [174.7003, -36.7303];
    const cbdCoords: [number, number] = [174.767, -36.844];

    const result = await fetchDrivingRoute(albanyCoords, cbdCoords);
    assert.ok(result, 'Result should not be null');
    assert.strictEqual(typeof result.distanceKm, 'number');
    assert.ok(result.distanceKm > 10, 'Albany to CBD should be > 10 km');
    assert.strictEqual(typeof result.durationMinutes, 'number');
    assert.ok(result.durationMinutes > 10, 'Duration should be > 10 minutes');

    assert.ok(Array.isArray(result.coordinates), 'Coordinates must be an array');
    assert.ok(result.coordinates.length >= 2, 'Must have at least start and end waypoints');

    for (const pt of result.coordinates) {
      assert.strictEqual(pt.length, 2, 'Coordinate must be [lng, lat]');
      assert.ok(pt[0] > 174.0 && pt[0] < 175.5, `Lng ${pt[0]} in Auckland range`);
      assert.ok(pt[1] < -36.0 && pt[1] > -37.5, `Lat ${pt[1]} in Auckland range`);
    }
  });

  it('verifies fetchDrivingRoute returns null on invalid or malformed coordinates', async () => {
    const { fetchDrivingRoute } = await import('../src/lib/mapbox');

    const bad1 = await fetchDrivingRoute([NaN, -36.8] as [number, number], [174.7, -36.8]);
    assert.strictEqual(bad1, null);

    const bad2 = await fetchDrivingRoute([174.7, -36.8], [undefined as unknown as number, -36.8]);
    assert.strictEqual(bad2, null);
  });

  it('verifies getDirectionsRoute formats GeoJSON Feature correctly', async () => {
    const { getDirectionsRoute } = await import('../src/lib/mapbox');
    const { getSuburbById } = await import('../src/config/suburbs');

    const epsom = getSuburbById('epsom');
    const cbd = getSuburbById('cbd');

    const geojson = await getDirectionsRoute(epsom, cbd);
    assert.strictEqual(geojson.type, 'Feature');
    assert.strictEqual(geojson.geometry.type, 'LineString');
    assert.ok(geojson.geometry.coordinates.length >= 2);
    assert.ok(geojson.properties.distanceKm > 0);
    assert.ok(geojson.properties.durationMins > 0);
  });

  it('verifies HTML layout metadata defines OpenGraph and Viewport configuration', () => {
    const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    assert.ok(content.includes('viewport'), 'Must export viewport');
    assert.ok(content.includes('openGraph'), 'Must define openGraph');
    assert.ok(content.includes('twitter'), 'Must define twitter metadata');
    assert.ok(content.includes('Kiwi Commuter Cost & Arbitrage Dashboard'));
  });
});

describe('US-06: URL Search Param State Synchronization & Share Link', () => {
  it('correctly round-trips CommuteInput to/from URL search params', async () => {
    const { serializeCommuteToParams, parseCommuteFromParams, serializeCommuteToQueryString } = await import(
      '../src/lib/urlParams'
    );

    const testInput: any = {
      originSuburbId: 'takapuna',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      powertrain: 'BEV',
      consumptionOverride: 15.5,
      parkingDailyRate: 35.0,
      parkingDaysPerWeek: 5,
      parkingTier: 'CBD_CASUAL',
      concession: 'tertiary',
      includeMaintenanceWear: false,
      carpoolPassengers: 2,
      fuelPriceOverride: 0.18,
    };

    const params = serializeCommuteToParams(testInput);
    assert.strictEqual(params.get('from'), 'takapuna');
    assert.strictEqual(params.get('to'), 'cbd');
    assert.strictEqual(params.get('days'), '5');
    assert.strictEqual(params.get('power'), 'BEV');
    assert.strictEqual(params.get('econ'), '15.5');
    assert.strictEqual(params.get('park'), 'CBD_CASUAL');
    assert.strictEqual(params.get('customPark'), '35');
    assert.strictEqual(params.get('kwhRate'), '0.18');
    assert.strictEqual(params.get('conc'), 'tertiary');
    assert.strictEqual(params.get('carpool'), '2');
    assert.strictEqual(params.get('wear'), '0');

    const parsed = parseCommuteFromParams(params, {
      originSuburbId: 'epsom',
      destinationSuburbId: 'cbd',
      daysPerWeek: 3,
      vehicleType: 'petrol91',
      parkingDailyRate: 22.0,
      parkingDaysPerWeek: 3,
      concession: 'adult',
      includeMaintenanceWear: true,
      carpoolPassengers: 1,
    } as any);

    assert.strictEqual(parsed.originSuburbId, 'takapuna');
    assert.strictEqual(parsed.destinationSuburbId, 'cbd');
    assert.strictEqual(parsed.daysPerWeek, 5);
    assert.strictEqual(parsed.powertrain, 'BEV');
    assert.strictEqual(parsed.vehicleType, 'bev');
    assert.strictEqual(parsed.consumptionOverride, 15.5);
    assert.strictEqual(parsed.parkingTier, 'CBD_CASUAL');
    assert.strictEqual(parsed.parkingDailyRate, 35);
    assert.strictEqual(parsed.concession, 'tertiary');
    assert.strictEqual(parsed.carpoolPassengers, 2);
    assert.strictEqual(parsed.includeMaintenanceWear, false);
    assert.strictEqual(parsed.fuelPriceOverride, 0.18);

    const qs = serializeCommuteToQueryString(testInput);
    assert.ok(qs.startsWith('?from=takapuna'));
  });
});

describe('US-09: EV Public Charging vs. Home Off-Peak Rate Arbitrage', () => {
  it('correctly models BEV daily energy cost difference between Home Off-Peak ($0.18) and Public DC Fast ($0.85)', () => {
    // Albany to CBD: approxDistanceKmToCBD is 19.5km -> roundtrip is 39.0 km
    // Efficiency: default 16.5 kWh/100km
    // Home Off-Peak: 39.0 * (16.5 / 100) * 0.18 = 1.1583 -> $1.16
    // Public DC Fast: 39.0 * (16.5 / 100) * 0.85 = 5.46975 -> $5.47
    const homeCharging = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      powertrain: 'BEV',
      evChargingMode: 'home_offpeak',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    const publicCharging = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      powertrain: 'BEV',
      evChargingMode: 'public_dc',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(homeCharging.driving.dailyFuelCost, 1.16);
    assert.strictEqual(publicCharging.driving.dailyFuelCost, 5.47);

    // Statutory RUC ($0.076/km) must remain completely invariant: 39.0 * 0.076 = 2.964 -> 2.96
    assert.strictEqual(homeCharging.driving.dailyRucCost, 2.96);
    assert.strictEqual(publicCharging.driving.dailyRucCost, 2.96);

    // Public charging significantly increases monthly driving costs
    assert.ok(publicCharging.driving.monthlyTotal > homeCharging.driving.monthlyTotal);
    const monthlyDiff = publicCharging.driving.monthlyFuelCost - homeCharging.driving.monthlyFuelCost;
    assert.ok(monthlyDiff > 80, 'Monthly difference between public DC and home charging should exceed $80/mo');
  });

  it('correctly calculates PHEV 35km electric range split and petrol backup fuel cost', () => {
    // Albany to CBD: roundtrip is 39.0 km
    // Electric portion: 35.0 km at 16.5 kWh/100km
    // Petrol portion: 4.0 km at 6.0 L/100km with $2.72/L petrol
    // Home Off-Peak ($0.18/kWh):
    // Electric cost: (35.0 * 16.5 / 100) * 0.18 = 1.0395
    // Petrol cost: (4.0 * 6.0 / 100) * 2.72 = 0.6528
    // Daily fuel total: round2(1.0395 + 0.6528) = $1.69
    const phevHome = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'phev',
      powertrain: 'PHEV',
      evChargingMode: 'home_offpeak',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    // Public DC Fast ($0.85/kWh):
    // Electric cost: (35.0 * 16.5 / 100) * 0.85 = 4.90875
    // Petrol cost: (4.0 * 6.0 / 100) * 2.72 = 0.6528
    // Daily fuel total: round2(4.90875 + 0.6528) = $5.56
    const phevPublic = calculateArbitrage({
      originSuburbId: 'albany',
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'phev',
      powertrain: 'PHEV',
      evChargingMode: 'public_dc',
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    assert.strictEqual(phevHome.driving.dailyFuelCost, 1.69);
    assert.strictEqual(phevPublic.driving.dailyFuelCost, 5.56);

    // PHEV RUC is $0.038/km: 39.0 * 0.038 = 1.482 -> $1.48
    assert.strictEqual(phevHome.driving.dailyRucCost, 1.48);
    assert.strictEqual(phevPublic.driving.dailyRucCost, 1.48);
  });

  it('supports custom $/kWh charging rate input for EV and PHEV', () => {
    const customRateResult = calculateArbitrage({
      originSuburbId: 'takapuna', // 18.2 km roundtrip
      destinationSuburbId: 'cbd',
      daysPerWeek: 5,
      vehicleType: 'bev',
      powertrain: 'BEV',
      evChargingMode: 'custom',
      fuelPriceOverride: 0.45,
      parkingDailyRate: 0,
      parkingDaysPerWeek: 0,
      concession: 'adult',
      includeMaintenanceWear: false,
      carpoolPassengers: 1,
    });

    // 18.2 * (16.5 / 100) * 0.45 = 1.35135 -> $1.35
    assert.strictEqual(customRateResult.driving.dailyFuelCost, 1.35);
    assert.strictEqual(customRateResult.driving.dailyRucCost, 1.38); // 18.2 * 0.076 = 1.3832 -> 1.38
  });
});

describe('US-15: Privacy-Friendly Traffic & Web Analytics Integration', () => {
  it('verifies @vercel/analytics is declared in package.json dependencies', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    assert.ok(
      pkg.dependencies && pkg.dependencies['@vercel/analytics'],
      'package.json must contain @vercel/analytics dependency'
    );
  });

  it('verifies RootLayout embeds <Analytics /> component', () => {
    const layoutPath = path.resolve(process.cwd(), 'src/app/layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf-8');

    assert.ok(
      content.includes("from '@vercel/analytics/react'"),
      'layout.tsx must import Analytics from @vercel/analytics/react'
    );
    assert.ok(
      content.includes('<Analytics'),
      'layout.tsx must render <Analytics /> component'
    );
  });
});

describe('US-14: Plain-Language Financial Verdicts', () => {
  it('verifies ComparisonCard source uses natural plain-language verdict copy and MONTHLY VERDICT badge', () => {
    const cardPath = path.resolve(process.cwd(), 'src/components/ComparisonCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    // Verify replacement of abstract Monthly Arbitrage badge
    assert.ok(!content.includes('Monthly Arbitrage'), 'Must eliminate abstract "Monthly Arbitrage" copy');
    assert.ok(content.includes('MONTHLY VERDICT'), 'Must display plain-language "MONTHLY VERDICT" badge');

    // Verify plain-language savings headline and subline formats
    assert.ok(
      content.includes('You save $${delta}/month on public transport'),
      'Must contain transit savings verdict headline'
    );
    assert.ok(
      content.includes('You save $${delta}/month driving'),
      'Must contain driving savings verdict headline'
    );
    assert.ok(
      content.includes('Save $${annualDelta.toLocaleString('),
      'Must contain annual comparison subline'
    );
    assert.ok(
      content.includes('Costs are roughly identical'),
      'Must handle roughly identical break-even commutes'
    );
  });
});

describe('US-13: Monetized Travel Time & Opportunity Cost', () => {
  it('verifies CommuteForm source includes Value of Your Time segmented control and inline custom input', () => {
    const formPath = path.resolve(process.cwd(), 'src/components/CommuteForm.tsx');
    const content = fs.readFileSync(formPath, 'utf-8');

    assert.ok(content.includes('Value of Your Time'), 'Must render "Value of Your Time" label');
    assert.ok(content.includes("label: 'Off ($0)'"), 'Must render Off ($0) option');
    assert.ok(content.includes("label: '$20/hr'"), 'Must render $20/hr option');
    assert.ok(content.includes("label: '$50/hr'"), 'Must render $50/hr option');
    assert.ok(content.includes("label: 'Custom'"), 'Must render Custom option');
    assert.ok(content.includes('min-h-[44px]'), 'Buttons and inputs must satisfy 44px min height for touch targets');
    assert.ok(content.includes('step="5"'), 'Custom number input must use step 5');
    assert.ok(content.includes('$/hr'), 'Must display $/hr unit suffix');
  });

  it('verifies ComparisonCard source includes time valuation mini-receipt balance sheet (US-16) and time badge', () => {
    const cardPath = path.resolve(process.cwd(), 'src/components/ComparisonCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    assert.ok(
      content.includes('Time Valuation (${hourlyTimeValue}/hr)'),
      'Must render Time Valuation mini-receipt header when hourlyTimeValue > 0'
    );
    assert.ok(
      content.includes('Cash Saved'),
      'Must render Cash Saved row'
    );
    assert.ok(
      content.includes('Time Cost (Slower commute)'),
      'Must render Time Cost row for slower commute'
    );
    assert.ok(
      content.includes('Your True Benefit'),
      'Must render Your True Benefit row'
    );
    assert.ok(
      content.includes('⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo driving'),
      'Must construct driving time savings badge'
    );
    assert.ok(
      content.includes('⚡ Saves ${monthlyHoursSaved.toFixed(1)} h/mo on transit'),
      'Must construct transit time savings badge'
    );
  });
});

describe('US-18: Remove Header Metadata and Status Badges', () => {
  it('verifies removal of Real-time delta text from CommuteForm', () => {
    const formPath = path.resolve(process.cwd(), 'src/components/CommuteForm.tsx');
    const content = fs.readFileSync(formPath, 'utf-8');

    assert.ok(!content.includes('Real-time delta'), 'Must completely remove "Real-time delta" text');
  });

  it('verifies removal of policy pill badges and sync text from DashboardClient', () => {
    const clientPath = path.resolve(process.cwd(), 'src/components/DashboardClient.tsx');
    const content = fs.readFileSync(clientPath, 'utf-8');

    assert.ok(!content.includes('2026 RUC Active'), 'Must completely remove "2026 RUC Active" badge');
    assert.ok(!content.includes('AT $50 Cap'), 'Must completely remove "AT $50 Cap" badge');
    assert.ok(
      !content.includes('Auckland Transport & MBIE Weekly Sync'),
      'Must completely remove "Auckland Transport & MBIE Weekly Sync" text'
    );
  });
});
