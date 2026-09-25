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

## Planned Backlog Stories

### US-06: URL Search Param State Persistence & Sharing
**As a** commuter,  
**I want to** share my exact commute comparison via a direct URL,  
**So that** my colleagues can view the identical calculations without re-entering parameters.

---

### US-07: Carpool Passenger Split Engine
**As a** driver who commutes with coworkers or family,  
**I want to** divide parking, RUC, and fuel costs by passenger count (1–4),  
**So that** I can see the multi-passenger tipping point against individual public transit fares.

---

### US-08: Greater Wellington / Metlink Expansion
**As a** Wellington commuter,  
**I want to** compare driving into Wellington CBD against Metlink rail and bus zones,  
**So that** the dashboard serves multi-region New Zealand commuters.
