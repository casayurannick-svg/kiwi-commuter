# Kiwi Commuter Documentation Suite

Welcome to the living engineering and product documentation for **Kiwi Commuter** — Auckland's high-performance commuter cost and transit arbitrage engine.

---

## Documentation Index

| Document | Purpose | Audience |
| :--- | :--- | :--- |
| [**PRD.md**](./PRD.md) | Product Requirements Document, target personas, problem statement, and scope | Product & Engineering |
| [**USER_STORIES.md**](./USER_STORIES.md) | Completed & upcoming Agile user stories with acceptance criteria | Agile Team & QA |
| [**SYSTEM_DESIGN.md**](./SYSTEM_DESIGN.md) | Full technical architecture, math models, Supabase schema, and API specs | Engineers & Architects |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Developer guidelines, code standards, and the Living Docs Protocol | All Contributors |
| [**ADR 0001**](./adr/0001-free-tier-stack-and-caching.md) | Free-Tier Stack, Static ISR Caching, and Resilient Fallbacks | Architecture Review |

---

## High-Level Architecture Overview

```mermaid
flowchart TD
    subgraph Data Sources
        MBIE[MBIE Weekly Fuel CSV]
        AT[Auckland Transport GTFS API]
        MAPBOX[Mapbox Directions API]
    end

    subgraph Automation & Ingestion
        CRON[GitHub Actions Cron\nEvery Monday 19:00 UTC]
        SCRAPER[fetch-mbie-fuel.ts\nNode.js Scraper]
    end

    subgraph Persistence & Cache
        SUPABASE[(Supabase PostgreSQL\nfuel_benchmarks Table)]
        EDGE_CACHE[Vercel ISR Edge Cache\nrevalidate = 3600]
    end

    subgraph Application Layer
        NEXT[Next.js 14 App Router]
        CALC[src/lib/calculator.ts\nMath Arbitrage Engine]
        API_FUEL[/api/fuel]
        API_CALC[/api/calculate]
    end

    subgraph Presentation UI
        UI[Mobile-First Dashboard\nDesktop 2-Col / Mobile Stack]
        MAP[RouteMap.tsx\nMapbox GL / SVG Isthmus]
        CHART[MonthlySavingsChart.tsx\nRecharts Stacked / 12-Mo]
    end

    MBIE -->|Scheduled Download| CRON
    CRON -->|Run Script| SCRAPER
    SCRAPER -->|Upsert Prices| SUPABASE
    SUPABASE -->|Fetch Latest| API_FUEL
    API_FUEL -->|1-Hour Cache| EDGE_CACHE

    MAPBOX -.->|Live Driving Geometry| CALC
    AT -.->|Zonal GTFS Tariffs| CALC

    EDGE_CACHE --> NEXT
    CALC --> API_CALC
    API_CALC --> UI
    UI --> MAP
    UI --> CHART
```

---

## Core Value Proposition

Auckland commuters navigate one of the most geographically constrained isthmuses in Australasia. Between retail petrol prices exceeding $2.70/L, statutory 2024–2026 NZTA Road User Charges (RUC) on EVs and Diesels ($76/1,000 km), and commercial CBD parking averaging $22–$35/day, private vehicle operation represents a major household expenditure.

Conversely, Auckland Transport operates a zonal fare structure protected by a statutory **$50 7-Day Fare Cap** across all buses, trains, and inner-harbour ferries.

**Kiwi Commuter provides instant, mathematically exact arbitrage figures:**
$$\text{Net Monthly Savings} = \text{Driving Monthly Cost} - \text{AT Transit Monthly Cost}$$

---

## Living Documentation Protocol

All code modifications that introduce new tariffs, alter API contracts, add powertrain options, or update schemas **must simultaneously update these documentation files**. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for enforcement rules.
