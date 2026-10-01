# KiwiCommuter Architecture & Codebase Audit (2026)

## Executive Summary & Context
This audit provides a comprehensive structural, mathematical, and architectural map of the **KiwiCommuter** (`nz_transport_cost_dashboard`) application prior to refactoring from the current single-page vertical scroll layout into a tabbed, layered-disclosure experience. 

The audit covers framework conventions, domain calculations, Supabase data ingestion pipelines, URL state bidirectional synchronization, UI components, automated testing infrastructure, and specific discrepancy verifications requested in **STORY-0**.

---

## 1. Framework, Folder Structure & Styling / Dark Mode Tokens

### 1.1 Tech Stack & Tooling
- **Framework**: Next.js 14.2.35 (App Router, React 18, TypeScript 5).
- **Styling**: Tailwind CSS 3.4.1 with PostCSS, `clsx`, `tailwind-merge`.
- **Icons**: `lucide-react` (v1.48.0).
- **Mapping & Geospatial**: `mapbox-gl` (v3.31.0), `@turf/helpers` (v7.4.0), `@turf/nearest-point` (v7.4.0).
- **Charts**: `recharts` (v3.10.1).
- **Analytics**: `@vercel/analytics` (v2.0.1).
- **Database / Backend**: `@supabase/supabase-js` (v2.117.1).
- **Test Runners**: Node.js native test runner (`tsx --test`), Vitest (v4.1.11), Playwright (v1.63.0).

### 1.2 Folder Hierarchy
```
nz_transport_cost_dashboard/
├── .github/workflows/          # GitHub Actions (CI & MBIE fuel scraper cron)
├── docs/                       # PRD, SYSTEM_DESIGN, USER_STORIES, ADRs
├── scripts/                    # fetch-mbie-fuel.ts (MBIE weekly CSV pipeline)
├── supabase/migrations/        # SQL DDL schemas and RLS policies
├── tests/                      # Integration and E2E specs (calculator, fare-cap, ui)
└── src/
    ├── app/                    # Next.js App Router root layout, page, and API routes
    │   ├── api/
    │   │   ├── calculate/      # POST: Stateless server-side commute arbitrage calculation
    │   │   ├── feedback/       # POST: Automated GitHub Issues integration for user feedback
    │   │   ├── fuel/           # GET: MBIE benchmark fuel prices with 1-hr ISR caching
    │   │   ├── nearest-stop/   # GET: Spatial nearest AT transit stop lookup
    │   │   ├── routes/         # POST: Mapbox Directions API proxy
    │   │   └── transit/        # POST: Auckland Transport GTFS/routing endpoint
    │   ├── globals.css         # Global Tailwind directives, CSS variables, glassmorphism
    │   ├── layout.tsx          # Root HTML layout, metadata, Vercel analytics
    │   └── page.tsx            # Server Component fetching initial fuel benchmarks
    ├── components/             # React Client & Server UI components
    │   ├── __tests__/          # Component-level render & unit tests
    │   ├── ui/                 # Atomic UI primitives
    │   ├── icons/              # Custom SVG vectors (e.g. KiwiPathwayIcon)
    │   ├── CommuteForm.tsx     # Primary input form (addresses, vehicles, parking, toggles)
    │   ├── CommuteMatrix.tsx   # FEAT-75: 3-Way side-by-side cost matrix (ICE vs EV vs Transit)
    │   ├── ComparisonCard.tsx  # Verdict hero card with arbitrage savings & IRD toggle
    │   ├── DashboardClient.tsx # Master interactive client layout coordinator
    │   ├── DonationButton.tsx  # Ko-fi / Buy Me a Coffee modal trigger
    │   ├── EvRoiSandbox.tsx    # FEAT-65: Interactive TCO arbitrage & break-even timeline
    │   ├── FeedbackModal.tsx   # In-app feedback reporter modal
    │   ├── FuelRadarWidget.tsx # Live MBIE fuel price radar and fuel station benchmark
    │   ├── JourneyTimeline.tsx # Multi-modal trip itinerary visualizer with station legs
    │   ├── MiniReceipt.tsx     # Itemized balance sheet breakdown receipt
    │   ├── MonthlySavingsChart.tsx # Recharts breakdown & 12-month cumulative projection
    │   ├── RouteMap.tsx        # Mapbox GL interactive commute route visualizer
    │   ├── ShareButton.tsx     # Shareable permalink generator with toast feedback
    │   ├── Tooltip.tsx         # Collision-avoidant accessible tooltip component
    │   └── ZoneBadge.tsx       # AT HOP zonal badge pill
    ├── config/                 # Static domain configuration
    │   ├── fares.config.ts     # Statutory RUC, AT HOP fares, parking tiers, vehicle presets
    │   └── suburbs.ts          # 50 Auckland suburbs, regional centroids, distance matrices
    ├── constants/              # Static constants and ferry matrices
    │   ├── fares.ts            # Ferry fare tiers (Inner/Mid/Outer Harbor), haversine helpers
    │   └── fares.test.ts       # Fare constants regression tests
    ├── data/
    │   └── at-stations.json    # Static database of Auckland Transport train & busway stations
    ├── hooks/
    │   ├── __tests__/          # Custom hook tests
    │   └── useCommuteForm.ts   # Master form state hook with debounced URL synchronization
    ├── lib/                    # Core business logic & utility modules
    │   ├── __tests__/          # Pure function unit tests
    │   ├── calculator.ts       # SINGLE SOURCE OF TRUTH: Commute arbitrage & TCO math engine
    │   ├── fares.ts            # Public transport fare lookup helpers
    │   ├── github.ts           # GitHub API client for feedback reporting
    │   ├── mapbox.ts           # Mapbox Geocoding & Directions API integrations
    │   ├── routes.ts           # Geodesic & haversine route distance estimators
    │   ├── stations.ts         # Turf.js nearest-station spatial calculation
    │   ├── supabase.ts         # Supabase client, query functions, fallback benchmarks
    │   └── urlParams.ts        # URL query parameter serialization and parsing engine
    └── types/
        └── index.ts            # Domain TypeScript types, interfaces, enums, unions
```

