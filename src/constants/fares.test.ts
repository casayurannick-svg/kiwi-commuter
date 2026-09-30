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
} from './fares';

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
});
