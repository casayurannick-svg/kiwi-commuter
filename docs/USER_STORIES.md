# Agile User Stories & Acceptance Criteria

## Executive Story Status Matrix

| Story ID | Title | Status | Evidence / File Path | Notes / Gaps |
| :--- | :--- | :---: | :--- | :--- |
| **US-01** | Point-to-Point Cost Arbitrage Calculation | **DONE** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx) | Complete daily, weekly, monthly, annual driving vs AT HOP zonal fare calculations. |
| **US-02** | Statutory RUC & Energy Modeling | **DONE** | [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts) | BEV ($0.076/km), PHEV ($0.038/km), Diesel ($0.076/km), Petrol ($0.00/km). |
| **US-03** | Auckland Transport 7-Day Fare Cap Rules | **DONE** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) | Enforces $50.00 weekly cap; displays indicator badges on results card and header. |
| **US-04** | Automated Market Fuel Price Synchronization | **DONE** | [`scripts/fetch-mbie-fuel.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/scripts/fetch-mbie-fuel.ts), [`src/lib/supabase.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/supabase.ts) | Automated weekly MBIE CSV fetcher, Supabase upsert, edge-cached `/api/fuel`. |
| **US-05** | Mobile-First Responsive UI & Layout Optimization | **DONE** | [`src/components/RouteMap.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/RouteMap.tsx), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx) | Custom rates expanded by default, >= 44px touch targets, responsive two-column grid. |
| **US-06** | URL Search Param State Persistence & Sharing | **DONE** | [`src/lib/urlParams.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx) | Two-way URL synchronization, load hydration, one-click share link with toast. |
| **US-07** | Carpool & Multi-Passenger Split Engine | **DONE** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx) | 1–4 passenger selector dividing fuel, RUC, parking, and maintenance expenses. |
| **US-08** | Greater Wellington / Metlink Expansion | **PENDING** | Backlog (`src/config/suburbs.ts`) | Suburbs and fares currently scoped to Greater Auckland (AT HOP zones 1–5). |
| **US-09** | EV Public Charging vs. Home Off-Peak Rate Arbitrage | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/lib/urlParams.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts) | 4 presets: Home Off-Peak ($0.18), Flat ($0.30), Public DC ($0.85), Custom; decoupled invariant RUC; `chargeSource` URL param persistence. |
| **US-10** | AT Concession Profiles (Tertiary, Youth, Community Connect) | **DONE** | [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts) | Full concession schedule: Tertiary (20% off), Youth/Community (50% off), SuperGold. |
| **US-11** | E-Bike Mode & Payback Timeline | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/MiniReceipt.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/MiniReceipt.tsx) | 'EBIKE' in TransitMode, zeroed parking/RUC, distance * ebikeCostPerKm, Upfront Setup Cost, and MiniReceipt Breakeven Alert box. |
| **US-12** | Park & Ride Multimodal Hybrid Route | **PENDING** | Backlog (`src/config/suburbs.ts`) | Station parking + rail transfer multi-leg route calculations not yet modeled. |
| **US-13** | Monetized Travel Time & Opportunity Cost | **DONE** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx), [`src/lib/urlParams.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | Fully implemented with UI controls (Off, $20/hr, $50/hr, Custom), URL state persistence (`timeRate`), ComparisonCard sublines/badges, and unit tests. |
| **US-14** | Plain-Language Financial Verdicts | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) | Direct conversational savings verdicts ("You save $X/mo...", "MONTHLY SUMMARY" badge). |
| **US-15** | Privacy-Friendly Traffic & Web Analytics Integration | **DONE** | [`src/app/layout.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/layout.tsx), [`package.json`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/package.json) | `@vercel/analytics` installed and `<Analytics />` component embedded in RootLayout. |
| **US-16** | Plain-Language Time Valuation Balance Sheet ("Mini-Receipt") | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx), [`src/components/__tests__/ComparisonCard.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/ComparisonCard.test.tsx) | Recessed card balance sheet breaking down Cash Saved, Time Cost/Gained, and Your True Benefit. |
| **US-17** | Remove Corridors Preset Menu | **DONE** | [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx) | Completely removed horizontal scrolling Corridors preset buttons, data structure, and handlers to reduce UI distraction. |
| **US-18** | Remove Header Metadata and Status Badges | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Removed "Real-time delta" text, "Auckland Transport & MBIE Weekly Sync" footer text, and policy badges ("2026 RUC Active", "AT $50 Cap") to declutter the UI. |
| **US-19** | Tooltip for Vehicle Wear & Tear Benchmark | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/__tests__/CommuteForm.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/CommuteForm.test.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Added accessible info icon and tooltip explaining the $0.18/km AA/IRD tires, brakes, and servicing benchmark rate. |
| **US-20** | Ferry Commute Mode & Waiheke Cap Exception | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | Ferry mode selection, silent address Waiheke detection, Fullers commercial rates bypassing AT $50 cap while retaining cap for Devonport. |
| **US-22** | Tooltip for Value of Your Time | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/__tests__/CommuteForm.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/CommuteForm.test.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Added accessible info icon and tooltip explaining the opportunity cost and transit duration multiplication calculation. |
| **US-23** | Micro-Mobility First/Last Mile (Scooter & Ride) | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/MiniReceipt.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/MiniReceipt.tsx), [`src/lib/urlParams.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts) | 'Scooter & Ride' mode, 15 km/h leg recalculation, rental fees ($1 unlock + $0.45/min) atop AT HOP capped fare, owned scooter payback timeline. |
| **US-24** | Empty String & Fallback Fuel Price Input Handling | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/__tests__/CommuteForm.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/CommuteForm.test.tsx), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | Local string state for fuelCost with nullish coalescing (`fuelCost ?? ''`); clearing input does not snap back; calculation engine falls back to `DEFAULT_FUEL_RATE` when empty or NaN. |
| **US-25** | Fix E-Bike Verdict Copy & Remove Leaked Transit Metadata | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx), [`src/components/__tests__/ComparisonCard.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/ComparisonCard.test.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Dynamic verdict headline ("on an E-Bike" vs "on public transport"), AT HOP Cap/Corridor/badge hidden for E-Bike, footer shows "E-Bike energy cost" instead of cap text. |
| **US-26** | Conventional Hybrid (HEV), Custom L/100km Override, Powertrain Tooltip & 2x3 Icon Grid | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | HEV in Powertrain enum, 4.5 L/100km default efficiency, $0.00/km RUC, accessible Powertrain tooltip, dynamic Custom L/100km numeric input for fuel-consuming vehicles, auto-cleared on pure EV, engine prioritizing custom overrides, 2x3 icon grid layout (`grid grid-cols-3 gap-2`) with condensed button labels and Lucide icons (Fuel, Leaf, Plug, Zap), HEV tooltip ("Non-plug-in hybrid"). |
| **US-27** | 'Buy Me a Coffee' Donation Button (Revolut.me) | **DONE** | [`src/components/DonationButton.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DonationButton.tsx), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx), [`src/components/__tests__/DonationButton.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/DonationButton.test.tsx) | Reusable DonationButton with 'header' (subtle minimal icon/text) and 'footer' (full text with ☕) variants, linking to NEXT_PUBLIC_DONATION_URL with target="_blank" and rel="noopener noreferrer". |
| **US-28** | Address Geocoding & Nearest Station Spatial Search with Segmented Timeline UI | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/data/at-stations.json`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/data/at-stations.json), [`src/lib/stations.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/stations.ts), [`src/components/JourneyTimeline.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/JourneyTimeline.tsx), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts) | Mapbox Geocoding autocomplete on To/From inputs, 45 AT stations GeoJSON, @turf/nearest-point spatial search, JourneyTimeline component with segmented nodes (Drive to Station, Transit Ride, Walk to Desk), decoupled first-mile running costs aggregated with AT HOP fares. |
| **US-30** | AT GTFS API Local Stop Integration | **DONE** | [`src/app/api/nearest-stop/route.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/api/nearest-stop/route.ts), [`src/components/JourneyTimeline.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/JourneyTimeline.tsx), [`src/lib/mapbox.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/mapbox.ts) | Next.js API route querying AT GTFS geospatial endpoint, dynamic local stop lookup for walking/scooter modes, Mapbox Directions integration, retaining offline Turf.js spatial logic exclusively for driving modes. |
| **US-31** | Render and Integrate 'KiwiPathway' Logo | **DONE** | [`src/components/icons/KiwiPathwayIcon.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/icons/KiwiPathwayIcon.tsx), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx), [`src/components/__tests__/KiwiPathwayIcon.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/KiwiPathwayIcon.test.tsx) | SVG icon component representing the Kiwi Pathway transit lines, nodes, and momentum arrowheads with JSX attributes; rendered in the header with `h-8 w-8 text-emerald-500` and `aria-label="Kiwi Commuter"`. |
| **US-21** | End-to-End Multimodal Journey Routing (Google Routes API) | **DONE** | [`src/app/api/routes/route.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/api/routes/route.ts), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx), [`src/components/JourneyTimeline.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/JourneyTimeline.tsx), [`src/app/api/routes/__tests__/route.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/api/routes/__tests__/route.test.ts) | Google Routes API (v2) TRANSIT mode endpoint summing real-world leg/step durations; injected into `commuteInput.transitTimeMins` via `DashboardClient` `useEffect` when geocoded coordinates are set; graceful fallback to static estimates when API key absent; JourneyTimeline shows a pulsing "real-world timetable" indicator when live routing is active. |

