import assert from 'node:assert';
import { describe, it } from 'node:test';
import { calculateVerdict } from '../src/lib/verdict';
import { calculateCommuteArbitrage } from '../src/lib/calculator';

describe('STORY-2: Verdict Engine & Copy Bank Rules (Sections 6 & 7)', () => {
  describe('calculateVerdict - Core Calculation & States', () => {
    it('returns transit_cheaper state when transitWeekly < (stopsWeekly - band)', () => {
      // stops = $100/wk, transit = $50/wk, band = $10 (10% of 100)
      // Car = 30m, Transit = 50m (20m longer)
      const verdict = calculateVerdict(100, 50, 30, 50);

      assert.strictEqual(verdict.state, 'transit_cheaper');
      assert.strictEqual(verdict.isTransitCheaper, true);
      assert.strictEqual(verdict.isWash, false);
      assert.strictEqual(verdict.isDrivingCheaper, false);
      assert.strictEqual(verdict.savingsWeekly, 50);
      assert.strictEqual(verdict.savingsAnnual, 50 * 52); // $2,600
      assert.strictEqual(verdict.headline, 'The bus would save you about $50 a week');
      assert.strictEqual(
        verdict.support,
        "That's roughly $2,600 a year, and the bus takes 20 minutes longer each day."
      );
    });

    it('returns driving_cheaper state when stopsWeekly < (transitWeekly - band)', () => {
      // stops = $40/wk, transit = $100/wk, band = $10 (10% of 100)
      // Car = 30m, Transit = 55m (driving saves 25m/day)
      const verdict = calculateVerdict(40, 100, 30, 55);

      assert.strictEqual(verdict.state, 'driving_cheaper');
      assert.strictEqual(verdict.isDrivingCheaper, true);
      assert.strictEqual(verdict.isTransitCheaper, false);
      assert.strictEqual(verdict.isWash, false);
      assert.strictEqual(verdict.savingsWeekly, 60);
      assert.strictEqual(verdict.headline, 'Driving is cheaper by about $60 a week');
      assert.strictEqual(verdict.support, 'And it saves you 25 minutes a day.');
    });

    it('returns about_the_same (wash) state when difference is within the band', () => {
      // stops = $50/wk, transit = $48/wk, band = $5 (10% of 50)
      // Car = 30m, Transit = 45m (15m longer <= 20m threshold)
      const verdict = calculateVerdict(50, 48, 30, 45);

      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(verdict.isWash, true);
      assert.strictEqual(verdict.headline, 'Pretty much a wash');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $50 a week for the car and pay $48 in fares."
      );
    });
  });

  describe('Band Rule & Boundary Conditions', () => {
    it('enforces minimum $3.00 band when 10% of max cost is below $3.00', () => {
      // stops = $20, transit = $20 -> 10% is $2.00, band defaults to $3.00
      const verdict = calculateVerdict(20, 20, 30, 40);
      assert.strictEqual(verdict.band, 3.00);
    });

    it('enforces 10% band when 10% of max cost exceeds $3.00', () => {
      // stops = $80, transit = $40 -> 10% is $8.00, band is $8.00
      const verdict = calculateVerdict(80, 40, 30, 40);
      assert.strictEqual(verdict.band, 8.00);
    });

    it('at exact upper boundary (diff === band), state is about_the_same', () => {
      // stops = $100, band = $10. At transit = $90, diff = $10 === band ($10)
      const boundary = calculateVerdict(100, 90, 30, 40);
      assert.strictEqual(boundary.state, 'about_the_same');
      assert.strictEqual(boundary.headline, 'Pretty much a wash');
    });

    it('1 cent beyond upper boundary (diff > band), state is transit_cheaper', () => {
      // stops = $100, band = $10. At transit = $89.99, diff = $10.01 > band ($10)
      const beyond = calculateVerdict(100, 89.99, 30, 50);
      assert.strictEqual(beyond.state, 'transit_cheaper');
      assert.strictEqual(beyond.headline, 'The bus would save you about $10 a week');
    });

    it('at exact lower boundary (diff === band), state is about_the_same', () => {
      // transit = $100, band = $10. At stops = $90, diff = $10 === band ($10)
      const boundary = calculateVerdict(90, 100, 30, 40);
      assert.strictEqual(boundary.state, 'about_the_same');
      assert.strictEqual(boundary.headline, 'Pretty much a wash');
    });

    it('1 cent beyond lower boundary (diff > band), state is driving_cheaper', () => {
      // transit = $100, band = $10. At stops = $89.99, diff = $10.01 > band ($10)
      const beyond = calculateVerdict(89.99, 100, 30, 50);
      assert.strictEqual(beyond.state, 'driving_cheaper');
      assert.strictEqual(beyond.headline, 'Driving is cheaper by about $10 a week');
    });

    it('verifies boundary with minimum $3.00 floor: 1 cent determines wash vs transit_cheaper', () => {
      // stops = $20, band = $3.00.
      // At transit = $17.00: diff = $3.00 <= $3.00 -> wash
      const atBoundary = calculateVerdict(20, 17.00, 30, 40);
      assert.strictEqual(atBoundary.state, 'about_the_same');

      // At transit = $16.99: diff = $3.01 > $3.00 -> transit_cheaper
      const beyondBoundary = calculateVerdict(20, 16.99, 30, 50);
      assert.strictEqual(beyondBoundary.state, 'transit_cheaper');
    });
  });

  describe('Time Clause Threshold Rule (> 20 minutes)', () => {
    it('omits time clause when time delta is exactly 20 minutes', () => {
      // transit = 50m, car = 30m -> diff = 20m (NOT > 20)
      const verdict = calculateVerdict(50, 50, 30, 50);
      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $50 a week for the car and pay $50 in fares."
      );
      assert.strictEqual(verdict.support.includes('longer each day'), false);
    });

    it('includes time clause when time delta is 21 minutes (> 20 minutes)', () => {
      // transit = 51m, car = 30m -> diff = 21m (> 20)
      const verdict = calculateVerdict(50, 50, 30, 51);
      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $50 a week for the car and pay $50 in fares. The bus takes 21 minutes longer each day."
      );
      assert.strictEqual(verdict.support.includes('The bus takes 21 minutes longer each day.'), true);
    });

    it('omits time clause when transit is faster or equal to car', () => {
      // transit = 25m, car = 30m -> diff = -5m <= 20
      const verdict = calculateVerdict(50, 50, 30, 25);
      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $50 a week for the car and pay $50 in fares."
      );
    });
  });

  describe('Section 5 Fixture Check', () => {
    it('matches exact Section 5 fixture: S=$29.58, T=$29.40 (diff $0.18 <= band $3.00) -> Pretty much a wash with 56m time clause', () => {
      const stopsWeekly = 29.58;
      const transitWeekly = 29.40;
      const carMinutesDaily = 36;
      const transitMinutesDaily = 92;

      const verdict = calculateVerdict(
        stopsWeekly,
        transitWeekly,
        carMinutesDaily,
        transitMinutesDaily
      );

      assert.strictEqual(verdict.band, 3.00);
      assert.strictEqual(verdict.differenceWeekly, 0.18);
      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(verdict.isWash, true);
      assert.strictEqual(verdict.headline, 'Pretty much a wash');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $30 a week for the car and pay $29 in fares. The bus takes 56 minutes longer each day."
      );
    });
  });

  describe('Zero-Cost & Extreme Edge Cases', () => {
    it('handles zero-cost for both car and transit (wash with $0)', () => {
      const verdict = calculateVerdict(0, 0, 20, 30);
      assert.strictEqual(verdict.state, 'about_the_same');
      assert.strictEqual(verdict.headline, 'Pretty much a wash');
      assert.strictEqual(
        verdict.support,
        "You'd stop paying $0 a week for the car and pay $0 in fares."
      );
    });

    it('handles zero car cost vs transit cost ($0 car vs $40 transit -> driving cheaper)', () => {
      const verdict = calculateVerdict(0, 40, 20, 45);
      assert.strictEqual(verdict.state, 'driving_cheaper');
      assert.strictEqual(verdict.headline, 'Driving is cheaper by about $40 a week');
      assert.strictEqual(verdict.support, 'And it saves you 25 minutes a day.');
    });

    it('handles zero transit cost vs car cost ($40 car vs $0 transit -> transit cheaper)', () => {
      const verdict = calculateVerdict(40, 0, 20, 45);
      assert.strictEqual(verdict.state, 'transit_cheaper');
      assert.strictEqual(verdict.headline, 'The bus would save you about $40 a week');
      assert.strictEqual(
        verdict.support,
        "That's roughly $2,080 a year, and the bus takes 25 minutes longer each day."
      );
    });
  });

  describe('Formatting & Copy Rules Enforcement', () => {
    it('enforces sentence case, contractions, and "a week" / "a year" phrasing', () => {
      const transitCheaper = calculateVerdict(100, 60, 30, 50);
      assert.ok(transitCheaper.headline.endsWith('a week'));
      assert.ok(!transitCheaper.headline.includes('/week'));
      assert.ok(transitCheaper.support.includes("That's"));
      assert.ok(transitCheaper.support.includes('a year'));
      assert.ok(!transitCheaper.support.includes('/year'));

      const wash = calculateVerdict(50, 50, 30, 40);
      assert.strictEqual(wash.headline, 'Pretty much a wash');
      assert.ok(wash.support.includes("You'd"));
      assert.ok(wash.support.includes('a week'));

      const drivingCheaper = calculateVerdict(30, 80, 20, 45);
      assert.ok(drivingCheaper.headline.endsWith('a week'));
      assert.ok(drivingCheaper.support.includes('a day'));
    });
  });

  describe('Integration with calculateCommuteArbitrage', () => {
    it('attaches computed verdict object to calculateCommuteArbitrage return shape', () => {
      const result = calculateCommuteArbitrage({
        originSuburbId: 'mt-roskill',
        destinationSuburbId: 'parnell',
        daysPerWeek: 3,
        vehicleType: 'diesel',
        parkingDailyRate: 4.00,
        parkingDaysPerWeek: 3,
        concession: 'adult',
        carpoolPassengers: 1,
      });

      assert.ok(result.verdict, 'verdict must be defined on arbitrage result');
      assert.strictEqual(result.verdict.state, 'about_the_same');
      assert.strictEqual(result.verdict.headline, 'Pretty much a wash');
      assert.strictEqual(
        result.verdict.support,
        "You'd stop paying $30 a week for the car and pay $29 in fares. The bus takes 56 minutes longer each day."
      );
    });
  });
});