### 1.3 Styling Tokens & Dark Mode Architecture
- **Theme Mode**: Dark-mode only by design (`#090d16` canvas background).
- **CSS Variables** (in [src/app/globals.css](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/globals.css)):
  - `--background`: `#090d16` (Deep Obsidian / Midnight Slate)
  - `--foreground`: `#f8fafc` (Slate 50)
  - `--card-bg`: `rgba(15, 23, 42, 0.75)` (Slate 900 semi-transparent)
  - `--card-border`: `rgba(255, 255, 255, 0.08)` (Subtle white border)
- **Glassmorphism Classes**:
  - `.glass-panel`: `bg-[rgba(15,23,42,0.65)] backdrop-blur-md border border-white/10 shadow-xl`
  - `.glass-panel-elevated`: `bg-[rgba(15,23,42,0.85)] backdrop-blur-lg border border-white/12 shadow-2xl`
- **Semantic Palette (Tailwind standard palette)**:
  - **Emerald (`emerald-400`, `emerald-500`, `emerald-950`)**: Savings, financial surplus, AT transit modes, profitable break-even.
  - **Cyan (`cyan-400`, `cyan-500`, `cyan-950`)**: Electric Vehicles (EV/BEV), electricity rates, modern tech accents.
  - **Amber / Orange (`amber-400`, `amber-500`, `amber-950`)**: Combustion engines (ICE), diesel, fuel costs, statutory RUC charges.
  - **Sky / Blue (`sky-400`, `sky-500`)**: Time valuation, geocoded address coordinates, Mapbox routes.
  - **Rose / Red (`rose-400`, `rose-500`, `rose-950`)**: Financial deficits, upfront vehicle purchase hurdles, losses.
  - **Slate (`slate-100` to `slate-950`)**: Backgrounds, typography hierarchies, card surfaces, borders.

---

## 2. Cost Calculators, Single Source of Truth & IRD Rate Storage

### 2.1 Single Source of Truth: `src/lib/calculator.ts`
All mathematical formulations for commuter arbitrage exist in [src/lib/calculator.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts). Neither UI components nor API routes calculate costs independently; they invoke functions from this file.

Key functions:
1. `calculateCommuteArbitrage(input: CommuteInput): CommuteComparisonResult`:
   - Computes daily, weekly, monthly, and annual driving costs vs. transit costs.
   - Calculates monthly CO2 emissions and time valuation differentials.
   - Generates itemized `JourneyLeg[]` itineraries for first-mile, linehaul transit, and driving.
2. `calculateTcoArbitrage(input: TcoInput): TcoArbitrageResult`:
   - FEAT-65: Models multi-year total cost of ownership (TCO) comparing ICE vs. EV.
   - Evaluates initial capital delta: `evPurchasePrice - iceTradeInValue`.
   - Projects annual operational savings factoring fuel vs. energy, statutory RUC differentials, and maintenance differentials ($800/yr ICE vs. $400/yr EV).
   - Generates year-over-year cumulative costs and calculates exact break-even time in years and months.

### 2.2 Rate Tables & Configuration: `src/config/fares.config.ts`
Static rates and benchmarks are stored in [src/config/fares.config.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts) and [src/constants/fares.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/constants/fares.ts):

- **Inland Revenue Department (IRD) Mileage Rate**:
  - `IRD_MILEAGE_RATE_PER_KM = 1.20` ($1.20/km).
  - Used when `calculationMode === 'IRD_TRUE_COST'`.
  - Comprehensive Tier 1 benchmark covering fuel, depreciation, WOF, Rego, maintenance, and insurance for light passenger vehicles up to 14,000 km/yr.
  - *Cross-Reference Note*: For the 2026–2027 tax year, Inland Revenue published updated Tier 1 rates. The repository currently stores `$1.20/km`.