---

## Shipped Stories (DONE)

### US-01: Point-to-Point Cost Arbitrage Calculation
**As a** hybrid office commuter,  
**I want to** select my origin suburb, destination hub, and days per week in the office,  
**So that** I can see an exact side-by-side monthly cost breakdown between driving and catching public transit.

* **Acceptance Criteria:**
  - **Given** an origin (e.g., Albany) and destination (e.g., Britomart / CBD),
  - **When** I select my vehicle powertrain, fuel consumption, and office days (1–5 days/week),
  - **Then** the engine calculates roundtrip driving distance, fuel/power cost, RUC, and daily parking.
  - **And** computes the AT HOP zonal return fare, factoring in weekly caps.
  - **And** outputs the net monthly savings (`monthlyDrivingTotal - monthlyTransitTotal`) and annual projection.

---

### US-02: Statutory Road User Charges (RUC) & Energy Modeling
**As a** BEV or PHEV owner,  
**I want to** have my statutory distance charges and home power rate accounted for,  
**So that** I see an accurate reflection of low-emission running costs versus standard petrol.

* **Acceptance Criteria:**
  - **Given** powertrain is set to `BEV`, RUC is automatically calculated at **$0.076/km** ($76 / 1,000 km).
  - **Given** powertrain is set to `PHEV`, RUC is automatically calculated at **$0.038/km** ($38 / 1,000 km).
  - **Given** powertrain is set to `PETROL_91` or `PETROL_95`, RUC is set to **$0.00/km** (excise duty paid at pump).
  - **When** home electricity tariff is customized (default $0.18/kWh), EV daily energy cost updates dynamically: `(roundtripKm * kWh_per_100km / 100) * rate`.

---

### US-03: Auckland Transport 7-Day Fare Cap Rules
**As a** high-frequency commuter (4–5 days/week),  
**I want** the system to enforce Auckland Transport's 7-day fare cap,  
**So that** my public transport expenses are not artificially inflated.

* **Acceptance Criteria:**
  - **Given** the weekly transit cost exceeds **$50.00**,
  - **When** monthly transit totals are calculated,
  - **Then** weekly transit costs are capped at exactly **$50.00** (`Math.min(uncappedWeekly, 50.00)`).
  - **And** an *"AT 7-Day Cap Applied"* indicator badge is displayed on the results card.

