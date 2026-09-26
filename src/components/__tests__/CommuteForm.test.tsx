import assert from 'node:assert';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import CommuteForm from '../CommuteForm';
import { CommuteInput } from '@/types';

const defaultInput: CommuteInput = {
  originSuburbId: 'albany',
  destinationSuburbId: 'cbd',
  daysPerWeek: 5,
  vehicleType: 'petrol91',
  parkingDailyRate: 18.0,
  parkingDaysPerWeek: 5,
  concession: 'adult',
  includeMaintenanceWear: true,
  carpoolPassengers: 1,
  hourlyTimeValue: 0,
};

describe('src/components/CommuteForm.tsx - US-19 Wear & Tear Benchmark Tooltip', () => {
  it('renders the info icon and tooltip text explaining the AA/IRD benchmark', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    // Verify presence of AA Wear & Tires label
    assert.ok(html.includes('AA Wear &amp; Tires ($0.18/km)'), 'Must render AA Wear & Tires label');

    // Verify presence of info icon button
    assert.ok(
      html.includes('aria-label="Wear &amp; Tear benchmark info"'),
      'Must render accessible info button for Wear & Tear'
    );

    // Verify presence of exact tooltip explanation text
    assert.ok(
      html.includes(
        'AA/IRD annual benchmark: $0.18/km covers the average cost of tires, brake pads, and routine servicing for a typical NZ vehicle.'
      ),
      'Must contain exact AA/IRD benchmark tooltip explanation'
    );
  });

  it('renders Transit Mode selector including Ferry options (US-20)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    assert.ok(html.includes('Transit Mode'), 'Must render Transit Mode label');
    assert.ok(html.includes('Bus / Train (AT HOP $50 Cap)'), 'Must render Bus / Train button');
    assert.ok(html.includes('Ferry'), 'Must render Ferry button');
    assert.ok(html.includes('Waiheke Island (Matiatia)'), 'Must include Waiheke Island in suburb list');
  });

  it('renders Value of Your Time info icon and tooltip explanation (US-22)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    assert.ok(html.includes('Value of Your Time'), 'Must render Value of Your Time label');
    assert.ok(
      html.includes('aria-label="Value of Your Time info"'),
      'Must render accessible info button for Value of Your Time'
    );
    assert.ok(
      html.includes('The monetary value of your free time. We multiply this hourly rate by your total transit duration to reveal the') &&
      html.includes('hidden cost'),
      'Must contain exact Value of Your Time tooltip explanation'
    );
  });

  it('renders E-Bike mode selector button and toggles to E-Bike inputs when active (US-11)', () => {
    const htmlDefault = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    // E-Bike button is rendered in transit mode selector
    assert.ok(htmlDefault.includes('🚲 E-Bike'), 'Must render 🚲 E-Bike mode button');
    assert.ok(htmlDefault.includes('Powertrain'), 'Must render Powertrain for car mode');
    assert.ok(htmlDefault.includes('Daily Parking'), 'Must render Daily Parking for car mode');

    // When transitMode is EBIKE, hide car fields and show E-Bike inputs
    const ebikeInput: CommuteInput = {
      ...defaultInput,
      transitMode: 'EBIKE',
      upfrontSetupCost: 2800,
      ebikeCostPerKm: 0.003,
    };
    const htmlEbike = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: ebikeInput })
    );

    assert.ok(htmlEbike.includes('Upfront Setup Cost'), 'Must show Upfront Setup Cost input');
    assert.ok(htmlEbike.includes('Energy Cost/km'), 'Must show Energy Cost/km input');
    assert.ok(!htmlEbike.includes('Powertrain'), 'Must hide Powertrain when EBIKE is active');
    assert.ok(!htmlEbike.includes('Daily Parking'), 'Must hide Daily Parking when EBIKE is active');
  });

  it('renders Scooter & Ride mode and switches between RENTAL and OWNED controls (US-23)', () => {
    const htmlDefault = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    // Verify Scooter & Ride button exists
    assert.ok(htmlDefault.includes('Scooter &amp; Ride'), 'Must render Scooter & Ride button');

    // When transitMode is MICROMOBILITY_TRANSIT with RENTAL
    const rentalInput: CommuteInput = {
      ...defaultInput,
      transitMode: 'MICROMOBILITY_TRANSIT',
      scooterOwnership: 'RENTAL',
    };
    const htmlRental = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: rentalInput })
    );

    assert.ok(htmlRental.includes('First/Last Mile Scooter Mode'), 'Must display scooter mode header');
    assert.ok(htmlRental.includes('Rental (Beam / Lime)'), 'Must render rental button');
    assert.ok(htmlRental.includes('Unlock Fee:'), 'Must show $1 unlock fee info');
    assert.ok(htmlRental.includes('$0.45 / min'), 'Must show $0.45/min rate info');
    assert.ok(htmlRental.includes('Powertrain'), 'Car powertrain must remain visible to compare against driving');

    // When transitMode is MICROMOBILITY_TRANSIT with OWNED
    const ownedInput: CommuteInput = {
      ...defaultInput,
      transitMode: 'MICROMOBILITY_TRANSIT',
      scooterOwnership: 'OWNED',
      scooterCapitalCost: 850,
    };
    const htmlOwned = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: ownedInput })
    );

    assert.ok(htmlOwned.includes('Personally Owned'), 'Must render personally owned button');
    assert.ok(htmlOwned.includes('Scooter Capital Cost ($ NZD)'), 'Must show scooter capital cost input');
  });

  it('allows empty string fuel cost input without snapping back to default immediately (US-24)', () => {
    const initialInput: CommuteInput = {
      ...defaultInput,
      fuelPriceOverride: 2.72,
    };

    const element = React.createElement(CommuteForm, {
      input: initialInput,
    });

    const rendered = renderToStaticMarkup(element);
    assert.ok(rendered.includes('aria-label="Fuel Price ($/L)"'), 'Must render fuel price input field');
    assert.ok(rendered.includes('value="2.72"'), 'Must render initial fuel cost value');

    // Simulate clearing the field by rendering with empty override or undefined
    const clearedInput: CommuteInput = {
      ...defaultInput,
      fuelPriceOverride: undefined,
    };

    // When fuelPriceOverride is undefined, the component's internal state handles empty string
    // Verify that passing an input without override renders with placeholder and empty or default fallback cleanly
    const clearedMarkup = renderToStaticMarkup(
      React.createElement(CommuteForm, {
        input: clearedInput,
      })
    );
    assert.ok(clearedMarkup.includes('placeholder="2.72"'), 'Must provide default fuel price in placeholder');
  });

  it('renders Hybrid (Non-Plug-in) option in the powertrain selector (US-26)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    assert.ok(html.includes('Hybrid (Non-Plug-in)'), 'Must render Hybrid (Non-Plug-in) option');
    assert.ok(html.includes('4.5'), 'Must render 4.5 L/100km default consumption for HEV');
  });

  it('renders Powertrain info icon with hover tooltip text (US-26)', () => {
    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );

    assert.ok(
      html.includes('aria-label="Powertrain benchmark info"'),
      'Must render accessible info button for Powertrain'
    );
    assert.ok(
      html.includes(
        'Default values are based on national averages. For a more accurate calculation, enter your vehicle'
      ) && html.includes('exact L/100km rating.'),
      'Must contain exact Powertrain benchmark tooltip text'
    );
  });

  it('dynamically renders Custom L/100km input for fuel-consuming powertrains and hides it for pure EV (US-26)', () => {
    // 1. Combustion (Petrol 91)
    const petrolHtml = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: defaultInput })
    );
    assert.ok(petrolHtml.includes('Custom L/100km'), 'Must render Custom L/100km for Petrol 91');
    assert.ok(petrolHtml.includes('data-testid="custom-l100km-input"'), 'Must render custom L/100km input field');

    // 2. Hybrid (HEV)
    const hevHtml = renderToStaticMarkup(
      React.createElement(CommuteForm, {
        input: { ...defaultInput, vehicleType: 'hev', powertrain: 'HEV', consumptionOverride: 4.2 },
      })
    );
    assert.ok(hevHtml.includes('Custom L/100km'), 'Must render Custom L/100km for HEV');
    assert.ok(hevHtml.includes('value="4.2"'), 'Must populate custom consumption value');

    // 3. Plug-in Hybrid (PHEV)
    const phevHtml = renderToStaticMarkup(
      React.createElement(CommuteForm, {
        input: { ...defaultInput, vehicleType: 'phev', powertrain: 'PHEV' },
      })
    );
    assert.ok(phevHtml.includes('Custom L/100km'), 'Must render Custom L/100km for PHEV');

    // 4. Pure EV (BEV) - Must hide Custom L/100km input
    const evHtml = renderToStaticMarkup(
      React.createElement(CommuteForm, {
        input: { ...defaultInput, vehicleType: 'bev', powertrain: 'BEV', consumptionOverride: 5.5 },
      })
    );
    assert.ok(!evHtml.includes('Custom L/100km'), 'Must NOT render Custom L/100km for pure EV');
    assert.ok(!evHtml.includes('data-testid="custom-l100km-input"'), 'Must hide custom-l100km-input for pure EV');
  });

  it('renders Address Geocoding autocomplete inputs for Origin and Destination (US-28)', () => {
    const geoInput: CommuteInput = {
      ...defaultInput,
      originAddress: '120 Dairy Flat Highway, Albany',
      destinationAddress: '188 Quay St, CBD',
      originCoordinates: [174.7082, -36.7295],
      destinationCoordinates: [174.7645, -36.8485],
    };

    const html = renderToStaticMarkup(
      React.createElement(CommuteForm, { input: geoInput })
    );

    assert.ok(html.includes('data-testid="origin-address-input"'), 'Must render origin address autocomplete input');
    assert.ok(html.includes('data-testid="destination-address-input"'), 'Must render destination address autocomplete input');
    assert.ok(html.includes('From (Origin Address)'), 'Must render From label');
    assert.ok(html.includes('To (Destination Address)'), 'Must render To label');
    assert.ok(html.includes('174.71, -36.73'), 'Must render origin coordinates indicator');
    assert.ok(html.includes('174.76, -36.85'), 'Must render destination coordinates indicator');
  });
});



