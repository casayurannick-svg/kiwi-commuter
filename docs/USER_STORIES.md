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
| **US-11** | Active Commute & Micro-Mobility Mode | **PENDING** | Backlog (`src/types/index.ts`) | E-Bike / active commute mode with capex payback timeline not yet implemented. |
| **US-12** | Park & Ride Multimodal Hybrid Route | **PENDING** | Backlog (`src/config/suburbs.ts`) | Station parking + rail transfer multi-leg route calculations not yet modeled. |
| **US-13** | Monetized Travel Time & Opportunity Cost | **DONE** | [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx), [`src/lib/urlParams.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/urlParams.ts), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | Fully implemented with UI controls (Off, $20/hr, $50/hr, Custom), URL state persistence (`timeRate`), ComparisonCard sublines/badges, and unit tests. |
| **US-14** | Plain-Language Financial Verdicts | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx) | Direct conversational savings verdicts ("You save $X/mo...", "MONTHLY VERDICT" badge). |
| **US-15** | Privacy-Friendly Traffic & Web Analytics Integration | **DONE** | [`src/app/layout.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/app/layout.tsx), [`package.json`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/package.json) | `@vercel/analytics` installed and `<Analytics />` component embedded in RootLayout. |
| **US-16** | Plain-Language Time Valuation Balance Sheet ("Mini-Receipt") | **DONE** | [`src/components/ComparisonCard.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/ComparisonCard.tsx), [`src/components/__tests__/ComparisonCard.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/ComparisonCard.test.tsx) | Recessed card balance sheet breaking down Cash Saved, Time Cost/Gained, and Your True Benefit. |
| **US-17** | Remove Corridors Preset Menu | **DONE** | [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx) | Completely removed horizontal scrolling Corridors preset buttons, data structure, and handlers to reduce UI distraction. |
| **US-18** | Remove Header Metadata and Status Badges | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/DashboardClient.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/DashboardClient.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Removed "Real-time delta" text, "Auckland Transport & MBIE Weekly Sync" footer text, and policy badges ("2026 RUC Active", "AT $50 Cap") to declutter the UI. |
| **US-19** | Tooltip for Vehicle Wear & Tear Benchmark | **DONE** | [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/components/__tests__/CommuteForm.test.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/__tests__/CommuteForm.test.tsx), [`tests/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/tests/calculator.test.ts) | Added accessible info icon and tooltip explaining the $0.18/km AA/IRD tires, brakes, and servicing benchmark rate. |
| **US-20** | Ferry Commute Mode & Waiheke Cap Exception | **DONE** | [`src/types/index.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/types/index.ts), [`src/config/fares.config.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/config/fares.config.ts), [`src/lib/calculator.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/calculator.ts), [`src/components/CommuteForm.tsx`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/components/CommuteForm.tsx), [`src/lib/__tests__/calculator.test.ts`](file:///Users/niccasayuran/agy_projects/nz_transport_cost_dashboard/src/lib/__tests__/calculator.test.ts) | Ferry mode selection, silent address Waiheke detection, Fullers commercial rates bypassing AT $50 cap while retaining cap for Devonport. |

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
