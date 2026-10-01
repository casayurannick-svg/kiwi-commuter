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
    assert.strictEqual(params.has('customPark'), false, 'customPark must be omitted when park is not CUSTOM');
    assert.strictEqual(params.has('kwhRate'), false, 'kwhRate must be omitted for combustion powertrain');
    assert.strictEqual(params.has('chargeSource'), false, 'chargeSource must be omitted for combustion powertrain');
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

  it('maps legacy parameter aliases (powertrain, distance, parking rates) for backward compatibility', () => {
    // Test powertrain legacy aliases
    const phevParams = new URLSearchParams('powertrain=plugin_hybrid');
    assert.strictEqual(parseCommuteFromParams(phevParams, defaultFallback).powertrain, 'PHEV');
    assert.strictEqual(parseCommuteFromParams(phevParams, defaultFallback).vehicleType, 'phev');

    const evParams = new URLSearchParams('drivetrain=electric');
    assert.strictEqual(parseCommuteFromParams(evParams, defaultFallback).powertrain, 'BEV');
    assert.strictEqual(parseCommuteFromParams(evParams, defaultFallback).vehicleType, 'bev');

    const hybridParams = new URLSearchParams('vehicle_type=hybrid');
    assert.strictEqual(parseCommuteFromParams(hybridParams, defaultFallback).powertrain, 'HEV');
    assert.strictEqual(parseCommuteFromParams(hybridParams, defaultFallback).vehicleType, 'hev');

    const petrol95Params = new URLSearchParams('power=premium');
    assert.strictEqual(parseCommuteFromParams(petrol95Params, defaultFallback).powertrain, 'PETROL_95');
    assert.strictEqual(parseCommuteFromParams(petrol95Params, defaultFallback).vehicleType, 'petrol95');

    // Test distance legacy aliases
    const dist1 = new URLSearchParams('driving_distance=32.4');
    assert.strictEqual(parseCommuteFromParams(dist1, defaultFallback).drivingDistanceKm, 32.4);

    const dist2 = new URLSearchParams('distance=18.6');
    assert.strictEqual(parseCommuteFromParams(dist2, defaultFallback).drivingDistanceKm, 18.6);

    const dist3 = new URLSearchParams('km=25');
    assert.strictEqual(parseCommuteFromParams(dist3, defaultFallback).drivingDistanceKm, 25);

    // Test parking rates and tier legacy aliases
    const parkRate1 = new URLSearchParams('parkingRate=27.5');
    assert.strictEqual(parseCommuteFromParams(parkRate1, defaultFallback).parkingDailyRate, 27.5);

    const parkRate2 = new URLSearchParams('parking_daily=30');
    assert.strictEqual(parseCommuteFromParams(parkRate2, defaultFallback).parkingDailyRate, 30);

    const parkRate3 = new URLSearchParams('parkingCost=19');
    assert.strictEqual(parseCommuteFromParams(parkRate3, defaultFallback).parkingDailyRate, 19);

    const parkTier1 = new URLSearchParams('parking_tier=early_bird');
    assert.strictEqual(parseCommuteFromParams(parkTier1, defaultFallback).parkingTier, 'CBD_EARLY_BIRD');

    const parkTier2 = new URLSearchParams('tier=casual');
    assert.strictEqual(parseCommuteFromParams(parkTier2, defaultFallback).parkingTier, 'CBD_CASUAL');

    const parkTier3 = new URLSearchParams('park=suburban');
    assert.strictEqual(parseCommuteFromParams(parkTier3, defaultFallback).parkingTier, 'SUBURBAN_HUB');
  });

  it('BUG-54: snaps Hobsonville coordinates to ferry terminal when transitMode is FERRY', () => {
    const ferryParams = new URLSearchParams('from=hobsonville&to=cbd&transitMode=FERRY');
    const parsed = parseCommuteFromParams(ferryParams, defaultFallback);
    assert.deepStrictEqual(
      parsed.originCoordinates,
      [174.6680, -36.7980],
      'Origin coordinates must snap to Hobsonville Point Ferry Terminal'
    );

    const busParams = new URLSearchParams('from=hobsonville&to=cbd&transitMode=BUS');
    const parsedBus = parseCommuteFromParams(busParams, defaultFallback);
    assert.deepStrictEqual(
      parsedBus.originCoordinates,
      [174.6590, -36.7920],
      'Origin coordinates must default to inland Hobsonville centroid for bus'
    );
  });

  describe('BUG-64: Clean up URL state hoarding and prune inactive query parameters', () => {
    it('omits customPark when park is not CUSTOM and serializes customPark when park is CUSTOM', () => {
      // Non-custom parking tiers
      const nonCustomTiers: Array<CommuteInput['parkingTier']> = [
        'CBD_EARLY_BIRD',
        'CBD_CASUAL',
        'SUBURBAN_HUB',
        'FREE',
      ];

      for (const tier of nonCustomTiers) {
        const input: CommuteInput = {
          ...defaultFallback,
          parkingTier: tier,
          parkingDailyRate: 35,
          customParkingDaily: 35,
        };
        const params = serializeCommuteToParams(input);
        assert.strictEqual(params.get('park'), tier);
        assert.strictEqual(
          params.has('customPark'),
          false,
          `customPark must be omitted when park is ${tier}`
        );
      }

      // CUSTOM parking tier
      const customInput: CommuteInput = {
        ...defaultFallback,
        parkingTier: 'CUSTOM',
        parkingDailyRate: 27.5,
        customParkingDaily: 27.5,
      };
      const customParams = serializeCommuteToParams(customInput);
      assert.strictEqual(customParams.get('park'), 'CUSTOM');
      assert.strictEqual(customParams.get('customPark'), '27.5');
    });

    it('omits wof, rego, ins, customIns, and wear when calcMode is IRD_TRUE_COST', () => {
      const irdInput: CommuteInput = {
        ...defaultFallback,
        calculationMode: 'IRD_TRUE_COST',
        annualWof: 85,
        annualRego: 173,
        insuranceEnabled: true,
        customInsurance: 1450,
        includeMaintenanceWear: false,
      };

      const params = serializeCommuteToParams(irdInput);
      assert.strictEqual(params.get('calcMode'), 'IRD_TRUE_COST');
      assert.strictEqual(params.has('wof'), false, 'wof must be omitted in IRD mode');
      assert.strictEqual(params.has('rego'), false, 'rego must be omitted in IRD mode');
      assert.strictEqual(params.has('ins'), false, 'ins must be omitted in IRD mode');
      assert.strictEqual(params.has('customIns'), false, 'customIns must be omitted in IRD mode');
      assert.strictEqual(params.has('wear'), false, 'wear must be omitted in IRD mode');
    });

    it('retains wof, rego, ins, customIns, and wear when calcMode is FUEL', () => {
      const fuelInput: CommuteInput = {
        ...defaultFallback,
        calculationMode: 'FUEL',
        annualWof: 90,
        annualRego: 180,
        insuranceEnabled: true,
        customInsurance: 1200,
        includeMaintenanceWear: false,
      };

      const params = serializeCommuteToParams(fuelInput);
      assert.strictEqual(params.has('calcMode'), false, 'FUEL is default calcMode and should not be serialized');
      assert.strictEqual(params.get('wof'), '90');
      assert.strictEqual(params.get('rego'), '180');
      assert.strictEqual(params.get('ins'), '1');
      assert.strictEqual(params.get('customIns'), '1200');
      assert.strictEqual(params.get('wear'), '0');
    });

    it('omits EV-specific parameters (chargeSource, evChargeMode, kwhRate) for non-EV/PHEV powertrains', () => {
      // Petrol 91 with leftover EV properties in state
      const petrolInput: CommuteInput = {
        ...defaultFallback,
        vehicleType: 'petrol91',
        powertrain: 'PETROL_91',
        evChargingSource: 'HOME_OFFPEAK',
        evChargingMode: 'home_offpeak',
        homeKWhRate: 0.18,
      };

      const petrolParams = serializeCommuteToParams(petrolInput);
      assert.strictEqual(petrolParams.has('chargeSource'), false, 'chargeSource must be omitted for Petrol');
      assert.strictEqual(petrolParams.has('evChargeMode'), false, 'evChargeMode must be omitted for Petrol');
      assert.strictEqual(petrolParams.has('kwhRate'), false, 'kwhRate must be omitted for Petrol');

      // HEV (conventional hybrid) with leftover EV properties
      const hevInput: CommuteInput = {
        ...defaultFallback,
        vehicleType: 'hev',
        powertrain: 'HEV',
        evChargingSource: 'HOME_OFFPEAK',
        evChargingMode: 'home_offpeak',
        homeKWhRate: 0.18,
      };

      const hevParams = serializeCommuteToParams(hevInput);
      assert.strictEqual(hevParams.has('chargeSource'), false, 'chargeSource must be omitted for HEV');
      assert.strictEqual(hevParams.has('evChargeMode'), false, 'evChargeMode must be omitted for HEV');
      assert.strictEqual(hevParams.has('kwhRate'), false, 'kwhRate must be omitted for HEV');

      // BEV must serialize EV properties
      const bevInput: CommuteInput = {
        ...defaultFallback,
        vehicleType: 'bev',
        powertrain: 'BEV',
        evChargingSource: 'PUBLIC_DC',
        evChargingMode: 'public_dc',
        homeKWhRate: 0.85,
      };

      const bevParams = serializeCommuteToParams(bevInput);
      assert.strictEqual(bevParams.get('chargeSource'), 'PUBLIC_DC');
      assert.strictEqual(bevParams.get('evChargeMode'), 'public_dc');
      assert.strictEqual(bevParams.get('kwhRate'), '0.85');

      // PHEV must serialize EV properties
      const phevInput: CommuteInput = {
        ...defaultFallback,
        vehicleType: 'phev',
        powertrain: 'PHEV',
        evChargingSource: 'HOME_OFFPEAK',
        homeKWhRate: 0.18,
      };

      const phevParams = serializeCommuteToParams(phevInput);
      assert.strictEqual(phevParams.get('chargeSource'), 'HOME_OFFPEAK');
      assert.strictEqual(phevParams.get('kwhRate'), '0.18');
    });

    it('verifies URL deserialization handles omitted parameters gracefully by falling back to standard defaults', () => {
      // 1. Parking tiers fallback to standard rates when customPark is omitted
      const casualParams = new URLSearchParams('park=CBD_CASUAL');
      const parsedCasual = parseCommuteFromParams(casualParams, defaultFallback);
      assert.strictEqual(parsedCasual.parkingTier, 'CBD_CASUAL');
      assert.strictEqual(parsedCasual.parkingDailyRate, 35, 'CBD_CASUAL should fall back to $35/day default');

      const earlyBirdParams = new URLSearchParams('park=CBD_EARLY_BIRD');
      const parsedEarlyBird = parseCommuteFromParams(earlyBirdParams, defaultFallback);
      assert.strictEqual(parsedEarlyBird.parkingTier, 'CBD_EARLY_BIRD');
      assert.strictEqual(parsedEarlyBird.parkingDailyRate, 22, 'CBD_EARLY_BIRD should fall back to $22/day default');

      const suburbanParams = new URLSearchParams('park=SUBURBAN_HUB');
      const parsedSuburban = parseCommuteFromParams(suburbanParams, defaultFallback);
      assert.strictEqual(parsedSuburban.parkingTier, 'SUBURBAN_HUB');
      assert.strictEqual(parsedSuburban.parkingDailyRate, 8, 'SUBURBAN_HUB should fall back to $8/day default');

      const freeParams = new URLSearchParams('park=FREE');
      const parsedFree = parseCommuteFromParams(freeParams, defaultFallback);
      assert.strictEqual(parsedFree.parkingTier, 'FREE');
      assert.strictEqual(parsedFree.parkingDailyRate, 0, 'FREE should fall back to $0/day default');

      // 2. IRD mode fallback to standard defaults when wof/rego/ins/wear are omitted
      const irdParams = new URLSearchParams('calcMode=IRD_TRUE_COST');
      const parsedIrd = parseCommuteFromParams(irdParams, {
        ...defaultFallback,
        annualWof: 85,
        annualRego: 173,
        insuranceEnabled: true,
        includeMaintenanceWear: true,
      });
      assert.strictEqual(parsedIrd.calculationMode, 'IRD_TRUE_COST');
      assert.strictEqual(parsedIrd.annualWof, 85);
      assert.strictEqual(parsedIrd.annualRego, 173);
      assert.strictEqual(parsedIrd.insuranceEnabled, true);
      assert.strictEqual(parsedIrd.includeMaintenanceWear, true);
    });
  });
});

