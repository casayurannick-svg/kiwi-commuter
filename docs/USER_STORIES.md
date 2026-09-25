# Agile User Stories & Acceptance Criteria: Kiwi Commuter

This document catalogues all delivered and backlog user stories for **Kiwi Commuter**, formatted according to standard Agile principles with explicit Gherkin Acceptance Criteria (Given-When-Then).

---

## Completed User Stories (v1.0.0)

### US-001: Suburb Centroid Matrix & Zone Evaluation
* **As an** Auckland commuter,  
* **I want** to select my origin and destination from a comprehensive list of Auckland suburbs,  
* **So that** the system accurately determines my AT fare zones, driving distance, and transit modes.

#### Acceptance Criteria
- **Given** the user opens the corridor selector,
- **When** they choose any of the 50 Auckland suburbs (e.g. Albany, Henderson, Epsom, Manukau),
- **Then** the application retrieves the exact centroid coordinates, regional zone (1 to 5), and default distance to Auckland CBD.
- **And** aliases such as `britomart_cbd` cleanly map to the CBD centroid.

---

### US-002: Comprehensive Driving Cost Evaluation
* **As a** vehicle owner,  
* **I want** the driving cost to incorporate fuel/power, statutory NZTA RUC, parking, and maintenance,  
* **So that** I understand my true daily, weekly, and monthly vehicle expenditure.

#### Acceptance Criteria
- **Given** a vehicle powertrain selection (`Petrol 91`, `Petrol 95`, `Diesel`, `PHEV`, `BEV`),
- **When** calculating driving operating costs,
- **Then** pure electric BEVs and Diesel vehicles apply the statutory NZTA RUC rate of `$0.076/km`.
- **And** PHEVs apply the reduced statutory rate of `$0.038/km`.
- **And** petrol vehicles are exempt from RUC (`$0.000/km`).
- **And** parking rates apply based on selected tier (`CBD Early-Bird $22`, `CBD Casual $35`, `Suburban $14`, `Free $0`, or `Custom`).
- **And** carpool passenger split divides fuel, RUC, and parking evenly across occupants.

---

### US-003: Auckland Transport Zonal Fares & $50 7-Day Cap
* **As a** public transit rider,  
* **I want** the system to calculate my weekly public transport fare with the AT $50 7-Day Cap,  
* **So that** I never get quoted more than $50/week for transit travel.

#### Acceptance Criteria
- **Given** an origin and destination crossing $N$ zones,
- **When** the uncapped weekly return fare exceeds $50.00 (e.g. 5 days from Zone 4 Albany = $77.00/wk),
- **Then** the weekly fare is capped at exactly `$50.00`.
- **And** the comparison badge highlights `$50/wk Cap Applied`.
- **Given** a commute whose uncapped fare is under $50.00 (e.g. 3 days from Zone 1 Epsom = $15.60/wk),
- **When** calculated,
- **Then** the weekly fare remains at the uncapped rate (`$15.60`), with no cap applied.

---

### US-004: Automated MBIE Weekly Fuel Price Sync
* **As an** engineer and user,  
* **I want** retail fuel prices (91, 95, Diesel) updated automatically from the Ministry of Business, Innovation and Employment (MBIE),  
* **So that** calculations reflect current Auckland pump prices without manual maintenance.

#### Acceptance Criteria
- **Given** the weekly GitHub Actions cron triggers every Monday at 19:00 UTC,
- **When** `scripts/fetch-mbie-fuel.ts` executes,
- **Then** it parses the latest retail row from the official MBIE CSV.
- **And** it converts cents/L to dollars/L and upserts the snapshot into Supabase `fuel_benchmarks`.
- **And** if upstream returns an anti-bot WAF HTML challenge, the scraper gracefully falls back to synthetic weekly benchmarks without crashing.

---

### US-005: Interactive Side-by-Side Arbitrage Dashboard
* **As an** Auckland commuter,  
* **I want** to adjust my office days, vehicle type, and parking rates in real-time,  
* **So that** I can instantly view my net monthly savings without page reloads.

