# Kiwi Commuter Cost & Arbitrage Dashboard 🥝 🚌 🚗

A high-performance Next.js application comparing daily driving expenses (Fuel + NZTA RUC + Central Auckland Parking) against Auckland Public Transport (AT HOP Zonal Fares & the flagship $50 7-Day Cap) to calculate net monthly financial arbitrage.

![Architecture Diagram](https://img.shields.io/badge/Next.js-14_App_Router-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss)
![AT HOP](https://img.shields.io/badge/Auckland_Transport-$50_7--Day_Cap-003865?style=flat-square)
![NZTA RUC](https://img.shields.io/badge/NZTA_RUC-EV_%26_Diesel-emerald?style=flat-square)

---

## 🌟 Key Features

1. **Auckland Transport (AT HOP) $50 7-Day Cap Engine**
   - Automatically models rolling 7-day cap benefits across all buses, trains, and inner harbor ferries (Devonport, Birkenhead, Half Moon Bay, Hobsonville).
   - Real-time calculation of standard single fares (Zones 1 through 5) and concessions (Tertiary student 20% off, Community Connect 50% off, Youth 50% off, SuperGold off-peak).

2. **2024–2026 NZTA Road User Charges (RUC)**
   - Light Battery Electric Vehicles (BEVs): $76.00 per 1,000 km ($0.076/km).
   - Plug-in Hybrids (PHEVs): $38.00 per 1,000 km ($0.038/km).
   - Light Diesel Vehicles: $76.00 per 1,000 km ($0.076/km).
   - Standard Petrol (91/95): $0.00/km (funded via fuel excise tax at pump).

3. **Central Auckland Parking Economics**
   - Built-in rate schedules for Downtown Car Park, Civic Car Park, Wilson Commercial bays, and fringe parking ($0 to $28/day).
   - Demonstrates how parking frequently dwarfs fuel costs for 5-day CBD commuters.

4. **50 Auckland Suburbs & Rapid Corridors**
   - Centroid coordinates and transit travel times across Zones 1 to 5: Northern Busway (NX1, NX2), Western Rail, Southern Rail, Eastern Rail, Western Express (WX1), and ferries.

5. **Visual Cost & Arbitrage Analytics**
   - **Monthly Stacked Breakdown**: Fuel vs. RUC vs. Parking vs. Wear & Tear vs. AT HOP capped fares.
   - **12-Month Arbitrage Projection**: Cumulative financial delta over 1 year.
   - **Tank-to-Transit Power Purchasing Equivalence**: Visualizes how a single 50L petrol fill-up funds ~3 weeks of unlimited public transit under the $50 cap.

6. **Interactive Mapbox & Vector Corridor Visualizer**
   - Live route tracing with Mapbox GL when configured, with seamless vector geography fallback for offline or zero-config usage.

---

## 🏗️ Architecture & Tech Stack

```text
kiwi-commuter/
├── .github/
│   └── workflows/
│       └── refresh-fuel-prices.yml     # Weekly cron action fetching MBIE fuel data
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── calculate/route.ts      # Serverless route cost evaluator
│   │   │   ├── fuel/route.ts           # Returns latest fuel prices & tank estimates
│   │   │   └── transit/route.ts        # Proxies AT Developer API with caching
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Main dashboard interface
│   │   └── globals.css
│   ├── components/
│   │   ├── CommuteForm.tsx             # Origin, destination, days/wk, vehicle inputs
│   │   ├── ComparisonCard.tsx          # Side-by-side Driving vs. Transit breakdown
│   │   ├── MonthlySavingsChart.tsx     # Recharts bar/stacked cost visualizer
│   │   ├── FuelRadarWidget.tsx         # Current 91/95/Diesel rates & tank savings
│   │   └── RouteMap.tsx                # Interactive Mapbox & vector route renderer
│   ├── config/
│   │   ├── fares.config.ts             # AT HOP zone fares, caps, and NZTA RUC tables
│   │   └── suburbs.ts                  # Centroid data for top 50 Auckland suburbs
│   ├── lib/
│   │   ├── calculator.ts               # Core arbitrage math engine
│   │   ├── mapbox.ts                   # Directions API client
│   │   └── supabase.ts                 # Supabase client initialization & cache fallback
│   └── types/
│       └── index.ts                    # Vehicle, trip, calculation, and API types
├── scripts/
│   └── fetch-mbie-fuel.ts              # Node/Bun script to parse MBIE CSV and push to Supabase
├── tests/
│   └── calculator.test.ts              # Automated test suite for arbitrage math
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Public Mapbox GL token for interactive satellite/vector maps |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for storing regional fuel snapshots |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (used by GitHub Actions cron) |
| `AT_API_SUBSCRIPTION_KEY` | Auckland Transport Developer Portal primary key |

*Note: The application has built-in graceful fallbacks for all external services and runs out-of-the-box with zero initial configuration required!*

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 4. Run Test Suite
```bash
npm test
```

### 5. Fetch MBIE Fuel Prices
```bash
npm run fetch:fuel
```

### 6. Build for Production
```bash
npm run build
npm start
```

---

## 📊 Arbitrage Calculation Formula

$$\text{Monthly Driving Cost} = \left(\text{Fuel} + \text{RUC} + \text{Parking} + \text{Wear}\right) \times \frac{52}{12}$$

$$\text{Weekly Transit Cost} = \min\left(2 \times \text{Days} \times \text{Fare}_{\text{Zone}}, \$50.00\right)$$

$$\text{Net Monthly Delta} = \text{Monthly Driving Cost} - \left(\text{Weekly Transit Cost} \times \frac{52}{12}\right)$$