---

### US-04: Automated Market Fuel Price Synchronization
**As an** application consumer,  
**I want** fuel prices to stay synchronized with New Zealand retail averages,  
**So that** I don't have to manually lookup pump prices.

* **Acceptance Criteria:**
  - **Given** the weekly MBIE fuel monitoring CSV release,
  - **When** the automated scheduled job runs,
  - **Then** the latest retail prices for 91, 95, and Diesel are parsed and saved to the database.
  - **And** the calculator defaults to these latest figures if no manual override is provided.

---

### US-05: Mobile-First Responsive UI & Layout Optimization
**As a** mobile user on iOS Safari or Android Chrome,  
**I want** an uncluttered, responsive interface with interactive route visualization,  
**So that** I can easily toggle parameters and view the commute corridor on a map without UI lag.

* **Acceptance Criteria:**
  - All touch targets (pills, segmented buttons) meet WCAG standards (>= 44px min height).
  - Custom rates are expanded by default to eliminate vertical gaps.
  - Mapbox route renders interactive navigation lines between origin and destination centroids without gesture-trapping mobile scroll.
  - Inputs and metrics use tabular typography (`tabular-nums`) to prevent layout shifts.

---

### US-06: URL Search Param State Persistence & Sharing
**As a** commuter,  
**I want to** share my exact commute comparison via a direct URL,  
**So that** my colleagues can view the identical calculations without re-entering parameters.

* **Acceptance Criteria:**
  - **Given** any combination of origin, destination, days, powertrain, and parking rates,
  - **When** the parameters update in `CommuteForm`,
  - **Then** the URL search parameters synchronize automatically using `window.history.replaceState` without reloading the page.
  - **Given** a user opening a shared URL with query parameters (`?from=albany&to=cbd&days=5&power=BEV`),
  - **When** the application hydrates on load,
  - **Then** `parseCommuteFromParams` extracts all parameters and sets initial state.
  - **Given** the user clicks the "Share" button in the header,
  - **When** triggered,
  - **Then** the full URL is copied to the system clipboard and a confirmation toast is displayed.

---

### US-07: Carpool & Multi-Passenger Split Engine
**As a** driver who commutes with coworkers or family,  
**I want to** divide parking, RUC, maintenance, and fuel costs by passenger count (1–4),  
**So that** I can see the multi-passenger tipping point against individual public transit fares.

* **Acceptance Criteria:**
  - **Given** a solo driver changes the carpool passenger count to 2, 3, or 4 passengers,
  - **When** computing daily, weekly, monthly, and annual driving costs,
  - **Then** fuel/energy, RUC, parking, and maintenance are divided equally by the passenger count.
  - **And** the net arbitrage comparison reflects individual per-passenger vehicle costs against single-passenger transit fares.

---

### US-09: EV Public Charging vs. Home Off-Peak Rate Arbitrage
**As an** EV or Plug-in Hybrid commuter without access to off-peak home charging (e.g., apartment dweller or street parker),  
**I want to** toggle between home charging and public DC fast-charging rates (e.g., ChargeNet, Tesla Supercharger, We.EV),  
**So that** I can evaluate whether driving an EV remains cheaper than public transit when relying on public charging infrastructure.

* **Acceptance Criteria:**
  - **Given** the user selects `BEV` or `PHEV` as their vehicle powertrain,
  - **When** viewing the charging configuration in the expanded parameters,
  - **Then** display an "⚡ EV Power Source" segmented control with four presets:
    1. **Home Off-Peak** (Default: `$0.18/kWh` via `NZ_EV_CHARGING_RATES.HOME_OFFPEAK`)
    2. **Home Standard / Flat** (`$0.30/kWh` via `NZ_EV_CHARGING_RATES.HOME_FLAT`)
    3. **Public DC Fast / ChargeNet** (`$0.85/kWh` via `NZ_EV_CHARGING_RATES.PUBLIC_DC`)
    4. **Custom** (User-specified numeric input in $/kWh via `homeKWhRate` or inline input)
  - **When** switching between presets:
    - Daily energy cost updates dynamically in real-time.
    - Statutory RUC remains completely invariant and decoupled ($0.076/km for BEV, $0.038/km for PHEV).
    - PHEV calculates first 35 km electric on the selected rate, and remainder on petrol backup (default $2.72/L, 6.0 L/100km).
    - BEV calculates all roundtrip distance on the selected rate (default 16.5 kWh/100km or custom efficiency).
    - URL search parameters serialize and parse `chargeSource` (`HOME_OFFPEAK`, `HOME_FLAT`, `PUBLIC_DC`, `CUSTOM`) and `kwhRate` with backward compatibility for legacy `evChargeMode`.
    - Unit tests in `calculator.test.ts` assert fuel costs scale correctly while RUC remains identical.

---

### US-10: Auckland Transport Concession Profiles (Tertiary, Youth, Community Connect)
**As a** tertiary student, youth, or Community Services Card holder,  
**I want to** select my eligible fare concession category,  
**So that** my transit fares reflect statutory discounts against driving.

* **Acceptance Criteria:**
  - **Given** concession selector in Custom Rates,
  - **When** selecting **Tertiary Student**, apply a 20% discount against standard adult fares ($2.08 / $3.56 / $4.80 / $6.16 / $7.52 across zones 1–5).
  - **When** selecting **Community Connect** or **Youth 13–24**, apply a 50% statutory discount ($1.30 / $2.23 / $3.00 / $3.85 / $4.70 across zones 1–5).
  - **When** selecting **SuperGold**, calculate free off-peak travel.
  - **And** weekly total continues to respect the statutory `$50.00` 7-day fare cap.

---

### US-13: Monetized Travel Time & Opportunity Cost
**As a** busy professional,  
**I want to** assign a monetary value to my travel time (e.g. $0, $20, $50/hr),  
**So that** I can assess the Generalized Cost of driving in traffic vs transit, incorporating time savings into my monthly verdict.

