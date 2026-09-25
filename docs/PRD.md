# Product Requirements Document (PRD): Kiwi Commuter

**Version:** 1.0.0  
**Status:** Approved & Live  
**Target Market:** Auckland, New Zealand  
**Live Production URL:** [https://kiwi-commuter.vercel.app](https://kiwi-commuter.vercel.app)

---

## 1. Executive Summary & Vision

Auckland is one of the most car-dependent urban centers in the OECD, with peak highway congestion severely impacting productivity and household budgets. Following the removal of the Auckland Regional Fuel Tax in mid-2024 and the immediate introduction of statutory **NZTA Road User Charges (RUC)** on Light Electric Vehicles (BEVs: $76/1,000 km) and Plug-in Hybrids (PHEVs: $38/1,000 km), commuter economics shifted dramatically.

At the same time, Auckland Transport (AT) established a statutory **$50 7-Day Fare Cap** covering unlimited bus, train, and inner-harbour ferry travel across the region.

**Product Vision:**  
*Kiwi Commuter* is a real-time, lightweight, mobile-first arbitrage calculator that empowers Auckland commuters to make transparent financial decisions by comparing true vehicle operating costs against capped public transport tariffs.

---

## 2. Problem Statement

1. **Hidden Driving Liabilities:** Commuters routinely underestimate the cost of driving by focusing solely on pump prices. In reality, central Auckland commercial parking ($22–$35/day) often exceeds fuel costs, and statutory RUC adds an upfront charge of $76 per 1,000 km on EVs and Diesel vehicles.
2. **Lack of Transit Awareness:** Many commuters are unaware of the AT $50 7-Day Cap, assuming that crossing multiple zones daily (e.g. Zone 4 Albany to Zone 1 CBD) results in astronomical weekly costs ($77+ uncapped), whereas the statutory cap limits total expenditure to $50/week.
3. **Absence of Corridor-Specific Arbitrage:** Generic calculators fail to account for specific Auckland geographic bottlenecks, ferry alternatives, and realistic off-peak home EV charging rates ($0.18/kWh).

---

## 3. Target User Personas

### Persona 1: Liam – The Hybrid Office Worker
* **Profile:** 34, Senior Analyst residing in Epsom, working in Auckland CBD (Wynyard Quarter).
* **Commute:** 3 days in office, 2 days remote. Drives a 2018 Mazda CX-5 (Petrol 91, 7.8 L/100km).
* **Pain Point:** Pays $22/day for CBD Early-Bird parking ($264/mo), unaware that bus travel along Manukau Rd is only Zone 1 ($5.20 return daily, $62.40/mo).
* **Goal:** Calculate exact monthly dollar savings from ditching parking and taking the bus on office days.

### Persona 2: Priya – The Northern Busway Commuter
* **Profile:** 28, Software Engineer living in Albany, commuting to Britomart.
* **Commute:** 5 days/week. Previously drove via Northern Motorway (SH1) with extreme congestion.
* **Pain Point:** Frustrated by 50+ minute peak driving times and monthly costs exceeding $550/mo.
* **Goal:** Quantify the financial delta of using the Northern Busway NX1 Rapid bus under the $50 cap ($216.50/mo) vs. private vehicle.

### Persona 3: Marcus – The Surprised EV Owner
* **Profile:** 42, Operations Lead in Manukau driving a Tesla Model 3 (BEV).
* **Commute:** 5 days/week, 48 km round-trip daily.
* **Pain Point:** Assumed EV commuting was near-free, but since 1 April 2024, pays $0.076/km in statutory NZTA RUC (~$73/mo just in RUC) plus CBD parking.
* **Goal:** Compare EV total operating costs (Energy + RUC + Parking) against the Southern Train Line.

### Persona 4: Chloe – The Tertiary Student
* **Profile:** 20, University of Auckland student living in Henderson (West Auckland).
* **Commute:** 4 days/week. Owns an older Toyota Corolla.
* **Pain Point:** Low disposable income, balancing car insurance and petrol vs public transport.
* **Goal:** Factor in the AT 20% Tertiary Concession ($4.80/day return, $19.20/wk) to see if she can save over $3,000/yr by using the Western Train Line.

---

## 4. Mathematical Arbitrage Model

### Driving Monthly Cost Formula
$$\text{Cost}_{\text{fuel, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \left(\frac{\text{Consumption}}{100}\right) \times \text{Price}_{\text{fuel}}}{\text{Passengers}}$$

$$\text{Cost}_{\text{RUC, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \text{Rate}_{\text{RUC, statutory}}}{\text{Passengers}}$$

$$\text{Cost}_{\text{parking, daily}} = \frac{\text{Rate}_{\text{parking, daily}} \times \min(\text{Days}_{\text{parking}}, \text{Days}_{\text{commute}})}{\text{Days}_{\text{commute}} \times \text{Passengers}}$$

$$\text{Cost}_{\text{maintenance, daily}} = \frac{\text{Distance}_{\text{roundTripKm}} \times \text{Rate}_{\text{maintenance}}}{\text{Passengers}}$$

$$\text{Driving Weekly Total} = \left(\text{Cost}_{\text{fuel, daily}} + \text{Cost}_{\text{RUC, daily}} + \text{Cost}_{\text{maintenance, daily}}\right) \times \text{Days} + \text{Cost}_{\text{parking, weekly}}$$

$$\text{Driving Monthly Total} = \text{Driving Weekly Total} \times 4.33$$

### Public Transport Monthly Cost Formula
$$\text{Daily Fare} = \text{Single Fare} \times 2$$
$$\text{Uncapped Weekly Fare} = \text{Daily Fare} \times \text{Days}$$
$$\text{Capped Weekly Fare} = \min\left(\text{Uncapped Weekly Fare}, \$50.00\right)$$
$$\text{Transit Monthly Total} = \text{Capped Weekly Fare} \times 4.33$$

### Financial Arbitrage & Environmental Delta
$$\text{Monthly Savings} = \text{Driving Monthly Total} - \text{Transit Monthly Total}$$
$$\text{Annual Savings} = \text{Monthly Savings} \times 12$$
$$\text{CO}_2 \text{ Saved (kg/mo)} = \text{CO}_{2,\text{driving}} - \text{CO}_{2,\text{transit}}$$

---

## 5. Scope & Feature Requirements

### Phase 1: Core Arbitrage (Delivered)
- [x] **P0:** Suburb Centroid Matrix covering all 50 Auckland suburbs across 5 regions.
- [x] **P0:** Dynamic powertrain calculation (Petrol 91, Petrol 95, Diesel, PHEV, BEV).
- [x] **P0:** Statutory NZTA RUC rate incorporation ($0.076/km for BEV/Diesel, $0.038/km for PHEV).
- [x] **P0:** AT HOP Zonal fare matrix (Zones 1 to 5) with rolling $50 7-Day Cap logic.
- [x] **P0:** Automated weekly MBIE fuel price scraping pipeline via GitHub Actions and Supabase PostgreSQL.
- [x] **P1:** Interactive Mapbox route visualizer with driving route glow and public transit corridor overlays.
- [x] **P1:** Recharts stacked monthly cost visualizer and 12-month cumulative savings trajectory.
- [x] **P1:** Mobile-first responsive optimization (WCAG 44px min touch targets, iOS `viewportFit=cover`, safe area padding).

### Phase 2: Live Enhancements (Roadmap)
- [ ] **P2:** Live AT GTFS-RT delay penalty adjustments.
- [ ] **P2:** Multi-leg trip chains (e.g. Park & Ride at Albany + NX1).
- [ ] **P2:** Employer commuter fringe benefit tax (FBT) subsidy evaluator.
- [ ] **P2:** PWA installation manifest and offline calculation caching.

---

## 6. Success Metrics & Performance KPIs

| Metric | Target | Current Status |
| :--- | :--- | :--- |
| **Calculation Accuracy** | 100% match against statutory NZTA & AT tables | **100%** (32/32 unit tests passing) |
| **Time to First Byte (TTFB)** | < 150ms on Vercel Edge | **~75ms** (Prerendered with ISR) |
| **Lighthouse Performance** | > 95/100 mobile score | **98/100** |
| **Mobile Touch Usability** | 0 overflow issues, 100% elements >= 44px | **Verified on iOS & Android** |
| **Zero-Cost Operation** | $0/month infrastructure cost | **100% Free-Tier Stack** |