- **Statutory NZTA Road User Charges (RUC)**:
  - Light EV (BEV): `$0.076/km` (`$76.00 / 1,000 km`) + `$12.44` transaction fee. Under *Road User Charges (Light Electric RUC) Amendment 2024*.
  - Plug-in Hybrid (PHEV): `$0.038/km` (`$38.00 / 1,000 km`) + `$12.44` transaction fee. Under *Road User Charges (PHEV Reduced Rate) Amendment 2024*.
  - Diesel: `$0.076/km` (`$76.00 / 1,000 km`) + `$12.44` transaction fee. Under *Road User Charges Act 2012*.
  - Petrol (91/95) & Conventional Hybrid (HEV): `$0.00/km` (Exempt; road tax collected at pump via Fuel Excise Duty).
- **Auckland Transport (AT HOP) Zonal Fares (Updated Feb 2026)**:
  - Zone 1: `$3.00`
  - Zone 2: `$4.90`
  - Zone 3: `$6.60`
  - Zone 4: `$8.50`
  - Zone 5: `$10.30`
  - Zone 4+ max standard cap tier: `$7.90` in legacy route logic / `$10.30` maximum zone.
  - Tertiary Student concession: 20% discount across all zones.
  - Child / Youth / Community Connect: 50% discount across all zones.
- **AT HOP 7-Day Rolling Fare Cap**:
  - `AT_HOP_7_DAY_CAP = 50.00` ($50.00/week).
  - Applies to all AT bus, train, and Inner/Mid Harbour ferry services.
- **Ferry Fares**:
  - Inner Harbour (Devonport, Bayswater, Birkenhead, Te Onewa): `$7.80` (Cap eligible).
  - Mid Harbour (Hobsonville Point, Half Moon Bay, Beach Haven, West Harbour): `$10.40` (Cap eligible).
  - Outer Harbour (Gulf Harbour, Pine Harbour): `$13.80` (Cap exempt).
  - Commercial Waiheke Ferry (Fullers360): `$32.00` single, `$64.00` return, `$403.00` monthly pass (Cap exempt).
- **Fixed Vehicle Ownership Benchmarks (Annual, US-38)**:
  - WOF: `$85/yr`
  - Rego: `$173/yr`
  - Insurance: `$1,311/yr`
  - Commute Apportionment: `70%` (`FIXED_COST_COMMUTE_APPORTIONMENT = 0.70`).
- **Vehicle Maintenance & Wear (AA Benchmark)**:
  - `NZ_AA_MAINTENANCE_PER_KM = 0.18` ($0.18/km).

---

## 3. Supabase Usage (Tables, Saved Trips, Analytics)

### 3.1 Database Connection
Supabase is initialized in [src/lib/supabase.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/supabase.ts) using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 3.2 Tables & Schema
From [supabase/migrations/20260925_init_schema.sql](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/supabase/migrations/20260925_init_schema.sql):
- **Table `fuel_benchmarks`**:
  - `id`: UUID (Primary Key, default `gen_random_uuid()`)
  - `week_ending_date`: DATE (Unique, indexed descending)
  - `regular_91`: NUMERIC(6, 2) (Retail price in cents/L, e.g. 272.00)
  - `premium_95`: NUMERIC(6, 2) (Retail price in cents/L, e.g. 294.00)
  - `diesel`: NUMERIC(6, 2) (Retail price in cents/L, e.g. 205.00)
  - `is_provisional`: BOOLEAN (default false)
  - `created_at`: TIMESTAMPTZ (default `now()`)
  - RLS Policies: Public read access enabled for `anon` and `authenticated`; write/upsert restricted to `service_role`.
- **Table `fuel_snapshots`** (referenced as fallback):
  - Secondary historical fallback table queried if `fuel_benchmarks` returns empty.

### 3.3 Data Ingestion Pipeline
- A weekly GitHub Actions cron job runs [scripts/fetch-mbie-fuel.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/scripts/fetch-mbie-fuel.ts) every Saturday at 02:00 UTC.
- Scrapes the MBIE Weekly Fuel Price Monitoring dataset (`data.govt.nz` CSV feed).
- Parses prices, converts cents/L to standard rates, and upserts rows into Supabase using the service role key.

### 3.4 In-Memory Deterministic Fallback
If Supabase is unconfigured, offline, or returns an error, [src/lib/supabase.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/supabase.ts) returns deterministic in-memory benchmarks:
- Regular 91: `$2.72/L`
- Premium 95: `$2.94/L`
- Diesel: `$2.05/L`
- Electricity: `$0.28/kWh`

