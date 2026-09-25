# Agile User Stories & Acceptance Criteria

## Shipped Stories

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

### US-05: Mobile-First Responsive UI & Interactive Map
**As a** mobile user on iOS Safari or Android Chrome,  
**I want** an uncluttered, responsive interface with interactive route visualization,  
**So that** I can easily toggle parameters and view the commute corridor on a map without UI lag.

* **Acceptance Criteria:**
  - All touch targets (pills, segmented buttons) meet WCAG standards (>= 44px min height).
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

## Planned Backlog Stories

### US-07: Carpool Passenger Split Engine
**As a** driver who commutes with coworkers or family,  
**I want to** divide parking, RUC, and fuel costs by passenger count (1–4),  
**So that** I can see the multi-passenger tipping point against individual public transit fares.

---

### US-08: Greater Wellington / Metlink Expansion
**As a** Wellington commuter,  
**I want to** compare driving into Wellington CBD against Metlink rail and bus zones,  
**So that** the dashboard serves multi-region New Zealand commuters.
