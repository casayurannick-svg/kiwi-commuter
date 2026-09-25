# ADR 0001: Zero-Cost Serverless Stack, Edge ISR Caching, and Resilient Geodesic Fallbacks

- **Status:** Accepted
- **Date:** 2026-09-25
- **Deciders:** Kiwi Commuter Engineering Team
- **Technical Story:** Architecture planning for high-availability Auckland transport cost arbitrage under zero operating budget.

---

## Context and Problem Statement

Kiwi Commuter is a civic personal finance application designed for Auckland commuters navigating 2026 NZTA Road User Charges (RUC) and dynamic fuel prices. As an open, public utility without monetization, the system must:
1. Operate indefinitely with **zero hosting or infrastructure maintenance costs** ($0/month).
2. Maintain high uptime and sub-second calculation latency on mobile connections.
3. Automatically refresh weekly fuel benchmarks from MBIE without manual human intervention.
4. Render interactive driving routes without exceeding third-party API rate limits.
5. Provide continuous availability even during upstream third-party outages or missing credentials.

---

## Considered Options

1. **Option 1 (Traditional VPS / Container Stack):** Deploy a Node.js/Express server and PostgreSQL instance on a cheap VPS (e.g. Hetzner, DigitalOcean) with automated cron jobs.
2. **Option 2 (Serverless Managed Stack with Generous Free Tiers):** Deploy Next.js 14 App Router on Vercel, Supabase PostgreSQL for persistence, GitHub Actions for scheduled ingestion, and Mapbox GL for client-side rendering.
3. **Option 3 (Client-Only Static Single Page Application):** Run everything purely in the browser with static JSON data bundled at build time.

---

## Decision Outcome

**Chosen Option:** **Option 2 (Serverless Managed Stack with Edge ISR Caching and Geodesic Fallbacks)**.

### Architectural Commitments

1. **Hosting & Compute (Vercel Hobby Tier):**
   - Next.js 14 App Router deployed to Vercel's global edge network.
   - Zero compute idle costs.

2. **Persistence & Data Ingestion (Supabase Free Tier + GitHub Actions):**
   - Supabase PostgreSQL manages `fuel_benchmarks` snapshots protected by Row Level Security (RLS).
   - GitHub Actions workflow runs every Friday at 22:00 NZST to download and parse MBIE retail fuel spreadsheets, performing an idempotent `UPSERT` into Supabase using the service role key.
   - *Keepalive benefit:* The weekly cron prevents Supabase free-tier project auto-pausing (which triggers after 7 days of inactivity).

3. **Edge Caching Strategy (Next.js ISR):**
   - The `/api/fuel` route handler implements `export const revalidate = 3600` (1-hour cache).
   - Subsequent user requests in the same hour are served directly from Vercel's Edge CDN without hitting the Supabase database, dramatically minimizing connection limits and query latency.

4. **Multi-Tier Fault Tolerance & Synthetic Fallbacks:**
   - **Database Outage / Unconfigured Supabase:** If Supabase connection fails or credentials are omitted, `/api/fuel` gracefully returns static statutory fallback prices (Regular 91: $2.68, Premium 95: $2.89, Diesel: $2.05) with `"source": "fallback"`.
   - **Mapbox Rate Limits / Missing Token:** If `NEXT_PUBLIC_MAPBOX_TOKEN` is unset or Mapbox Directions API rejects requests, the client automatically calculates distances using great-circle Haversine trigonometry multiplied by a calibrated $1.35\times$ Auckland street winding factor.

---

## Consequences

### Positive
- **$0.00 Operating Cost:** All services remain comfortably within their respective free tiers (Vercel Hobby, Supabase 500MB DB, GitHub Actions 2,000 min/mo, Mapbox 50,000 loads/mo).
- **Sub-100ms Latency:** Calculation logic is pure synchronous arithmetic ($<2\text{ms}$ execution); fuel rates are served from Edge CDN cache.
- **Self-Healing:** If external APIs (MBIE, Supabase, or Mapbox) encounter transient errors, user workflows never crash or fail to calculate.

### Negative & Mitigations
- **Mapbox Free Tier Cap:** Free tier allows 50,000 monthly map loads.
  - *Mitigation:* The app defaults to static fallback geometry if quota is exceeded without throwing fatal UI errors.
- **Supabase Free Tier Inactivity Pause:** Inactive databases pause after 7 days of no queries.
  - *Mitigation:* The automated Friday GitHub Action cron job queries and updates the database weekly, ensuring continuous activity.