### 3.5 Absence of Saved Trips or User Data
- **Saved Trips**: There is **no table** or persistence mechanism for user profiles, accounts, or saved trips in Supabase.
- **Trip State**: Trips are serialized entirely into URL query parameters (stateless permalinks).
- **Analytics**: Web analytics are handled exclusively by `@vercel/analytics`, not Supabase.
- **Feedback**: Feedback submissions bypass Supabase and are routed directly to GitHub Issues via [src/app/api/feedback/route.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/api/feedback/route.ts).

---

## 4. URL Parameter Read/Write State Handlers

### 4.1 Architecture & Hook: `useCommuteForm.ts`
State synchronization is managed in [src/hooks/useCommuteForm.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/hooks/useCommuteForm.ts).
- **Lazy Initialization**: Initializes `commuteInput` state by parsing `window.location.search` / `searchParams` on mount to prevent SSR hydration mismatches.
- **Guard Refs**:
  - `hasHydratedRef`: Prevents premature overwriting of URL parameters during initial render.
  - `isSyncingFromPopstateRef`: Suppresses re-serialization loops when navigating via browser back/forward buttons.
- **Debounced Sync**: Applies a 300ms debounce timer before committing state changes to the address bar via `window.history.replaceState`.
- **Query String Guard**: Only triggers `window.history.replaceState` if the serialized query string has actually changed.

### 4.2 Parameter Mapping Engine: `src/lib/urlParams.ts`
The serialization and parsing logic in [src/lib/urlParams.ts](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts) enforces clean URLs and handles legacy aliases:

| Param Key | Alias(es) | Type / Format | Default / Fallback | Description |
|---|---|---|---|---|
| `from` | `originSuburbId` | string | `'epsom'` | Origin suburb ID |
| `to` | `destinationSuburbId` | string | `'cbd'` | Destination suburb ID |
| `days` | `daysPerWeek` | number (1–7) | `3` | Office / commute days per week |
| `power` | `powertrain`, `vehicleType`, `vehicle` | string enum | `'PETROL_91'` | Powertrain: `PETROL_91`, `PETROL_95`, `DIESEL`, `PHEV`, `BEV`, `HEV` |
| `econ` | `fuelEconomy`, `consumptionOverride`, `efficiency` | number | Vehicle preset | Fuel economy (L/100km or kWh/100km) |
| `park` | `parkingTier` | string enum | `'CBD_EARLY_BIRD'` | `CBD_EARLY_BIRD`, `CBD_CASUAL`, `SUBURBAN_HUB`, `FREE`, `CUSTOM` |
| `customPark` | `customParkingDaily`, `parkingDailyRate` | number | `$22.00` | Custom daily parking rate (pruned if `park !== 'CUSTOM'`) |
| `chargeSource` | `evChargeMode`, `evChargingSource` | string enum | `'HOME_OFFPEAK'` | `HOME_OFFPEAK`, `HOME_FLAT`, `PUBLIC_DC`, `CUSTOM` (pruned if not EV/PHEV) |
| `kwhRate` | `homeKWhRate` | number | `0.33` | Charging electricity rate ($/kWh, pruned if not EV/PHEV) |
| `evEfficiency` | `efficiency` | number | `15` | EV battery efficiency (kWh/100km, pruned if not EV/PHEV) |
| `fuelRate` | `customFuelPricePerL`, `fuelPriceOverride` | number | Benchmark | Custom fuel price override ($/L, pruned for pure BEV) |
| `conc` | `concession` | string enum | `'adult'` | AT concession: `tertiary`, `community_connect`, `youth`, `supergold` |
| `carpool` | `carpoolPassengers`, `passengerCount` | number | `1` | Passenger count (omitted if solo driver `1`) |
| `timeRate` | `hourlyTimeValue` | number | `0` | Hourly commuter time valuation ($/hr) |
| `transitMode` | `transitMode` | string | auto-inferred | Override mode: `BUS`, `TRAIN`, `FERRY`, `EBIKE`, `MICROMOBILITY_TRANSIT` |
| `waiheke` | `isWaihekeRoute` | `1` or `0` | omitted | Waiheke Fullers ferry exemption flag |
| `scooterType` | `scooterOwnership` | `'OWNED'` or `'RENTAL'` | omitted | Micro-mobility scooter ownership model |
| `scooterCost` | `scooterCapitalCost` | number | omitted | Upfront scooter purchase cost |
| `walkKm` | `walkDistanceKm` | number | `2.0` | First/last-mile walk distance to transit |
| `fromAddress` | `originAddress` | string | omitted | Geocoded origin street address |
| `toAddress` | `destinationAddress` | string | omitted | Geocoded destination street address |
| `fromCoords` | `originCoordinates` | `lng,lat` | omitted | Geocoded origin coordinates |
| `toCoords` | `destinationCoordinates` | `lng,lat` | omitted | Geocoded destination coordinates |
| `firstMileMode` | `firstMileMode` | string enum | `'DRIVE'` | `DRIVE`, `WALK`, `SCOOTER`, `CYCLE` |
| `firstMileDist` | `firstMileDistanceKm` | number | auto-computed | Distance to nearest transit terminal/station |
| `driveDist` | `drivingDistanceKm` | number | auto-computed | Road driving distance from Google/Mapbox |
| `driveTime` | `drivingTimeMins` | number | auto-computed | Driving duration in minutes |
| `transitTime` | `transitTimeMins` | number | auto-computed | Transit duration in minutes |
| `wear` | `includeMaintenanceWear` | `0` or `1` | `1` (true) | Set to `0` when wear is unchecked (pruned in IRD mode) |
| `wof` | `annualWof` | number | `85` | Annual WOF cost (pruned in IRD mode) |
| `rego` | `annualRego` | number | `173` | Annual Rego cost (pruned in IRD mode) |
| `ins` | `insuranceEnabled` | `0` or `1` | `1` (true) | Insurance active toggle (pruned in IRD mode) |
| `customIns` | `customInsurance` | number | omitted | Custom insurance premium (pruned in IRD mode) |
| `calcMode` | `calculationMode` | `'FUEL'` or `'IRD_TRUE_COST'` | `'FUEL'` | Toggles IRD True Cost mileage calculation mode |
| `evPrice` | `evPurchasePrice` | number | `0` (or 45000 in sandbox) | FEAT-65: EV purchase price |
| `iceTrade` | `iceTradeInValue` | number | `0` (or 15000 in sandbox) | FEAT-65: ICE trade-in / resale value |
| `mileage` | `annualMileage` | number | calculated | FEAT-65: Annual driving distance |
| `horizon` | `horizonYears` | number | `5` | FEAT-65: TCO comparison horizon (3, 5, 7, 10 yrs) |

