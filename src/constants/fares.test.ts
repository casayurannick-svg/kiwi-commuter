import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  FERRY_FARE_TIERS,
  FERRY_FARES,
  INNER_HARBOR_FERRY_FARE,
  MID_HARBOR_FERRY_FARE,
  OUTER_HARBOR_FERRY_FARE,
  INNER_HARBOUR_FERRY_FARE,
  MID_HARBOUR_FERRY_FARE,
  OUTER_HARBOUR_FERRY_FARE,
  getFerryFareTier,
  resolveFerryFareTier,
} from './fares';
import { calculateCommuteArbitrage } from '../lib/calculator';
import { calculateSingleTripTransitFare } from '../lib/fares';

describe('src/constants/fares.ts - Ferry Fare Tier Calibration', () => {
  it('calibrates Inner Harbor ferry fare to $7.80', () => {
    assert.strictEqual(INNER_HARBOR_FERRY_FARE, 7.80);
    assert.strictEqual(INNER_HARBOUR_FERRY_FARE, 7.80);
    assert.strictEqual(FERRY_FARES.innerHarbor, 7.80);
    assert.strictEqual(FERRY_FARES.innerHarbour, 7.80);
    assert.strictEqual(FERRY_FARE_TIERS.INNER_HARBOR.rate, 7.80);
    assert.strictEqual(FERRY_FARE_TIERS.INNER_HARBOR.capEligible, true);
  });

  it('calibrates Mid Harbor ferry fare to $10.40', () => {
    assert.strictEqual(MID_HARBOR_FERRY_FARE, 10.40);
    assert.strictEqual(MID_HARBOUR_FERRY_FARE, 10.40);
    assert.strictEqual(FERRY_FARES.midHarbor, 10.40);
    assert.strictEqual(FERRY_FARES.midHarbour, 10.40);
    assert.strictEqual(FERRY_FARE_TIERS.MID_HARBOR.rate, 10.40);
    assert.strictEqual(FERRY_FARE_TIERS.MID_HARBOR.capEligible, true);
  });

  it('calibrates Outer Harbor ferry fare to $13.80', () => {
    assert.strictEqual(OUTER_HARBOR_FERRY_FARE, 13.80);
    assert.strictEqual(OUTER_HARBOUR_FERRY_FARE, 13.80);
    assert.strictEqual(FERRY_FARES.outerHarbor, 13.80);
    assert.strictEqual(FERRY_FARES.outerHarbour, 13.80);
    assert.strictEqual(FERRY_FARE_TIERS.OUTER_HARBOR.rate, 13.80);
    assert.strictEqual(FERRY_FARE_TIERS.OUTER_HARBOR.capEligible, false);
  });

  it('verifies the full ferry fare tier matrix rates match calibration', () => {
    assert.deepStrictEqual(
      {
        innerHarbor: FERRY_FARE_TIERS.INNER_HARBOR.rate,
        midHarbor: FERRY_FARE_TIERS.MID_HARBOR.rate,
        outerHarbor: FERRY_FARE_TIERS.OUTER_HARBOR.rate,
      },
      {
        innerHarbor: 7.80,
        midHarbor: 10.40,
        outerHarbor: 13.80,
      }
    );
  });

  describe('Ferry Route & Terminal Tier Mapping', () => {
    it('explicitly maps Hobsonville Point identifiers and terminal to Mid Harbor ($10.40)', () => {
      // Suburb ID 'hobsonville' (as defined in src/config/suburbs.ts)
      const hobsonvilleTier = getFerryFareTier('hobsonville');
      assert.strictEqual(hobsonvilleTier.tier, 'MID_HARBOR');
      assert.strictEqual(hobsonvilleTier.rate, 10.40);
      assert.strictEqual(hobsonvilleTier.capEligible, true);

      // Alias 'hobsonville-point' and terminal station 'hobsonville-point-ferry'
      assert.strictEqual(getFerryFareTier('hobsonville-point').tier, 'MID_HARBOR');
      assert.strictEqual(getFerryFareTier('hobsonville-point').rate, 10.40);
      assert.strictEqual(getFerryFareTier('hobsonville-point-ferry').tier, 'MID_HARBOR');
      assert.strictEqual(getFerryFareTier('hobsonville-point-ferry').rate, 10.40);

      // Suburb centroid coordinates [174.6590, -36.7920] and ferry terminal coordinates [174.6680, -36.7980]
      const centroidTier = getFerryFareTier([174.6590, -36.7920]);
      assert.strictEqual(centroidTier.tier, 'MID_HARBOR');
      assert.strictEqual(centroidTier.rate, 10.40);

      const terminalCoordsTier = getFerryFareTier([174.6680, -36.7980]);
      assert.strictEqual(terminalCoordsTier.tier, 'MID_HARBOR');
      assert.strictEqual(terminalCoordsTier.rate, 10.40);
    });

    it('explicitly maps Half Moon Bay, Beach Haven, and West Harbour to Mid Harbor ($10.40)', () => {
      // Half Moon Bay
      const hmbTier = getFerryFareTier('half-moon-bay');
      assert.strictEqual(hmbTier.tier, 'MID_HARBOR');
      assert.strictEqual(hmbTier.rate, 10.40);
      assert.strictEqual(hmbTier.capEligible, true);
      assert.strictEqual(getFerryFareTier('half-moon-bay-ferry').tier, 'MID_HARBOR');
      assert.strictEqual(getFerryFareTier([174.9030, -36.8770]).tier, 'MID_HARBOR');

      // Beach Haven
      const bhTier = getFerryFareTier('beach-haven');
      assert.strictEqual(bhTier.tier, 'MID_HARBOR');
      assert.strictEqual(bhTier.rate, 10.40);
      assert.strictEqual(bhTier.capEligible, true);
      assert.strictEqual(getFerryFareTier('beach-haven-ferry').tier, 'MID_HARBOR');
      assert.strictEqual(getFerryFareTier([174.7000, -36.7970]).tier, 'MID_HARBOR');

      // West Harbour
      const whTier = getFerryFareTier('west-harbour');
      assert.strictEqual(whTier.tier, 'MID_HARBOR');
      assert.strictEqual(whTier.rate, 10.40);
      assert.strictEqual(whTier.capEligible, true);
      assert.strictEqual(getFerryFareTier('west-harbour-ferry').tier, 'MID_HARBOR');
      assert.strictEqual(getFerryFareTier([174.6300, -36.8150]).tier, 'MID_HARBOR');
    });

    it('explicitly maps Gulf Harbour and Pine Harbour to Outer Harbor ($13.80)', () => {
      // Gulf Harbour
      const ghTier = getFerryFareTier('gulf-harbour');
      assert.strictEqual(ghTier.tier, 'OUTER_HARBOR');
      assert.strictEqual(ghTier.rate, 13.80);
      assert.strictEqual(ghTier.capEligible, false);
      assert.strictEqual(getFerryFareTier([174.7870, -36.6130]).tier, 'OUTER_HARBOR');

      // Pine Harbour
      const phTier = getFerryFareTier('pine-harbour');
      assert.strictEqual(phTier.tier, 'OUTER_HARBOR');
      assert.strictEqual(phTier.rate, 13.80);
      assert.strictEqual(phTier.capEligible, false);
      assert.strictEqual(getFerryFareTier([175.0250, -36.8830]).tier, 'OUTER_HARBOR');
    });

    it('explicitly maps Devonport, Bayswater, Birkenhead, and Northcote Point to Inner Harbor ($7.80)', () => {
      assert.strictEqual(getFerryFareTier('devonport').tier, 'INNER_HARBOR');
      assert.strictEqual(getFerryFareTier('devonport').rate, 7.80);
      assert.strictEqual(getFerryFareTier('bayswater').tier, 'INNER_HARBOR');
      assert.strictEqual(getFerryFareTier('bayswater').rate, 7.80);
      assert.strictEqual(getFerryFareTier('birkenhead').tier, 'INNER_HARBOR');
      assert.strictEqual(getFerryFareTier('birkenhead').rate, 7.80);
      assert.strictEqual(getFerryFareTier('te-onewa-northcote-point').tier, 'INNER_HARBOR');
      assert.strictEqual(getFerryFareTier('te-onewa-northcote-point').rate, 7.80);
      assert.strictEqual(getFerryFareTier('northcote-point').tier, 'INNER_HARBOR');
    });

    it('resolves ferry fare tier via resolveFerryFareTier with suburb, step, and line parameters', () => {
      const hobsonvilleResolved = resolveFerryFareTier({
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(hobsonvilleResolved.tier, 'MID_HARBOR');
      assert.strictEqual(hobsonvilleResolved.rate, 10.40);

      const hmbResolved = resolveFerryFareTier({
        originSuburbId: 'cbd',
        destinationSuburbId: 'half-moon-bay',
      });
      assert.strictEqual(hmbResolved.tier, 'MID_HARBOR');
      assert.strictEqual(hmbResolved.rate, 10.40);

      const ghResolved = resolveFerryFareTier({
        originSuburbId: 'gulf-harbour',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(ghResolved.tier, 'OUTER_HARBOR');
      assert.strictEqual(ghResolved.rate, 13.80);

      const devonportResolved = resolveFerryFareTier({
        originSuburbId: 'devonport',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(devonportResolved.tier, 'INNER_HARBOR');
      assert.strictEqual(devonportResolved.rate, 7.80);
    });
  });

  describe('Calculator Integration - Hobsonville & Harbor Route Fare Calculation', () => {
    it('calculates single trip fare as $10.40 for Hobsonville Point route and applies the AT HOP $50 cap', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
        daysPerWeek: 5,
        vehicleType: 'petrol',
        parkingTier: 'cbd_early_bird',
        concession: 'adult',
      });

      // Verify single trip transit fare is $10.40 (Mid Harbor), NOT $7.80 (Inner Harbor)
      assert.strictEqual(result.transit.singleTripStandardFare, 10.40);
      assert.strictEqual(result.transit.singleTripConcessionFare, 10.40);

      // Daily return fare should be $20.80 ($10.40 * 2)
      assert.strictEqual(result.transit.dailyFare, 20.80);

      // Uncapped weekly fare for 5 days: 5 * $20.80 = $104.00
      assert.strictEqual(result.transit.uncappedWeeklyFare, 104.00);

      // Since Hobsonville Point is Mid Harbor (AT HOP cap eligible), the $50 7-day cap must apply
      assert.strictEqual(result.transit.isHopCapApplied, true);
      assert.strictEqual(result.transit.weeklyTotal, 50.00);
      assert.strictEqual(result.transit.hopCappedWeeklyFare, 50.00);
    });

    it('calculates single trip transit fare helper for Hobsonville and Outer Harbor correctly', () => {
      const hobsonvilleFare = calculateSingleTripTransitFare({
        zoneCount: 3,
        isFerry: true,
        isWaiheke: false,
        concession: 'adult',
        originSuburbId: 'hobsonville',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(hobsonvilleFare.singleTripStandardFare, 10.40);
      assert.strictEqual(hobsonvilleFare.isCapEligible, true);

      const devonportFare = calculateSingleTripTransitFare({
        zoneCount: 1,
        isFerry: true,
        isWaiheke: false,
        concession: 'adult',
        originSuburbId: 'devonport',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(devonportFare.singleTripStandardFare, 7.80);
      assert.strictEqual(devonportFare.isCapEligible, true);

      const gulfHarbourFare = calculateSingleTripTransitFare({
        zoneCount: 4,
        isFerry: true,
        isWaiheke: false,
        concession: 'adult',
        originSuburbId: 'gulf-harbour',
        destinationSuburbId: 'cbd',
      });
      assert.strictEqual(gulfHarbourFare.singleTripStandardFare, 13.80);
      assert.strictEqual(gulfHarbourFare.isCapEligible, false);
    });
  });
});
