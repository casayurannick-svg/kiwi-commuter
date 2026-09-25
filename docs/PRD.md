# Product Requirements Document (PRD)

## 1. Executive Summary
The **Kiwi Commuter Cost & Arbitrage Dashboard** is a consumer-facing web application designed to eliminate commuter cost ambiguity across the Greater Auckland region. Following the inclusion of Battery Electric Vehicles (BEVs) and Plug-in Hybrids (PHEVs) under statutory Road User Charges (RUC), parking rate increases in the Auckland CBD, and fluctuating fuel prices, commuters lack a single-pane comparison between driving and taking Auckland Transport (AT) bus, train, and ferry services.

The application calculates real daily, monthly, and annual financial deltas between personal vehicle commuting and public transit.

---

## 2. Target Personas
1. **The Hybrid Office Worker (2–3 days/wk in CBD):** Commuting from inner or outer suburbs (e.g., Epsom, Takapuna, Henderson). Balances early-bird parking ($18–$28/day) against AT HOP fares.
2. **The EV / Low-Emission Driver:** Drives a BEV or PHEV; needs to know how the statutory RUC ($76/1,000 km or $38/1,000 km) impacts their running costs against public transit.
3. **The Budget-Conscious Commuter:** Seeks the tipping point where public transit fare caps make driving economically non-viable.

### Detailed User Personas & Auckland Archetypes

* **Liam – Senior Commercial Analyst (Epsom to CBD):**
  - **Commute:** 3 days in office, 2 days remote. Drives a 2018 Mazda CX-5 (Petrol 91, 7.8 L/100km).
  - **Pain Point:** Pays $22/day for CBD Early-Bird parking ($264/mo), unaware that bus travel along Manukau Rd is only Zone 1 ($5.20 return daily, $62.40/mo).
  - **Goal:** Calculate exact monthly dollar savings from ditching parking and taking the bus on office days.

* **Priya – Software Engineer (Albany to Wynyard Quarter):**
  - **Commute:** 5 days/week. Previously drove via Northern Motorway (SH1) with extreme peak congestion.
  - **Pain Point:** Frustrated by 50+ minute peak driving times and monthly vehicle costs exceeding $550/mo.
  - **Goal:** Quantify the financial delta of using the Northern Busway NX1 Rapid bus under the $50 cap ($216.50/mo) vs. private vehicle.

* **Marcus – Operations Manager (Manukau to Britomart):**
  - **Commute:** 5 days/week, 48 km round-trip daily in a Tesla Model 3 (BEV).
  - **Pain Point:** Assumed EV commuting was near-free, but since 1 April 2024, pays $0.076/km in statutory NZTA RUC (~$73/mo just in RUC) plus CBD parking.
  - **Goal:** Compare EV total operating costs (Energy + RUC + Parking) against the Southern Train Line.

* **Chloe – Tertiary Student (Henderson to University of Auckland):**
  - **Commute:** 4 days/week. Owns an older Toyota Corolla.
  - **Pain Point:** Low disposable income, balancing car insurance and petrol vs public transport.
  - **Goal:** Factor in the AT 20% Tertiary Concession ($4.80/day return, $19.20/wk) to see if she can save over $3,000/yr by using the Western Train Line.

---

## 3. Product Goals & Scope
- **Instant Clarity:** Deliver an accurate, side-by-side comparison in < 3 clicks without requiring sign-up or onboarding.
- **Regulatory Accuracy:** Automatically apply statutory NZTA RUC rates, Auckland Transport HOP zone pricing, the $50 7-day fare cap, and MBIE weekly fuel benchmarks.
- **Zero-Cost Operations:** Run entirely on cloud free tiers (Vercel, Supabase, GitHub Actions, Mapbox, AT Developer API).
- **Out of Scope:** Real-time bus GPS tracking / delay notifications (served natively by AT Mobile).

---

## 4. Mathematical Arbitrage Model & Formulas