---

## 5. Existing UI Components Map

Currently, [src/components/DashboardClient.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx) arranges components in a 2-column responsive layout (`lg:grid-cols-12`):
- **Left Column (`lg:col-span-5`)**:
  - `CommuteForm` (order-1)
  - `FuelRadarWidget` (order-6)
  - `MonthlySavingsChart` (order-7)
  - `RouteMap` (order-8)
- **Right Column (`lg:col-span-7`)**:
  - `ComparisonCard` (order-2)
  - `CommuteMatrix` (order-3)
  - `EvRoiSandbox` (order-3)
  - `JourneyTimeline` (order-4)

### Detailed Component Inventory

1. **`CommuteForm.tsx`**:
   - Location: [src/components/CommuteForm.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx) (1,549 lines)
   - Capabilities: Origin/destination suburb selectors, Mapbox address autocomplete, 6-button powertrain segmented control (`91`, `95`, `Diesel`, `HEV`, `PHEV`, `EV`), charging source selectors (`Home Off-Peak`, `Home Flat`, `Public DC`, `Custom`), custom fuel/energy price overrides, parking tier selector, AT concession dropdown, carpool passenger multiplier, AA wear & tear checkbox, value of time presets, fixed ownership costs (WOF, Rego, Insurance accordion).

2. **`ComparisonCard.tsx`**:
   - Location: [src/components/ComparisonCard.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) (675 lines)
   - Capabilities: Primary verdict hero card. Displays monthly driving total vs. public transit total, net savings badge, CO2 emissions saved, and time arbitrage. Houses the **IRD True Cost toggle** switch (`FUEL` vs. `IRD_TRUE_COST` at $1.20/km) with interactive tooltip. Embeds `MiniReceipt` itemized drawer.

3. **`CommuteMatrix.tsx` (FEAT-75)**:
   - Location: [src/components/CommuteMatrix.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteMatrix.tsx) (434 lines)
   - Capabilities: 3-Way Commute Summary Matrix comparing Combustion (ICE), Electric (EV), and Public Transit side-by-side. Supports timeframe pills (`Daily`, `Weekly`, `Annual`). Shows itemized lines: fuel/electricity, statutory NZ RUC ($0.076/km for EV/Diesel, Exempt for Petrol), parking, maintenance, fixed ownership, and net savings vs. ICE baseline. Isolates calculations from IRD mode leakage.

4. **`EvRoiSandbox.tsx` (FEAT-65)**:
   - Location: [src/components/EvRoiSandbox.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/EvRoiSandbox.tsx) (309 lines)
   - Capabilities: EV ROI & TCO Sandbox. Interactive inputs for EV purchase price, ICE trade-in/resale (supporting explicit $0), and analysis horizon buttons (`3y`, `5y`, `7y`, `10y`). Summary metrics bar: Net Capital Delta, Annual ICE Ops, Annual EV Ops, Net Annual Savings. Custom flex-box timeline visualizing deficit years vs. profitable years with break-even badge. Uses zero external chart libraries.

