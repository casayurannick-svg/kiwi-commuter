# ADR 0001: Zero-Cost Infrastructure Stack & Static Matrix Caching

## Status
Accepted

## Context
The Kiwi Commuter Dashboard is a public-utility tool designed to run sustainably without operational hosting or API expenses. Frequent map routing queries and real-time database hits risk exhausting free-tier quotas on Vercel, Supabase, and Mapbox.

## Decision
1. **Hosting & Serverless:** Deploy frontend and API route handlers on Vercel Hobby tier.
2. **Database:** Use Supabase Free Tier Postgres solely for weekly MBIE fuel price snapshots, keeping database size below 500 KB.
3. **Background Pipelines:** Use GitHub Actions cron (free 2,000 monthly build minutes) to scrape and store weekly fuel data rather than running an active Node server.
4. **Spatial Optimization:** Provide pre-calculated centroid routes for top Auckland commuting corridors. Call Mapbox Directions API on-demand with local client cache hashing to remain well within Mapbox's 100,000 free monthly requests.

## Consequences
- Operational overhead is $0/month.
- In the event of network disruption or external API downtime, the application gracefully degrades to cached centroids and fallback pricing constants.