### 4.1 Driving Cost Calculation
$$\text{Cost}_{\text{fuel, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \left(\frac{\text{Consumption}}{100}\right) \times \text{Price}_{\text{fuel}}}{\text{Passengers}}$$

$$\text{Cost}_{\text{energy, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \left(\frac{\text{kWhPer100km}}{100}\right) \times \text{PowerRate}_{\text{perKWh}}}{\text{Passengers}}$$

$$\text{Cost}_{\text{ruc, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \text{Rate}_{\text{ruc}}}{\text{Passengers}}$$

$$\text{Cost}_{\text{drive, monthly}} = \left(\text{Cost}_{\text{fuel/energy, daily}} + \text{Cost}_{\text{ruc, daily}} + \text{Cost}_{\text{parking, daily}} + \text{Cost}_{\text{wear, daily}}\right) \times \text{Days}_{\text{perWeek}} \times 4.33$$

$$\text{Cost}_{\text{drive, annual}} = \left(\text{Cost}_{\text{fuel/energy, daily}} + \text{Cost}_{\text{ruc, daily}} + \text{Cost}_{\text{parking, daily}} + \text{Cost}_{\text{wear, daily}}\right) \times \text{Days}_{\text{perWeek}} \times 52$$

### 4.2 Auckland Transport Public Transit Cost Calculation
$$\text{Cost}_{\text{transit, daily}} = 2 \times \text{Fare}_{\text{zonal}} \times (1 - \text{Discount}_{\text{concession}})$$

$$\text{Cost}_{\text{transit, weekly}} = \min\left(\text{Cost}_{\text{transit, daily}} \times \text{Days}_{\text{perWeek}}, \quad \$50.00\right)$$

$$\text{Cost}_{\text{transit, monthly}} = \text{Cost}_{\text{transit, weekly}} \times 4.33$$

$$\text{Cost}_{\text{transit, annual}} = \text{Cost}_{\text{transit, weekly}} \times 52$$

### 4.3 Net Arbitrage Delta
$$\text{Monthly Financial Savings} = \text{Cost}_{\text{drive, monthly}} - \text{Cost}_{\text{transit, monthly}}$$

$$\text{Annual Financial Savings} = \text{Cost}_{\text{drive, annual}} - \text{Cost}_{\text{transit, annual}}$$

---

## 5. Regulatory Rates & Pricing Constants (2026 Mandate)

| Parameter | Value | Source / Legislation |
| :--- | :--- | :--- |
| **BEV RUC Rate** | $\$0.076 / \text{km}$ ($\$76 \text{ per } 1,000 \text{ km}$) | Road User Charges (Light Electric RUC Exemption Repeal) Amendment |
| **PHEV RUC Rate** | $\$0.038 / \text{km}$ ($\$38 \text{ per } 1,000 \text{ km}$) | NZTA statutory rate for plug-in hybrids |
| **Diesel RUC Rate** | $\$0.076 / \text{km}$ ($\$76 \text{ per } 1,000 \text{ km}$) | NZTA Light Diesel Vehicle schedule |
| **Petrol RUC Rate** | $\$0.000 / \text{km}$ | Fully funded at retail fuel pump via Petroleum Excise Duty (PED) |
| **AT 7-Day Fare Cap** | $\$50.00 / \text{week}$ | Auckland Transport Fare Structure |
| **Zone 1 Standard HOP** | $\$2.60$ single ($\$5.20$ return) | Auckland Transport HOP zonal fare table |
| **Zone 2 Standard HOP** | $\$4.45$ single ($\$8.90$ return) | Auckland Transport HOP zonal fare table |
| **Zone 3 Standard HOP** | $\$6.00$ single ($\$12.00$ return) | Auckland Transport HOP zonal fare table |
| **Zone 4 Standard HOP** | $\$7.70$ single ($\$15.40$ return) | Auckland Transport HOP zonal fare table |
| **Zone 5 Standard HOP** | $\$9.40$ single ($\$18.80$ return) | Auckland Transport HOP zonal fare table |
| **Tertiary Concession** | $20\%$ off standard single fare | AT Student Concession Scheme |
| **Community Connect** | $50\%$ off standard single fare | Community Services Card concession |
| **Youth (16–24)** | $50\%$ off standard single fare | AT Youth Concession |
| **SuperGold** | $100\%$ free off-peak ($> 9:00 \text{ AM}$) | National SuperGold Card Transit Scheme |
| **Weeks per Month** | $4.33$ weeks ($52 / 12$) | Standard accounting convention |

---

## 6. Functional Requirements Matrix

### Priority 0 (Core & MVP) - Complete
- [x] **FR-01:** Suburb Corridor Selection (Origin & Destination across 50 Auckland suburbs).
- [x] **FR-02:** Powertrain Cost Modeling (Petrol 91/95, Diesel, BEV, PHEV with NZTA RUC).
- [x] **FR-03:** AT HOP 7-Day Fare Cap ($50/week enforcement).
- [x] **FR-04:** Daily Commercial Parking Rate inputs with Auckland CBD presets.
- [x] **FR-05:** Real-time side-by-side financial delta calculation without page reload.
- [x] **FR-06:** MBIE weekly fuel price automated scraping pipeline & Supabase persistence.
- [x] **FR-07:** Mapbox interactive route visualizer with geodesic offline fallback.
- [x] **FR-08:** Mobile-first responsive optimization (44px touch targets, iOS safe-area handling).

### Priority 1 (Enhanced UX & Personalization)
- [ ] **FR-09:** Auckland Transport real-time GTFS transit route overlay on the map.
- [ ] **FR-10:** CO₂ emissions footprint and carbon offset comparison.
- [ ] **FR-11:** Printable and shareable PDF Commute Cost Summary Report.

---

## 7. Performance & Quality KPIs
- **Calculation Latency:** $< 50\text{ms}$ on client device; $< 150\text{ms}$ via API.
- **Lighthouse Performance Score:** $\ge 90$ on both mobile and desktop.
- **Test Coverage:** $\ge 95\%$ test coverage across mathematical calculation engine and API routes.
- **Availability:** $99.9\%$ uptime supported by static synthetic fallbacks when external APIs are unavailable.