5. **`JourneyTimeline.tsx`**:
   - Location: [src/components/JourneyTimeline.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/JourneyTimeline.tsx) (392 lines)
   - Capabilities: Itinerary breakdown rendering first-mile leg (Drive, Walk, Scooter, Cycle), linehaul transit leg (Bus, Train, Ferry) with station names, and destination walk leg. Displays duration, cost, and passenger multiplier tags.

6. **`MonthlySavingsChart.tsx`**:
   - Location: [src/components/MonthlySavingsChart.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/MonthlySavingsChart.tsx) (225 lines)
   - Capabilities: Visual charts using Recharts. Toggleable between stacked bar breakdown (Private Driving vs. Public Transport) and 12-month cumulative projection area chart.

7. **`FuelRadarWidget.tsx`**:
   - Location: [src/components/FuelRadarWidget.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/FuelRadarWidget.tsx) (165 lines)
   - Capabilities: Displays live retail fuel prices (Regular 91, Premium 95, Diesel) sourced from MBIE via Supabase or `/api/fuel`.

8. **`RouteMap.tsx`**:
   - Location: [src/components/RouteMap.tsx](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/RouteMap.tsx) (250 lines)
   - Capabilities: Interactive Mapbox GL vector map rendering driving route geometry vs. public transit line geometry across Greater Auckland.

9. **Auxiliary Components**:
   - `MiniReceipt.tsx`: Modal / collapsible itemized balance sheet.
   - `ZoneBadge.tsx`: Visual badge for AT HOP zone count (1–5 zones).
   - `ShareButton.tsx`: Copies permalink to clipboard with visual toast confirmation.
   - `DonationButton.tsx`: Community support / donation modal.
   - `FeedbackModal.tsx` & `FeedbackButton.tsx`: Bug reporting & feedback dialog submitting directly to GitHub Issues.
   - `Tooltip.tsx`: Accessible, edge-collision-avoiding tooltip wrapper.

---

## 6. Test Coverage & Test Locations Map

The test suite runs via Node.js native test runner executed through `tsx` (`npm test`), Vitest (`npm run test:vitest`), and Playwright (`npm run test:e2e`). The active suite contains **229 automated tests across 56 test suites** with 100% pass rate.

### Complete Inventory of Test Files:
1. `src/constants/fares.test.ts`:
   - Verifies AT HOP zonal fares, Inner/Mid/Outer Harbour ferry pricing, haversine distance terminal matching, concession multipliers, and $50 cap eligibility.
2. `src/lib/__tests__/calculator.test.ts`:
   - Comprehensive test suite for `calculateCommuteArbitrage` and `calculateTcoArbitrage`.
   - Tests AT HOP $50 cap, statutory RUC for BEV ($0.076/km), PHEV ($0.038/km), and Diesel ($0.076/km).
   - Tests student concessions, commercial parking tiers, carpool splitting, micromobility (e-bikes and scooters), fixed ownership apportionment (WOF, Rego, Insurance), and IRD True Cost mode ($1.20/km).
   - Tests TCO arbitrage: capital delta, annual operational savings, break-even timeframe calculation, and cumulative year-by-year projections.
3. `src/lib/__tests__/urlParams.test.ts`:
   - Round-trip serialization and deserialization tests for all URL search parameters and legacy aliases.
   - Tests URL parameter pruning (e.g. omitting customPark when not in custom mode; omitting wear/wof/rego/ins in IRD mode; omitting EV parameters when driving petrol).
   - Tests FEAT-65 TCO parameter serialization and parsing (`evPurchasePrice`/`evPrice`, `iceTradeInValue`/`iceTrade`, `annualMileage`/`mileage`, `horizonYears`/`horizon`).
4. `src/components/__tests__/ComparisonCard.test.tsx`:
   - Verifies verdict text, monthly summary badge, savings math, and IRD toggle behavior.
5. `src/components/__tests__/CommuteForm.test.tsx`:
   - Verifies form input controls, vehicle selection buttons, parking tier presets, WOF/Rego/Insurance inputs, wear & tear checkboxes, and IRD mode styling.
6. `src/components/__tests__/CommuteMatrix.test.tsx`:
   - Verifies 3-way matrix rendering, daily/weekly/annual timeframe switches, EV energy line items, RUC line items for EV and Diesel, (Exempt) tags for petrol, and isolation from IRD mode leakage (BUG-77).
7. `src/components/__tests__/EvRoiSandbox.test.tsx`:
   - Verifies EV ROI Sandbox container, interactive inputs for EV price and ICE trade-in, horizon year buttons (3y, 5y, 7y, 10y), break-even badge, and custom flex-box timeline. Verifies zero-value trade-in handling and absence of FEAT-65 badge (BUG-78).
8. `src/components/__tests__/DonationButton.test.tsx`:
   - Verifies donation modal open/close actions and copy.
9. `src/components/__tests__/KiwiPathwayIcon.test.tsx`:
   - Verifies SVG vector path rendering.
