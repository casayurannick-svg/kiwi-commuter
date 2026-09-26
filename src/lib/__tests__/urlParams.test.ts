import assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseCommuteFromParams, serializeCommuteToParams, serializeCommuteToQueryString } from '../urlParams';
import { CommuteInput } from '@/types';

describe('src/lib/urlParams.ts - URL Search Param Synchronization', () => {
  const defaultFallback: CommuteInput = {
    originSuburbId: 'epsom',
    destinationSuburbId: 'cbd',
    daysPerWeek: 3,
    vehicleType: 'petrol91',
    powertrain: 'PETROL_91',
    consumptionOverride: 7.6,
    parkingDailyRate: 22.0,
    parkingDaysPerWeek: 3,
    parkingTier: 'CBD_EARLY_BIRD',
    concession: 'adult',
    includeMaintenanceWear: true,
    carpoolPassengers: 1,
    fuelPriceOverride: 2.72,
  };

  it('serializes a standard commute input to URLSearchParams', () => {
    const params = serializeCommuteToParams(defaultFallback);

    assert.strictEqual(params.get('from'), 'epsom');
    assert.strictEqual(params.get('to'), 'cbd');
    assert.strictEqual(params.get('days'), '3');
    assert.strictEqual(params.get('power'), 'PETROL_91');
    assert.strictEqual(params.get('econ'), '7.6');
    assert.strictEqual(params.get('park'), 'CBD_EARLY_BIRD');
    assert.strictEqual(params.get('customPark'), '22');
    assert.strictEqual(params.get('fuelRate'), '2.72');
  });

  it('serializes an electric vehicle (BEV) with kwhRate', () => {
    const bevInput: CommuteInput = {
      ...defaultFallback,
      originSuburbId: 'albany',
      vehicleType: 'bev',
      powertrain: 'BEV',
      consumptionOverride: 16.5,
      fuelPriceOverride: 0.18,
      concession: 'tertiary',
      carpoolPassengers: 2,
    };

    const params = serializeCommuteToParams(bevInput);

    assert.strictEqual(params.get('from'), 'albany');
    assert.strictEqual(params.get('power'), 'BEV');
    assert.strictEqual(params.get('econ'), '16.5');
    assert.strictEqual(params.get('kwhRate'), '0.18');
    assert.strictEqual(params.get('conc'), 'tertiary');
    assert.strictEqual(params.get('carpool'), '2');
    assert.strictEqual(params.has('fuelRate'), false);
  });

  it('parses URL search params into a valid CommuteInput', () => {
    const search = new URLSearchParams('from=takapuna&to=britomart_cbd&days=5&power=BEV&econ=15.0&park=CUSTOM&customPark=18&kwhRate=0.20&conc=youth&carpool=2&wear=0');
    const parsed = parseCommuteFromParams(search, defaultFallback);

    assert.strictEqual(parsed.originSuburbId, 'takapuna');
    assert.strictEqual(parsed.destinationSuburbId, 'britomart_cbd');
    assert.strictEqual(parsed.daysPerWeek, 5);
    assert.strictEqual(parsed.powertrain, 'BEV');
    assert.strictEqual(parsed.vehicleType, 'bev');
    assert.strictEqual(parsed.consumptionOverride, 15.0);
    assert.strictEqual(parsed.fuelEconomy, 15.0);
    assert.strictEqual(parsed.parkingTier, 'CUSTOM');
    assert.strictEqual(parsed.parkingDailyRate, 18);
    assert.strictEqual(parsed.fuelPriceOverride, 0.20);
    assert.strictEqual(parsed.concession, 'youth');
    assert.strictEqual(parsed.carpoolPassengers, 2);
    assert.strictEqual(parsed.includeMaintenanceWear, false);
  });

  it('falls back to default values when search parameters are omitted or invalid', () => {
    const emptyParams = new URLSearchParams('');
    const parsed = parseCommuteFromParams(emptyParams, defaultFallback);

    assert.strictEqual(parsed.originSuburbId, 'epsom');
    assert.strictEqual(parsed.destinationSuburbId, 'cbd');
    assert.strictEqual(parsed.daysPerWeek, 3);
    assert.strictEqual(parsed.vehicleType, 'petrol91');
    assert.strictEqual(parsed.parkingDailyRate, 22.0);
    assert.strictEqual(parsed.concession, 'adult');
  });

  it('generates a formatted query string via serializeCommuteToQueryString', () => {
    const qs = serializeCommuteToQueryString(defaultFallback);
    assert.ok(qs.startsWith('?'));
    assert.ok(qs.includes('from=epsom'));
    assert.ok(qs.includes('to=cbd'));
  });

  it('serializes and parses evChargeMode correctly for EV and PHEV', () => {
    const bevWithPublicCharging: CommuteInput = {
      ...defaultFallback,
      vehicleType: 'bev',
      powertrain: 'BEV',
      evChargingSource: 'PUBLIC_DC',
      evChargingMode: 'public_dc',
      fuelPriceOverride: 0.85,
    };

    const params = serializeCommuteToParams(bevWithPublicCharging);
    assert.strictEqual(params.get('power'), 'BEV');
    assert.strictEqual(params.get('chargeSource'), 'PUBLIC_DC');
    assert.strictEqual(params.get('evChargeMode'), 'public_dc');
    assert.strictEqual(params.get('kwhRate'), '0.85');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.vehicleType, 'bev');
    assert.strictEqual(parsed.powertrain, 'BEV');
    assert.strictEqual(parsed.evChargingSource, 'PUBLIC_DC');
    assert.strictEqual(parsed.evChargingMode, 'public_dc');
    assert.strictEqual(parsed.fuelPriceOverride, 0.85);
  });

  it('serializes and parses hourlyTimeValue (timeRate) correctly', () => {
    const inputWithTimeVal: CommuteInput = {
      ...defaultFallback,
      hourlyTimeValue: 50,
    };

    const params = serializeCommuteToParams(inputWithTimeVal);
    assert.strictEqual(params.get('timeRate'), '50');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.hourlyTimeValue, 50);

    // Test backward compatibility with legacy 'timeVal' query param
    const legacyParams = new URLSearchParams('timeVal=35');
    const legacyParsed = parseCommuteFromParams(legacyParams, defaultFallback);
    assert.strictEqual(legacyParsed.hourlyTimeValue, 35);
  });

  it('serializes and parses transitMode and isWaihekeRoute correctly', () => {
    const inputWithFerry: CommuteInput = {
      ...defaultFallback,
      originSuburbId: 'waiheke',
      transitMode: 'FERRY',
      isWaihekeRoute: true,
    };

    const params = serializeCommuteToParams(inputWithFerry);
    assert.strictEqual(params.get('from'), 'waiheke');
    assert.strictEqual(params.get('transitMode'), 'FERRY');
    assert.strictEqual(params.get('waiheke'), '1');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.originSuburbId, 'waiheke');
    assert.strictEqual(parsed.transitMode, 'FERRY');
    assert.strictEqual(parsed.isWaihekeRoute, true);
  });

  it('serializes and parses US-23 micromobility scooter parameters correctly', () => {
    const inputWithScooter: CommuteInput = {
      ...defaultFallback,
      transitMode: 'MICROMOBILITY_TRANSIT',
      scooterOwnership: 'RENTAL',
      scooterCapitalCost: 950,
      walkDistanceKm: 2.5,
    };

    const params = serializeCommuteToParams(inputWithScooter);
    assert.strictEqual(params.get('transitMode'), 'MICROMOBILITY_TRANSIT');
    assert.strictEqual(params.get('scooterType'), 'RENTAL');
    assert.strictEqual(params.get('scooterCost'), '950');
    assert.strictEqual(params.get('walkKm'), '2.5');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.transitMode, 'MICROMOBILITY_TRANSIT');
    assert.strictEqual(parsed.scooterOwnership, 'RENTAL');
    assert.strictEqual(parsed.scooterCapitalCost, 950);
    assert.strictEqual(parsed.walkDistanceKm, 2.5);
  });

  it('US-36: serializes and parses exact addresses, coordinates, and route metrics', () => {
    const inputWithAddresses: CommuteInput = {
      ...defaultFallback,
      originAddress: '10 McAlister Place, Mount Roskill, Auckland',
      destinationAddress: '56 Parnell Road, Parnell, Auckland',
      originCoordinates: [174.73602, -36.90385],
      destinationCoordinates: [174.77881, -36.85764],
      firstMileMode: 'WALK',
      firstMileDistanceKm: 0.8,
      drivingDistanceKm: 17.5,
      drivingTimeMins: 24,
      transitTimeMins: 36,
    };

    const params = serializeCommuteToParams(inputWithAddresses);
    assert.strictEqual(params.get('fromAddress'), '10 McAlister Place, Mount Roskill, Auckland');
    assert.strictEqual(params.get('toAddress'), '56 Parnell Road, Parnell, Auckland');
    assert.strictEqual(params.get('fromCoords'), '174.73602,-36.90385');
    assert.strictEqual(params.get('toCoords'), '174.77881,-36.85764');
    assert.strictEqual(params.get('firstMileMode'), 'WALK');
    assert.strictEqual(params.get('firstMileDist'), '0.8');
    assert.strictEqual(params.get('driveDist'), '17.5');
    assert.strictEqual(params.get('driveTime'), '24');
    assert.strictEqual(params.get('transitTime'), '36');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.originAddress, '10 McAlister Place, Mount Roskill, Auckland');
    assert.strictEqual(parsed.destinationAddress, '56 Parnell Road, Parnell, Auckland');
    assert.deepStrictEqual(parsed.originCoordinates, [174.73602, -36.90385]);
    assert.deepStrictEqual(parsed.destinationCoordinates, [174.77881, -36.85764]);
    assert.strictEqual(parsed.firstMileMode, 'WALK');
    assert.strictEqual(parsed.firstMileDistanceKm, 0.8);
    assert.strictEqual(parsed.drivingDistanceKm, 17.5);
    assert.strictEqual(parsed.drivingTimeMins, 24);
    assert.strictEqual(parsed.transitTimeMins, 36);
  });

  it('US-36: resolves closest suburb centroid when only coordinates are provided without from/to suburb IDs', () => {
    // Devonport centroid: [174.7972, -36.8306]
    const search = new URLSearchParams('fromCoords=174.7972,-36.8306&toCoords=174.7633,-36.8485');
    const parsed = parseCommuteFromParams(search, defaultFallback);

    assert.strictEqual(parsed.originSuburbId, 'devonport');
    assert.strictEqual(parsed.destinationSuburbId, 'cbd');
    assert.deepStrictEqual(parsed.originCoordinates, [174.7972, -36.8306]);
    assert.deepStrictEqual(parsed.destinationCoordinates, [174.7633, -36.8485]);
  });
});
