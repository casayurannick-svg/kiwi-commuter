import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  scrubStreetNumber,
  serializeCommuteToParams,
  serializeCommuteToPrivacyParams,
  serializeCommuteToQueryString,
  parseCommuteFromParams,
} from '../src/lib/urlParams';
import { buildShareUrl } from '../src/components/ShareButton';
import ShareButton from '../src/components/ShareButton';
import { CommuteInput } from '../src/types';

describe('STORY-10: Shareable Links & Privacy (Street Address Obfuscation & Trip IDs)', () => {
  const defaultFallback: CommuteInput = {
    originSuburbId: 'epsom',
    destinationSuburbId: 'cbd',
    daysPerWeek: 3,
    vehicleType: 'petrol91',
    powertrain: 'PETROL_91',
    parkingDailyRate: 22.0,
    parkingDaysPerWeek: 3,
    concession: 'adult',
    includeMaintenanceWear: true,
    carpoolPassengers: 1,
    fuelPriceOverride: 2.72,
  };

  const residentialInput: CommuteInput = {
    ...defaultFallback,
    originSuburbId: 'mt-roskill',
    destinationSuburbId: 'parnell',
    originAddress: '10 McAlister Place, Mount Roskill, Auckland',
    destinationAddress: '56 Parnell Road, Parnell, Auckland',
    originCoordinates: [174.73602, -36.90385],
    destinationCoordinates: [174.77881, -36.85764],
    daysPerWeek: 4,
    vehicleType: 'diesel',
    powertrain: 'DIESEL',
  };

  describe('Task 4: scrubStreetNumber Unit Tests', () => {
    it('strips standard street numbers from addresses', () => {
      assert.strictEqual(
        scrubStreetNumber('123 Dominion Road, Mt Eden'),
        'Dominion Road, Mt Eden'
      );
      assert.strictEqual(
        scrubStreetNumber('10 Queens Parade, Devonport, Auckland'),
        'Queens Parade, Devonport, Auckland'
      );
      assert.strictEqual(
        scrubStreetNumber('56 Parnell Road, Parnell, Auckland'),
        'Parnell Road, Parnell, Auckland'
      );
    });

    it('strips alphanumeric street numbers (e.g., 123A, 42b)', () => {
      assert.strictEqual(
        scrubStreetNumber('123A Dominion Road, Mt Eden'),
        'Dominion Road, Mt Eden'
      );
      assert.strictEqual(
        scrubStreetNumber('42b Ponsonby Road, Ponsonby'),
        'Ponsonby Road, Ponsonby'
      );
    });

    it('strips unit, flat, apartment, and suite prefixes', () => {
      assert.strictEqual(
        scrubStreetNumber('Unit 4, 15 Karangahape Road, Auckland'),
        'Karangahape Road, Auckland'
      );
      assert.strictEqual(
        scrubStreetNumber('Flat 2/100 Remuera Road, Remuera'),
        'Remuera Road, Remuera'
      );
      assert.strictEqual(
        scrubStreetNumber('12/34 Queen Street, Auckland CBD'),
        'Queen Street, Auckland CBD'
      );
      assert.strictEqual(
        scrubStreetNumber('Apt 3B, 45 Beach Road, Auckland'),
        'Beach Road, Auckland'
      );
      assert.strictEqual(
        scrubStreetNumber('Suite 100, 20 Customs St West'),
        'Customs St West'
      );
    });

    it('preserves street names and suburbs that do not contain street numbers', () => {
      assert.strictEqual(
        scrubStreetNumber('Dominion Road, Mt Eden'),
        'Dominion Road, Mt Eden'
      );
      assert.strictEqual(
        scrubStreetNumber('Queen Street, Auckland CBD'),
        'Queen Street, Auckland CBD'
      );
      assert.strictEqual(
        scrubStreetNumber('Mt Eden'),
        'Mt Eden'
      );
      assert.strictEqual(
        scrubStreetNumber('Parnell'),
        'Parnell'
      );
    });

    it('handles empty and undefined inputs safely', () => {
      assert.strictEqual(scrubStreetNumber(undefined), undefined);
      assert.strictEqual(scrubStreetNumber(''), '');
      assert.strictEqual(scrubStreetNumber('   '), '');
    });
  });

  describe('Task 4: Fallback Privacy URL Serialization', () => {
    it('strictly strips street numbers when serialized with privacyMode=true', () => {
      const params = serializeCommuteToPrivacyParams(residentialInput);

      assert.strictEqual(params.get('fromAddress'), 'McAlister Place, Mount Roskill, Auckland');
      assert.strictEqual(params.get('toAddress'), 'Parnell Road, Parnell, Auckland');
      assert.ok(!params.get('fromAddress')?.includes('10 '));
      assert.ok(!params.get('toAddress')?.includes('56 '));
    });

    it('ensures query string generated via serializeCommuteToQueryString in privacyMode has no street numbers', () => {
      const qs = serializeCommuteToQueryString(residentialInput, { privacyMode: true });

      assert.ok(!qs.includes('10+McAlister'));
      assert.ok(!qs.includes('56+Parnell'));
      assert.ok(qs.includes('McAlister+Place'));
      assert.ok(qs.includes('Parnell+Road'));
    });

    it('preserves standard addresses without street numbers unchanged in privacyMode', () => {
      const suburbLevelInput: CommuteInput = {
        ...defaultFallback,
        originAddress: 'Dominion Road, Mt Eden',
        destinationAddress: 'Customs Street, Auckland CBD',
      };
      const params = serializeCommuteToPrivacyParams(suburbLevelInput);

      assert.strictEqual(params.get('fromAddress'), 'Dominion Road, Mt Eden');
      assert.strictEqual(params.get('toAddress'), 'Customs Street, Auckland CBD');
    });
  });

  describe('Task 5: Backward Compatibility for Legacy URLs', () => {
    it('correctly parses legacy URLs containing full street numbers and addresses', () => {
      const legacySearch = new URLSearchParams(
        'from=mt-roskill&to=parnell&fromAddress=10+McAlister+Place%2C+Mount+Roskill%2C+Auckland&toAddress=56+Parnell+Road%2C+Parnell%2C+Auckland&days=4&power=DIESEL'
      );

      const parsed = parseCommuteFromParams(legacySearch, defaultFallback);

      assert.strictEqual(parsed.originAddress, '10 McAlister Place, Mount Roskill, Auckland');
      assert.strictEqual(parsed.destinationAddress, '56 Parnell Road, Parnell, Auckland');
      assert.strictEqual(parsed.originSuburbId, 'mt-roskill');
      assert.strictEqual(parsed.destinationSuburbId, 'parnell');
      assert.strictEqual(parsed.daysPerWeek, 4);
      assert.strictEqual(parsed.powertrain, 'DIESEL');
    });

    it('correctly parses legacy URLs with alternative address aliases (originAddress, toAddr)', () => {
      const aliasSearch = new URLSearchParams(
        'originSuburbId=albany&destinationSuburbId=cbd&originAddress=123+Dominion+Road&toAddr=Queen+Street&days=5'
      );

      const parsed = parseCommuteFromParams(aliasSearch, defaultFallback);

      assert.strictEqual(parsed.originAddress, '123 Dominion Road');
      assert.strictEqual(parsed.destinationAddress, 'Queen Street');
      assert.strictEqual(parsed.originSuburbId, 'albany');
      assert.strictEqual(parsed.destinationSuburbId, 'cbd');
      assert.strictEqual(parsed.daysPerWeek, 5);
    });
  });

  describe('Task 1 & 2: Opaque Trip ID & ShareButton Integration', () => {
    it('serializes tripId when present in CommuteInput', () => {
      const tripIdInput: CommuteInput = {
        ...defaultFallback,
        tripId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      };

      const params = serializeCommuteToParams(tripIdInput);
      assert.strictEqual(params.get('tripId'), 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    });

    it('parses tripId from URLSearchParams', () => {
      const tripIdSearch = new URLSearchParams('tripId=a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d&tab=summary');
      const parsed = parseCommuteFromParams(tripIdSearch, defaultFallback);

      assert.strictEqual(parsed.tripId, 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    });

    it('buildShareUrl generates a privacy fallback URL without street numbers when Supabase is offline', async () => {
      const shareUrl = await buildShareUrl(
        residentialInput,
        'https://kiwi-commuter.vercel.app',
        '/'
      );

      // Verify that no full street address numbers are exposed in the share URL
      assert.ok(!shareUrl.includes('10+McAlister') && !shareUrl.includes('10%20McAlister'));
      assert.ok(!shareUrl.includes('56+Parnell') && !shareUrl.includes('56%20Parnell'));
      assert.ok(shareUrl.startsWith('https://kiwi-commuter.vercel.app'));
    });

    it('renders ShareButton component without leaking street addresses', () => {
      const html = renderToStaticMarkup(
        React.createElement(ShareButton, { commuteInput: residentialInput })
      );

      assert.ok(html.includes('data-testid="share-button"'));
      assert.ok(html.includes('aria-label="Share comparison link"'));
      // HTML output must never contain raw residential street numbers
      assert.ok(!html.includes('10 McAlister'));
      assert.ok(!html.includes('56 Parnell'));
    });
  });
});