#### Acceptance Criteria
- **Given** any parameter change in `CommuteForm`,
- **When** updated,
- **Then** the `ComparisonCard` updates instantly with tabular figures.
- **And** if transit is cheaper, it displays `Save $XX / month by switching to AT Transit` (or `+$XX/mo with AT Transit`).
- **And** if driving is cheaper, it displays `Driving is $XX cheaper per month` (or `+$XX/mo Driving`).
- **And** `MonthlySavingsChart` updates stacked segments: `[Fuel / Power, NZTA RUC, Central Parking]` vs `[AT HOP Fare]`.

---

### US-006: Interactive Mapbox Route & Transit Overlay
* **As an** interactive visual learner,  
* **I want** to see my corridor plotted on a map with driving and transit layer toggles,  
* **So that** I can visualize travel times and public transport connections.

#### Acceptance Criteria
- **Given** valid origin and destination centroids,
- **When** the map is rendered,
- **Then** it plots the driving route LineString with start (Emerald) and end (Sky Blue) markers.
- **And** toggling between 🚗 **Drive** and 🚆 **Transit** changes the active layer styling.
- **And** if running without an active Mapbox token or offline, it falls back to a vector Auckland isthmus visualizer displaying the Northern Busway, Western Line, and Southern Line.

---

### US-007: Mobile-First Responsive Design & Safe Area Optimization
* **As a** smartphone user on iOS or Android,  
* **I want** touch targets to be comfortable and the page to fit without horizontal scrolling,  
* **So that** I can easily calculate my commute on the go.

#### Acceptance Criteria
- **Given** a mobile viewport (iPhone 14/15, Pixel 7, Galaxy S24),
- **When** navigating the dashboard,
- **Then** all segmented buttons and interactive elements maintain a minimum touch height of `44px`.
- **And** inputs use `font-size: 16px` to prevent iOS Safari auto-zooming.
- **And** the viewport meta includes `viewportFit: 'cover'` and safe area bottom padding `safe-pb`.
- **And** the map uses `cooperativeGestures: true` so two-finger scroll prevents scroll trapping.
- **And** layout flows in a logical single-column mobile sequence: Form ➔ Comparison Card ➔ Map ➔ Chart ➔ Fuel Radar.

---

## Backlog User Stories (Roadmap)

### US-008: Real-Time GTFS Delay Penalty Modifiers
* **As a** daily commuter,  
* **I want** the calculator to factor in real-time Auckland Transport service reliability and cancellation rates,  
* **So that** my time-value calculation reflects actual corridor performance rather than scheduled timetable times.

#### Acceptance Criteria
- Query the Auckland Transport GTFS-RT Trip Updates API (`/v2/public/routes-optimised`).
- Calculate an on-time reliability score for the selected corridor.
- Apply a dynamic "Buffer Time Penalty" in the hours reclaimed metric.

---

### US-009: Park & Ride Hybrid Commute Integration
* **As a** suburban driver living outside easy walking distance of a rapid transit station,  
* **I want** to model a hybrid commute (Drive to Park & Ride + Train/Busway to CBD),  
* **So that** I can compare a hybrid journey against pure driving and pure walking transit.

#### Acceptance Criteria
- Allow selecting a Park & Ride facility (e.g. Albany, Silverdale, Papakura, Panmure).
- Compute partial driving fuel + free P&R parking + capped transit fare.

---

### US-010: Employer Commuter Subsidies & FBT Tax Arbitrage
* **As a** corporate employee or HR manager,  
* **I want** to calculate the impact of employer public transport subsidies,  
* **So that** we can evaluate tax-exempt public transport fringe benefits under NZ IRD guidelines.

#### Acceptance Criteria
- Add an "Employer PT Subsidy" toggle (% or dollar contribution per month).
- Account for zero Fringe Benefit Tax (FBT) on employer-provided public transport passes.

---

### US-011: Progressive Web App (PWA) Offline Shell
* **As a** mobile user on intermittent network connections,  
* **I want** Kiwi Commuter to install to my home screen as a standalone PWA,  
* **So that** I can run calculations offline with cached tariffs.

#### Acceptance Criteria
- Add `manifest.json` and service worker caching static assets and suburb centroid tables.
- Enable `Add to Home Screen` prompt on iOS Safari and Android Chrome.