* **Acceptance Criteria:**
  - **Given** commute parameters entered into the comparison engine,
  - **When** selecting an hourly time valuation ($20/hr, $50/hr, or Custom $/hr) in Custom Rates,
  - **Then** compute the difference in monthly transit vs driving hours:
    $$\text{monthlyTimeDeltaHours} = \frac{(\text{oneWayTransit} - \text{oneWayDrive}) \times 2 \times \text{daysPerWeek} \times 4.33}{60}$$
  - **And** compute monetized monthly time cost: $\text{monthlyTimeDeltaHours} \times \text{hourlyTimeValue}$.
  - **And** calculate generalized monthly savings: $\text{monthlySavings} - \text{monetizedMonthlyTimeCost}$.
  - **When** hourlyTimeValue > 0, display a secondary subline in [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx):
    - `"Factoring your time ($X/hr): Net +$Y/mo on [Mode]"`
  - **And** render a travel time badge in the metrics row:
    - `"⚡ Saves X.X h/mo driving"` if driving is faster.
    - `"⚡ Saves X.X h/mo on transit"` if transit is faster.
  - **And** synchronize `timeRate` to/from URL search params (`?timeRate=50`), supporting seamless share links with hourly time valuation.
  - **And** comprehensive unit tests in [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) verify zero valuation ($0/hr), custom hourly rate calculations, and 15-minute drive time advantage scenarios (8.66 hrs saved, $173.20 monetized time cost at 4 days/wk with $20/hr).

---

### US-14: Plain-Language Financial Verdicts
**As a** first-time visitor,  
**I want** simple, jargon-free verdicts on which mode saves me money,  
**So that** I understand the bottom line without analyzing finance or arbitrage terminology.

* **Acceptance Criteria:**
  - **Given** commute parameters entered into the comparison engine,
  - **When** viewing the primary outcome card ([`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx)),
  - **Then** display a direct plain-language savings verdict:
    - `"You save $X/month on public transport"` with emerald styling when transit is cheaper.
    - `"You save $X/month driving"` with amber styling when driving is cheaper.
    - `"Costs are roughly identical"` when delta is negligible (< $1/mo).
  - **And** display a conversational annual subline (e.g. `"Save $X/year compared to driving"`).
  - **And** replace abstract financial badges like `"Monthly Arbitrage"` with `"MONTHLY SUMMARY"`.

---

### US-15: Privacy-Friendly Traffic & Web Analytics Integration
**As a** product owner and maintainer,  
**I want to** monitor live aggregate visitor volume, referrer sources, and device breakdowns via Vercel Web Analytics,  
**So that** I can assess application adoption, understand which channels drive traffic (e.g. Reddit, direct shares), and verify real-world usage while staying 100% within free-tier limits.

* **Acceptance Criteria:**
  - **Given** the application root layout ([`src/app/layout.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/layout.tsx)),
  - **When** a user navigates to the web app,
  - **Then** the official `@vercel/analytics` package script is loaded asynchronously without blocking first contentful paint (FCP).
  - **And** aggregate page views, referrer domains (e.g., direct, reddit.com, t.co), geographic regions (New Zealand cities), and device operating systems (iOS, Android, macOS, Windows) are recorded in the Vercel project dashboard.
  - **And** no personally identifiable information (PII) or user session cookies are stored or transmitted.
  - **When** running locally in development mode (`NODE_ENV === 'development'`),
    - Analytics calls are suppressed or flagged in debug mode to prevent polluting production metrics.

---

### US-16: Plain-Language Time Valuation Balance Sheet ("Mini-Receipt")
**As a** busy commuter assigning a dollar value to my time,  
**I want to** see an itemized balance sheet breaking down Cash Saved, Time Cost/Bonus, and True Net Benefit,  
**So that** I understand exactly how travel time impacts my financial bottom line.