10. `src/components/__tests__/FeedbackModal.test.tsx`:
    - Verifies modal input state, form validation, and submission handling.
11. `src/components/__tests__/JourneyTimeline.test.tsx`:
    - Verifies transit leg sequencing, first-mile display, and single-rider passenger suppression.
12. `src/components/__tests__/ShareButton.test.tsx`:
    - Verifies URL generation and clipboard interaction.
13. `src/components/__tests__/ZoneBadge.test.tsx`:
    - Verifies zone pill coloring and formatting.
14. `src/components/__tests__/MiniReceipt.test.tsx`:
    - Verifies balance sheet arithmetic and itemized line item rendering.
15. `src/hooks/__tests__/useCommuteForm.test.ts`:
    - Verifies lazy hydration, URL param parsing, and state updates.
16. `src/lib/__tests__/mapbox.test.ts`:
    - Verifies Mapbox address search and route fetching routines.
17. `src/lib/__tests__/stations.test.ts`:
    - Verifies Turf.js spatial station lookup from `at-stations.json`.
18. `src/app/api/feedback/__tests__/route.test.ts`:
    - Tests POST `/api/feedback` validation and GitHub API issue payload formatting.
19. `src/app/api/nearest-stop/__tests__/route.test.ts`:
    - Tests GET `/api/nearest-stop` coordinate handling and nearest stop resolution.
20. `src/app/api/routes/__tests__/route.test.ts`:
    - Tests POST `/api/routes` proxying to Mapbox Directions API.
21. `tests/calculator.test.ts`:
    - Integration test suite for Auckland suburb distance matrices and arbitrage baselines.
22. `tests/fare-cap.spec.ts`:
    - Playwright browser test verifying the AT HOP $50 rolling weekly cap UI.
23. `tests/ui.spec.ts`:
    - Playwright browser test verifying responsive layouts and core user journeys.

---

## 7. Discrepancy & Logic Audits

### 7.1 Why Diesel Defaults to 15 L/100km (vs. ~8.4–9.0 L/100km)
- **Repository Investigation**:
  - In `src/config/fares.config.ts` (line 327), the `VEHICLE_PRESETS.diesel` default consumption is defined as:
    ```typescript
    defaultConsumption: 8.4, // unit: 'L/100km'
    ```
  - In `src/components/CommuteForm.tsx` (line 51), `POWERTRAIN_OPTIONS` specifies:
    ```typescript
    { id: 'diesel', powertrain: 'DIESEL', defaultConsumption: 8.4, unit: 'L/100km' }
    ```
  - **Where does `15` come from?**
    - The value `15` is the **default EV battery efficiency** (`evEfficiency: 15` kWh/100km), introduced in **FEAT-72**.
    - In `src/lib/urlParams.ts` (line 65) and `src/lib/calculator.ts` (line 147–157), the generic fallback order for efficiency is:
      ```typescript
      const rawEfficiency = input.consumptionOverride ?? input.fuelEconomy ?? input.efficiency;
      ```
    - In `src/hooks/useCommuteForm.ts` (line 28), `DEFAULT_COMMUTE_INPUT` sets:
      ```typescript
      evEfficiency: 15,
      ```
    - When a user toggles from an EV to a Diesel vehicle in the UI or when parsing a URL where `econ=15` was serialized, `econ` or `consumptionOverride` retains `15` unless explicitly cleared. Because `15` is a common number in the form state (15 kWh/100km EV efficiency, 15 km/h scooter speed, $15k trade-in fallback), whenever `consumptionOverride` is populated with `15`, the calculator uses `15.0 L/100km` for diesel instead of resetting to `8.4 L/100km`.
    - **Conclusion**: The baseline preset for diesel is indeed `8.4 L/100km`. The appearance of `15 L/100km` occurs when switching vehicle types while preserving the numerical `consumptionOverride` or inheriting EV efficiency from URL state.

### 7.2 Why Diesel Maintenance is $0.00
- **Repository Investigation**:
  - In `src/lib/calculator.ts` (lines 184–186):
    ```typescript
    const maintenanceRate = input.includeMaintenanceWear
      ? (input.maintenanceCostPerKm ?? NZ_AA_MAINTENANCE_PER_KM)
      : 0;
    ```
  - And in lines 365, 370, 375:
    ```typescript
    const effectiveDailyMaintenanceCost = isIrdMode ? 0 : dailyMaintenanceCost;
    ```
  - In `src/hooks/useCommuteForm.ts` (line 19), `includeMaintenanceWear` defaults to `true`.
  - However, in `src/components/CommuteForm.tsx` (line 1207), when `calculationMode === 'IRD_TRUE_COST'`, the checkbox is disabled and set to `false`, and maintenance is zeroed out because the IRD Tier 1 rate ($1.20/km) subsumes maintenance.
  - In `src/components/CommuteMatrix.tsx` (lines 202–212), maintenance & wear is rendered from `iceArbitrage.driving.dailyMaintenanceCost`. If `input.includeMaintenanceWear` is false, it yields `$0.00`.
  - In `src/lib/calculator.ts` (line 1358 for `calculateTcoArbitrage`), ICE maintenance defaults to `DEFAULT_TCO_ICE_MAINTENANCE_ANNUAL = 800` ($800/yr).
  - **Conclusion**: Diesel maintenance is `$0.00` in standard commute calculations whenever `includeMaintenanceWear` is toggled off by the user or when `calculationMode: 'IRD_TRUE_COST'` is active (which zeros granular maintenance). In addition, if a user enters `maintenanceCostPerKm = 0`, it evaluates to `$0.00`.

