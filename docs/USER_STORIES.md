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
| **US-09** | EV Public Charging vs. Home Off-Peak Rate Arbitrage | **DONE** | [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx) | 4 presets: Home Off-Peak ($0.18), Flat ($0.30), Public DC ($0.85), Custom; PHEV 35km split. |
| **US-10** | AT Concession Profiles (Tertiary, Youth, Community Connect) | **DONE** | [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts) | Full concession schedule: Tertiary (20% off), Youth/Community (50% off), SuperGold. |
| **US-11** | Active Commute & Micro-Mobility Mode | **PENDING** | Backlog (`src/types/index.ts`) | E-Bike / active commute mode with capex payback timeline not yet implemented. |
| **US-12** | Park & Ride Multimodal Hybrid Route | **PENDING** | Backlog (`src/config/suburbs.ts`) | Station parking + rail transfer multi-leg route calculations not yet modeled. |
| **US-13** | Monetized Travel Time & Opportunity Cost | **PARTIAL** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) | Monthly transit hours reclaimed is computed, but hourly wage presets are not yet wired. |
| **US-14** | Plain-Language Financial Verdicts | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) | Direct conversational savings verdicts ("You save $X/mo...", "MONTHLY VERDICT" badge). |
| **US-15** | Privacy-Friendly Traffic & Web Analytics Integration | **DONE** | [`src/app/layout.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/layout.tsx), [`package.json`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/package.json) | `@vercel/analytics` installed and `<Analytics />` component embedded in RootLayout. |

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
  - **Then** display a Charging Source toggle with four presets:
    1. **Home Off-Peak** (Default: `$0.18/kWh`)
    2. **Home Standard / Flat** (`$0.30/kWh`)
    3. **Public DC Fast / ChargeNet** (`$0.85/kWh`)
    4. **Custom** (User-specified numeric input in $/kWh)
  - **When** switching between presets:
    - Daily energy cost updates dynamically in real-time.
    - Statutory RUC remains invariant ($0.076/km for BEV, $0.038/km for PHEV).
    - PHEV calculates first 35 km electric on the selected rate, and remainder on petrol backup (default $2.72/L, 6.0 L/100km).
    - BEV calculates all roundtrip distance on the selected rate (default 16.5 kWh/100km or custom efficiency).
    - URL search parameters serialize and parse `evChargeMode` (`home_offpeak`, `home_flat`, `public_dc`, `custom`).

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
  - **And** replace abstract financial badges like `"Monthly Arbitrage"` with `"MONTHLY VERDICT"`.

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

## In Progress / Partially Implemented Stories (PARTIAL)

### US-13: Monetized Travel Time & Opportunity Cost
**As a** busy professional,  
**I want to** assign a monetary value to my travel time (e.g. $0, $25, $50/hr),  
**So that** I can assess the Generalized Cost of driving in traffic vs reclaiming productivity hours on the train or busway.

* **Current Implementation:**
  - Monthly reclaimed transit time is calculated in `src/lib/calculator.ts` (`hoursReclaimedMonthly = round1(transitHoursMonthly * 0.75)`) and displayed as a metric in `ComparisonCard.tsx`.
* **Gaps Remaining for Full Completion:**
  - UI slider/presets for hourly travel time valuation ($0, $25, $50/hr).
  - Generalized cost calculation factoring monetized time deltas into net arbitrage verdict.

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

### US-11: Active Commute & Micro-Mobility Mode
**As an** active commuter considering an e-bike,  
**I want to** compare the total cost of ownership of an electric bicycle against both driving and public transit,  
**So that** I can calculate the break-even payback period of purchasing an e-bike.

* **Planned Criteria:**
  - Powertrain option for E-Bike (~$0.02/km charging + $0.05/km amortized tire/chain maintenance).
  - Capital expenditure amortization calculator ($1,500–$4,000 upfront purchase price).
  - Payback period visualizer (months until transit/fuel savings pay off the bicycle).

---

### US-12: Park & Ride Multimodal Hybrid Route
**As a** suburban commuter living beyond walking distance to rapid transit,  
**I want to** calculate a multimodal route (driving to a Park & Ride station, then taking a bus/train to CBD),  
**So that** I can see the financial arbitrage of hybrid commuting vs driving the entire distance into the CBD.

* **Planned Criteria:**
  - Multimodal corridor options (e.g. driving Albany to Albany Station, taking NX1 bus to CBD).
  - Split driving cost (short suburban leg + free/paid park-and-ride facility) + single-seat transit fare.