* **Acceptance Criteria:**
  - **Given** an active commute comparison with `hourlyTimeValue > 0`,
  - **When** viewing [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx),
  - **Then** render a recessed inset container (`bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3 sm:p-4 text-sm`) breaking down:
    - **Header:** `⏱️ Time Valuation ($X/hr)`
    - **Row 1 (Cash Saved):** `Cash Saved` | `+$X` using `tabular-nums`
    - **Row 2 (Time Impact):**
      - If the winning mode is slower: `Time Cost (Slower commute)` | `-$X` (rose styling)
      - If the winning mode is faster: `Time Gained (Faster commute)` | `+$X` (emerald styling)
      - If times are identical: `Time Impact (Same commute time)` | `$0`
    - **Row 3 (True Benefit):** Top border (`border-t border-zinc-800/80 pt-2 mt-2 font-medium`) displaying `Your True Benefit` | `+$X /mo` (or `-$X /mo`)
  - **Given** `hourlyTimeValue = 0` (or Off),
  - **When** viewing the comparison card,
  - **Then** the Time Valuation mini-receipt container is completely omitted from rendering.
  - **And** component unit tests in [`src/components/__tests__/ComparisonCard.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/ComparisonCard.test.tsx) verify rendering of Cash Saved, Time Cost, and True Benefit with rate > 0, as well as absence when rate = 0.

---

### US-17: Remove Corridors Preset Menu
* **As a** user interacting with the calculator,  
* **I want** a streamlined, distraction-free interface without pre-filled corridor buttons,  
* **So that** I am immediately focused on entering my exact custom origin and destination.  
* *Acceptance Criteria:* The horizontal scrolling "Corridors" button list is completely removed from the UI. Associated preset data structures and state handlers are deleted.

---

### US-18: Remove Header Metadata and Status Badges
**As a** user interacting with the calculator,  
**I want** a clean interface without redundant backend sync statuses or active policy badges,  
**So that** I am not distracted from the primary financial verdict.  

* **Acceptance Criteria:**
  - The "Real-time delta" text element in `src/components/CommuteForm.tsx` is completely removed.
  - The "Auckland Transport & MBIE Weekly Sync" text node in the `src/components/DashboardClient.tsx` footer is completely removed.
  - The "2026 RUC Active" and "AT $50 Cap" pill badges in the `src/components/DashboardClient.tsx` header are deleted from the UI.
  - Unused icon imports (`Zap`, `ShieldCheck`) in `DashboardClient.tsx` are cleaned up.
  - Unit tests in `tests/calculator.test.ts` verify the absence of these elements from the components.

---

### US-19: Tooltip for Vehicle Wear & Tear Benchmark
**As a** commuter evaluating my true driving costs,  
**I want** to see an explanatory tooltip for the default $0.18/km wear and tear rate,  
**So that** I understand the figure is derived from credible New Zealand benchmarks and not arbitrarily inflated.  

* **Acceptance Criteria:**
  - Add an info icon (`<Info />` from `lucide-react`) next to the "AA Wear & Tires ($0.18/km)" label in the UI within the Custom Rates panel of `CommuteForm`.
  - On hover or focus/tap, display an accessible tooltip containing the exact text:  
    *"AA/IRD annual benchmark: $0.18/km covers the average cost of tires, brake pads, and routine servicing for a typical NZ vehicle."*
  - Ensure the tooltip is accessible with proper `aria-label` and `role="tooltip"`, fitting within mobile viewports without horizontal overflow.
  - Unit tests in `src/components/__tests__/CommuteForm.test.tsx` and `tests/calculator.test.ts` verify rendering of the info button and tooltip text.

---

### US-20: Ferry Commute Mode and Waiheke Cap Exception
**As a** maritime or island commuter,  
**I want to** select Ferry as a distinct transit mode and calculate accurate ferry fares,  
**So that** inner-harbour routes benefit from the AT $50 7-day cap while exempt routes like Waiheke Island accurately reflect Fullers commercial rates without artificial capping.  

* **Acceptance Criteria:**
  - Extend `TransitMode` union and add `transitMode?: TransitMode` and `isWaihekeRoute?: boolean` to `CommuteInput`.
  - Add `WAIHEKE_FERRY_FARES` to `src/config/fares.config.ts` with standard HOP single trip ($32.00), daily return ($64.00), monthly pass ($403.00), and concession schedules.
  - In `src/lib/calculator.ts`:
    - When `transitMode === 'FERRY'` and `isWaihekeRoute === true` (or suburb is Waiheke), bypass the AT $50 weekly cap and apply Fullers commercial rates.
    - When `transitMode === 'FERRY'` on standard inner-harbour routes (e.g., Devonport, Birkenhead, Hobsonville), apply standard AT HOP zonal fares and enforce the $50 7-day cap.
  - In `src/components/CommuteForm.tsx`, add a Transit Mode selector with 44px min-height buttons ("Bus / Train" and "Ferry") and silent address detection updating `isWaihekeRoute` when Waiheke is selected.
  - Unit tests verify Devonport ferry respects the $50 cap while Waiheke route exceeds the cap.

---

### US-22: Tooltip for Value of Your Time
**As a** commuter comparing my transit options,  
**I want** to understand what the "Value of Your Time" field means,  
**So that** I know why the calculator is asking for my hourly rate and how it affects the final cost.  

* **Acceptance Criteria:**
  - Add an info icon (`<Info />` from `lucide-react`) next to the "Value of Your Time" input label in `src/components/CommuteForm.tsx`.
  - On hover or tap/focus, display an accessible tooltip containing the exact text:  
    *"The monetary value of your free time. We multiply this hourly rate by your total transit duration to reveal the 'hidden cost' of your commute."*
  - Ensure the tooltip does not overflow on smaller mobile screens with responsive boundaries (`left-0`, `max-w-[calc(100vw-3rem)]`).
  - Unit tests in `src/components/__tests__/CommuteForm.test.tsx` and `tests/calculator.test.ts` verify the presence of the info button and tooltip text in the DOM and component source.

---

### US-11: E-Bike Mode and Payback Timeline
**As an** active commuter considering an electric bicycle,  
**I want to** evaluate an E-Bike commute mode against my driving costs with upfront equipment investment,  
**So that** I know the exact monthly savings and break-even payback period for purchasing an e-bike.  

* **Acceptance Criteria:**
  - Add `'EBIKE'` to `TransitMode` union and support `upfrontSetupCost` and `ebikeCostPerKm` (default $0.0027/km) in `CommuteInput`.
  - In `src/components/CommuteForm.tsx`, add a `'🚲 E-Bike'` mode selector button. When active, hide car fields (Powertrain, RUC, Parking) and display "Upfront Setup Cost" and "Energy Cost/km" inputs.
  - In `src/lib/calculator.ts`, zero out parking and RUC when mode is EBIKE, calculate energy cost based on `distance * ebikeCostPerKm`, and compute `paybackMonths` (`upfrontSetupCost / monthly car savings`).
  - In `src/components/MiniReceipt.tsx`, render a styled Breakeven Alert box showing the payback timeline if `paybackMonths > 0`.
  - Unit tests in `src/lib/__tests__/calculator.test.ts`, `src/components/__tests__/CommuteForm.test.tsx`, and `src/components/__tests__/ComparisonCard.test.tsx` verify calculations, UI state toggles, and alert box rendering.

---

### US-23: Micro-Mobility First/Last Mile (Scooter & Ride)
**As a** commuter who uses an e-scooter to bridge the distance to and from the train station or bus interchange,  
**I want to** evaluate a combined "Scooter & Ride" transit commute comparing rental e-scooters (e.g. Beam, Lime) or a personally owned scooter against driving,  
**So that** I know my true end-to-end travel time savings, monthly rental fees atop AT HOP fares, or the break-even payback period of buying my own scooter.

* **Acceptance Criteria:**
  - Add `'MICROMOBILITY_TRANSIT'` (and aliases) to `TransitMode`. Support `scooterOwnership` (`'OWNED'` | `'RENTAL'`), `scooterCapitalCost` (default $900), and `walkDistanceKm` (default 2.0 km) in `CommuteInput`.
  - In `src/components/CommuteForm.tsx`, provide a `'🛴 Scooter & Ride'` button in the mode selector grid. When active, display ownership toggle (`'⚡ Rental (Beam / Lime)'` vs `'🛴 Personally Owned'`). If rental, display read-only rates for $1.00 unlock and $0.45/min. If owned, provide an upfront capital cost input.
  - In `src/lib/calculator.ts`, recalculate first/last mile legs at 15 km/h cruise speed (e.g., 2.0 km takes 8 minutes, saving 16 minutes vs 5 km/h walking).
  - If rental: calculate daily cost as `2 * ($1.00 + durationMins * $0.45)`. Add this rental fee on top of the statutory capped AT HOP public transit fare.
  - If owned: zero out rental fees, and compute `paybackMonths = round1(scooterCapitalCost / monthlyCarSavings)` against driving.
  - In `src/components/MiniReceipt.tsx`, clearly split out rental scooter fees from capped AT HOP fares, or render the Breakeven Alert box for an owned scooter.
  - In `src/lib/urlParams.ts`, serialize and parse `scooterType`, `scooterCost`, and `walkKm` query parameters.
  - Unit tests in `src/lib/__tests__/calculator.test.ts`, `src/lib/__tests__/urlParams.test.ts`, and `src/components/__tests__/CommuteForm.test.tsx` verify calculation accuracy, speed overrides, and UI rendering.

---

### US-24: Fix Fuel Cost Input Field to Allow Empty String Values
**As a** commuter customizing my fuel expenses,  
**I want to** backspace or clear the Fuel Price input field completely without it immediately snapping back to the default rate,  
**So that** I can fluidly type my own local pump price without fighting automatic input reversion.

* **Acceptance Criteria:**
  - In `src/components/CommuteForm.tsx`, store `fuelCost` as a string in local component state.
  - The input `value` prop uses nullish coalescing (`value={fuelCost ?? ''}`) so clearing the field leaves it blank without snapping back.
  - When the user clears the field or inputs an invalid string, `handleFuelPriceChange` clears the override, allowing the calculation engine in `src/lib/calculator.ts` to apply `DEFAULT_FUEL_RATE` (2.72) only when the calculation is executed.
  - Unit tests in `src/components/__tests__/CommuteForm.test.tsx` verify that clearing the field does not snap back, and tests in `src/lib/__tests__/calculator.test.ts` verify that the engine defaults to `DEFAULT_FUEL_RATE` when fuel cost is undefined or NaN.

---

### US-25: Fix E-Bike Verdict Copy & Remove Leaked Transit Metadata
**As a** commuter evaluating an E-Bike commute,  
**I want** the verdict headline to say "You save $X/month on an E-Bike" instead of "on public transport", and transit-specific metadata (AT HOP Cap, Zone/Corridor labels, $50/wk badge) to be hidden,  
**So that** the results card accurately reflects E-Bike mode without displaying irrelevant AT HOP fare structure details.

* **Acceptance Criteria:**
  - In `src/components/ComparisonCard.tsx`, the verdict headline dynamically uses `modeLabel` to display "on an E-Bike" when `transit.primaryMode === 'E-Bike'` and "on public transport" otherwise.
  - The driving-wins subline also uses `altModeLabel` to say "compared to an E-Bike" when appropriate.
  - The AT HOP Cap block, Corridor block, and `$50/wk Cap` badge are conditionally hidden when `transit.primaryMode === 'E-Bike'`.
  - The transit card footer shows "E-Bike energy cost" instead of "Capped fare active" / "Under $50 cap" for E-Bike mode.
  - Unit tests in `src/components/__tests__/ComparisonCard.test.tsx` verify headline wording and absence of AT HOP Cap, Corridor, and badge elements.
  - The US-14 source-level test in `tests/calculator.test.ts` is updated to assert the dynamic `${modeLabel}` pattern.

---

### US-26: Conventional Hybrid (HEV) Powertrain Option, Custom L/100km Override, Powertrain Tooltip & 2x3 Icon Grid
**As a** hybrid vehicle commuter (e.g. Prius, Aqua, Corolla Hybrid) or driver with known fuel consumption,  
**I want to** select Conventional Hybrid (HEV) with 4.5 L/100km default efficiency and $0.00/km RUC, view an explanatory Powertrain tooltip, input a custom L/100km override for fuel-consuming powertrains, and interact with a modern 2x3 icon grid with compact labels, baseline values, and an HEV explanatory tooltip,  
**So that** my commute cost reflects my vehicle's exact fuel consumption while the UI remains compact, responsive, and visually intuitive.

* **Acceptance Criteria:**
  - Added `'HEV'` to `VehiclePowertrain` (and `Powertrain` alias) and `'hev'` to `VehicleType` in `src/types/index.ts`.
  - In `src/components/CommuteForm.tsx`, included `'Hybrid (Non-Plug-in)'` in the powertrain selector with a default fuel consumption of `4.5 L/100km`.
  - In `src/lib/calculator.ts` and `src/config/fares.config.ts`, HEV vehicles apply a `$0.00/km` RUC rate while calculating fuel expenses using pump petrol price and distance.
  - Added an accessible info icon with hover tooltip beside the "Powertrain" UI label with text: *"Default values are based on national averages. For a more accurate calculation, enter your vehicle's exact L/100km rating."*
  - Dynamically rendered a "Custom L/100km" numeric input field below the powertrain selector only when a fuel-consuming powertrain (ICE, HEV, PHEV) is selected.
  - Hidden this input and explicitly cleared its React state value when a pure EV (`BEV`) is selected to prevent stale data.
  - Updated the calculation engine (`src/lib/calculator.ts`) to prioritize the custom input if provided, falling back to the baseline average.
  - Refactored the powertrain selector container to a responsive 2x3 grid layout (`grid grid-cols-3 gap-2`).
  - Rendered `lucide-react` icons for each button: `Fuel` for 91, 95, and Diesel; `Leaf` for HEV; `Plug` for PHEV; and `Zap` for EV.
  - Condensed the button labels to display the icon, the compact abbreviation (91, 95, Diesel, HEV, PHEV, EV), and the baseline value ("7.6 L", "8.8 L", "+RUC", "4.5 L", "3.8 L", "+RUC") underneath.
  - Wrapped the HEV button in a tooltip displaying *"Non-plug-in hybrid"* to preserve the description without breaking layout symmetry.
  - Unit tests in `src/components/__tests__/CommuteForm.test.tsx` and `src/lib/__tests__/calculator.test.ts` verify HEV zero-RUC calculations, tooltip rendering, dynamic input display/hiding, state clearing, calculation override prioritization, and 2x3 icon grid layout.
  - Production build and test suite (`npx vitest run`) pass with 100% success.

---

### US-27: 'Buy Me a Coffee' Donation Button (Revolut.me)
**As an** appreciative commuter and user of the dashboard,  
**I want to** easily find a "Buy Me a Coffee" donation link in both the header and the footer,  
**So that** I can tip and financially support the creator via Revolut.me or other payment links.

* **Acceptance Criteria:**
  - Created reusable `DonationButton` component (`src/components/DonationButton.tsx`) styled with standard Tailwind CSS.
  - Supports a `variant` prop accepting `'header'` (subtle icon with minimal text) and `'footer'` (full "Buy Me a Coffee" text with `☕` emoji).
  - Renders an `<a>` tag with `target="_blank"`, `rel="noopener noreferrer"`, and `href` set to `process.env.NEXT_PUBLIC_DONATION_URL` (falling back cleanly to `'#'`).
  - Rendered `'header'` variant in the main navigation bar and `'footer'` variant in the application footer (`src/components/DashboardClient.tsx`).
  - Unit tests in `src/components/__tests__/DonationButton.test.tsx` verify anchor tag properties, both variants, and URL/fallback handling.
  - Verification via `npx vitest run` and `npm run build` succeeds with zero errors.

---

### US-28: Address Geocoding & Nearest Station Spatial Search with Segmented Timeline UI
**As an** Auckland commuter traveling from a specific street address,  
**I want to** type my origin and destination addresses with autocomplete, discover my nearest rapid transit station automatically, and view a visual timeline of my commute legs,  
**So that** I understand the exact time, distance, and running costs for each segment (driving to the station, public transit, and walking to my desk).

* **Acceptance Criteria:**
  - Integrated Mapbox Geocoding API into the "To" and "From" inputs in `src/components/CommuteForm.tsx` with autocomplete dropdowns, storing geocoded `[lng, lat]` coordinates and address text in state.
  - Created a static GeoJSON dataset at `src/data/at-stations.json` containing 45 major Auckland Transport hubs (Train stations, Northern Busway stations, Ferry terminals, and major bus interchanges) with metadata (Park & Ride availability, zone, region).
  - Implemented client-side spatial search in `src/lib/stations.ts` using `@turf/nearest-point` to calculate the closest transit station and distance in kilometers to the commuter's origin coordinates.
  - Built `src/components/JourneyTimeline.tsx` for the results panel in `src/components/DashboardClient.tsx`, visually breaking down the commute into segmented nodes (e.g. Drive to Station, Transit Ride, Walk to Desk) with leg times, distances, and costs.
  - Updated `src/lib/calculator.ts` to compute first-mile running costs (fuel/energy, RUC, wear & tear) and AT HOP fares separately, aggregating them into the final daily, weekly, monthly, and annual transit totals without breaking baseline test suites.
  - Comprehensive unit test suites in `src/lib/__tests__/calculator.test.ts`, `src/lib/__tests__/stations.test.ts`, `src/components/__tests__/JourneyTimeline.test.tsx`, and `src/components/__tests__/CommuteForm.test.tsx`.
  - All 89 test suites pass and Next.js production build (`npm run build`) compiles with zero errors.

---

### US-30: AT GTFS API Local Stop Integration
**As a** multimodal commuter walking or scootering to public transit,  
**I want** the system to find my closest local Auckland Transport bus stop or train station via the AT GTFS API and calculate precise walking/scootering travel times,  
**So that** my first-mile commute reflects an actual neighborhood stop rather than forcing me to travel all the way to a distant regional Park & Ride hub, while preserving offline Turf.js station logic for driving commutes.

* **Acceptance Criteria:**
  - Created a Next.js API route at `src/app/api/nearest-stop/route.ts` that validates `[lng, lat]` coordinates and queries the official Auckland Transport GTFS API (`https://api.at.govt.nz/gtfs/v3/stops`) using `AT_API_KEY` / `AT_API_SUBSCRIPTION_KEY`, calculating nearest stop distance via Haversine and falling back gracefully to static station data if rate-limited or offline.
  - Updated `src/components/JourneyTimeline.tsx` to query `/api/nearest-stop` when non-driving modes are active (`WALK`, `SCOOTER`), displaying the specific local stop name and stop code badge.
  - Retained offline Turf.js spatial search against `src/data/at-stations.json` exclusively for driving modes (`DRIVE`).
  - Wired returned local stop coordinates into `fetchDirectionsRoute` (Mapbox Directions API) using walking or cycling routing profiles to provide real-time travel durations and distances for the first-mile leg.
  - Unit tests in `src/app/api/nearest-stop/__tests__/route.test.ts` and `src/components/__tests__/JourneyTimeline.test.tsx` verify API validation, fallback behavior, driving vs non-driving mode routing, and UI rendering.
  - All 93 Vitest unit tests pass and Next.js production build (`npm run build`) succeeds with zero errors.

---

### US-31: Render and Integrate 'KiwiPathway' Logo
**As an** application visitor,  
**I want** to see the custom KiwiPathway brand identity icon in the primary top-left navigation,  
**So that** the dashboard has an intuitive, distinctive visual brand representing New Zealand transit routes and forward momentum.

* **Acceptance Criteria:**
  - Created a reusable React SVG icon component at `src/components/icons/KiwiPathwayIcon.tsx` translating raw SVG elements to standard JSX attributes (`strokeWidth`, `strokeLinecap`, `strokeLinejoin`, `role="img"`).
  - Uses `currentColor` stroke and fill to dynamically inherit Tailwind text color classes (such as `text-emerald-500`).
  - Replaced the top-left bus icon in `src/components/DashboardClient.tsx` with `<KiwiPathwayIcon className="h-8 w-8 text-emerald-500 shrink-0" aria-label="Kiwi Commuter" />`.
  - Preserved adjacent typography alignment (`text-base sm:text-lg font-bold text-white` title and `text-xs text-slate-400` subtitle) and spacing (`gap-2.5`).
  - Unit tests in `src/components/__tests__/KiwiPathwayIcon.test.tsx` verify SVG rendering, paths, attributes, and header integration.

---

### US-21: End-to-End Multimodal Journey Routing (Google Routes API)
**As a** commuter with a geocoded origin and destination,  
**I want** the transit duration shown on the JourneyTimeline to reflect real-world timetables,  
**So that** the time-cost comparison is accurate rather than based on static suburb estimates.

* **Acceptance Criteria:**
  - Created `src/app/api/routes/route.ts` — a server-side Next.js API route (GET) that accepts `originLng`, `originLat`, `destinationLng`, `destinationLat` query params and calls the Google Routes API v2 endpoint (`https://routes.googleapis.com/directions/v2:computeRoutes`) with `travelMode: "TRANSIT"`.
  - Uses `X-Goog-Api-Key` and `X-Goog-FieldMask: routes.duration,routes.legs.duration,routes.legs.steps.staticDuration,routes.legs.steps.travelMode` headers to minimise billing impact.
  - Sums `routes[0].duration` (route-level total inclusive of transfers and waiting time); falls back to summing individual leg durations if route-level is unavailable.
  - Returns `{ transitDurationMins, legCount, source, departureTime }` where `source` is `"google_routes_api"` on success or `"fallback_none"` when the API key is absent or the call fails.
  - Default `departureTime` is computed as the next weekday Monday at 08:00 NZST for stable timetable routing.
  - Response is server-cached for 1 hour (`Cache-Control: public, max-age=3600, stale-while-revalidate=7200`) to avoid redundant billing charges.
  - Added `GOOGLE_ROUTES_API_KEY` to `.env.example` with provisioning instructions.
  - Updated `src/components/DashboardClient.tsx` with a `useEffect` that fetches `/api/routes` whenever `originCoordinates` and `destinationCoordinates` are set (from US-28 Mapbox autocomplete). On success, injects `data.transitDurationMins` into `commuteInput.transitTimeMins` so the `calculateCommuteArbitrage` engine uses real-world data.
  - The effect is skipped for `EBIKE` transit mode (no AT transit involved) and cleans up on unmount.
  - Updated `src/components/JourneyTimeline.tsx` to display a pulsing `●` indicator labelled "Transit duration sourced from real-world timetable routing" when coordinates are active.
  - Graceful degradation: if `GOOGLE_ROUTES_API_KEY` is not set, the API route returns `source: "fallback_none"` and the dashboard silently retains the static suburb-based transit estimate.
  - **Fix (5-min Discrepancy)**: Resolved issue where the middle transit leg defaulted to 5 minutes by:
    1. Updating Google Routes API field mask to include `routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails`.
    2. Summing all in-vehicle transit step durations (`totalTransitMins += stepMins`) rather than overwriting in a loop.
    3. Parsing line names via `nameShort`, `shortName`, and `headsign` (e.g. 25B and OUT).
    4. Prioritizing `transitRideDurationMins` in `src/lib/calculator.ts` so the middle leg displays pure in-vehicle travel time (~30–41 mins for Mt Roskill to Parnell) instead of subtracting walking legs from static estimates.
    5. Adding step breakdown pills to `src/components/JourneyTimeline.tsx` for multi-leg journeys.
  - Unit tests in `src/app/api/routes/__tests__/route.test.ts` verify duration parsing, validation logic, file-level contract (TRANSIT travelMode, API key env, fallback source), DashboardClient wiring assertion, multi-step accumulator logic, reproduction test for Mt Roskill to Parnell, and `.env.example` documentation.
  - All Vitest tests pass and Next.js production build succeeds.

---

## Backlog Stories (PENDING)

### US-08: Greater Wellington / Metlink Expansion
**As a** Wellington commuter,  
**I want to** compare driving into Wellington CBD against Metlink rail and bus zones,  
**So that** the dashboard serves multi-region New Zealand commuters.

* **Planned Criteria:**
  - Regional toggle between Greater Auckland (AT) and Greater Wellington (Metlink).
  - Metlink 14-zone fare structure across Kapiti Coast, Hutt Valley, Johnsonville, and Wairarapa corridors.
  - Snapper card fare schedules and 30-day passes.

---

### US-12: Park & Ride Multimodal Hybrid Route
**As a** suburban commuter living beyond walking distance to rapid transit,  
**I want to** calculate a multimodal route (driving to a Park & Ride station, then taking a bus/train to CBD),  
**So that** I can see the financial arbitrage of hybrid commuting vs driving the entire distance into the CBD.

* **Planned Criteria:**
  - Multimodal corridor options (e.g. driving Albany to Albany Station, taking NX1 bus to CBD).
  - Split driving cost (short suburban leg + free/paid park-and-ride facility) + single-seat transit fare.