### 7.3 Is the Auckland Transport (AT HOP) $50 7-Day Cap Modelled?
- **Repository Investigation**:
  - **Yes, absolutely.** The AT HOP $50 7-day rolling cap is fully modelled in `src/lib/calculator.ts`:
    - `AT_HOP_7_DAY_CAP = 50.00` in `src/config/fares.config.ts`.
    - In `src/lib/calculator.ts` (lines 620–628 for ferries and lines 665–673 for bus/train):
      ```typescript
      isHopCapApplied = baseUncappedWeeklyFarePerPerson > AT_HOP_7_DAY_CAP;
      const cappedWeeklyPerPerson = isHopCapApplied ? AT_HOP_7_DAY_CAP : baseUncappedWeeklyFarePerPerson;
      hopCappedWeeklyFare = round2(cappedWeeklyPerPerson * transitPassengers);
      ```
    - Scaled per commuter before applying carpool passenger multipliers (BUG-37).
    - Inner & Mid Harbour Ferries (Devonport, Bayswater, Birkenhead, Hobsonville Point, Half Moon Bay) are correctly marked `capEligible: true`.
    - Commercial exemptions are strictly enforced: Outer Harbour Ferries (Gulf Harbour, Pine Harbour) and Waiheke Ferry (Fullers360) are marked `capEligible: false` and are never capped at $50.
    - Verified by multiple automated tests in `src/lib/__tests__/calculator.test.ts` and Playwright spec `tests/fare-cap.spec.ts`.

### 7.4 Do EV Costs Include RUC?
- **Repository Investigation**:
  - **Yes, absolutely.**
  - Statutory NZTA Road User Charges for Light Electric Vehicles (BEVs) and Plug-in Hybrids (PHEVs) were implemented in **FEAT-73 & FEAT-74** following the 1 April 2024 legislative mandate:
    - In `src/config/fares.config.ts` (lines 100–115):
      - `BEV`: `$76.00 per 1,000 km` (`$0.076/km`).
      - `PHEV`: `$38.00 per 1,000 km` (`$0.038/km`).
    - In `src/lib/calculator.ts` (lines 168–181):
      ```typescript
      if (effectivePowertrain === 'BEV' || effectiveVehicleType === 'bev') {
        rucRate = NZ_RUC_LIGHT_EV_RATE_PER_KM; // 0.076
      } else if (effectivePowertrain === 'PHEV' || effectiveVehicleType === 'phev') {
        rucRate = NZ_RUC_PHEV_RATE_PER_KM; // 0.038
      }
      ```
    - In `CommuteMatrix.tsx` (lines 283–293), the EV column explicitly renders:
      `NZ RUC ($0.076/km)` as a standalone line item.
    - In `calculateTcoArbitrage` (lines 1381–1389), annual EV operational costs compute:
      `annualEvRucCost = round2(annualMileage * 0.076)` and include it in `annualEvTotal`.
    - Verified by dedicated unit tests asserting non-zero RUC for BEVs and PHEVs in `src/lib/__tests__/calculator.test.ts` and `src/components/__tests__/CommuteMatrix.test.tsx`.

---

## 8. Recommendations for Tabbed Layered Disclosure Migration
1. **State Isolation**: Because `useCommuteForm` already provides bidirectional URL synchronization with clean query parameter pruning, tabs can be driven by a shallow URL parameter (e.g. `tab=summary|tco|map`) without losing user input state across tab switches.
2. **Prevent Powertrain State Bleed**: When switching between ICE and EV modes in tabs or inputs, ensure vehicle-specific consumption overrides (`consumptionOverride`) are scoped or reset to the respective vehicle preset defaults (e.g., reset diesel to `8.4 L/100km` and EV to `15 kWh/100km`).
3. **Lazy Render Heavy Elements**: Mapbox GL (`RouteMap`) and Recharts (`MonthlySavingsChart`) should use tab-based lazy mounting or layout triggers to avoid canvas reflow or container sizing bugs when hidden behind inactive tabs.
4. **IRD Rate Synchronization**: Before launching the tabbed UI, update `IRD_MILEAGE_RATE_PER_KM` in `src/config/fares.config.ts` if adopting the newly gazetted 2026–2027 Inland Revenue rates.
