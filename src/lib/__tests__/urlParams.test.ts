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
      evChargingMode: 'public_dc',
      fuelPriceOverride: 0.85,
    };

    const params = serializeCommuteToParams(bevWithPublicCharging);
    assert.strictEqual(params.get('power'), 'BEV');
    assert.strictEqual(params.get('evChargeMode'), 'public_dc');
    assert.strictEqual(params.get('kwhRate'), '0.85');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.vehicleType, 'bev');
    assert.strictEqual(parsed.powertrain, 'BEV');
    assert.strictEqual(parsed.evChargingMode, 'public_dc');
    assert.strictEqual(parsed.fuelPriceOverride, 0.85);
  });

  it('serializes and parses hourlyTimeValue (timeVal) correctly', () => {
    const inputWithTimeVal: CommuteInput = {
      ...defaultFallback,
      hourlyTimeValue: 50,
    };

    const params = serializeCommuteToParams(inputWithTimeVal);
    assert.strictEqual(params.get('timeVal'), '50');

    const parsed = parseCommuteFromParams(params, defaultFallback);
    assert.strictEqual(parsed.hourlyTimeValue, 50);
  });
});
