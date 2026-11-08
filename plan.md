# Kiwi Commuter plan

Source of truth for tickets. Drive doc "05 Kiwi Commuter - status and backlog" is a read-only copy refreshed at each handover. Ideas go in Drive "06 Ideas inbox". Rules: AGENTS.md.

Next ticket number: KC-016. Older work (US-, BUG-, FEAT-, STORY-) is in docs/USER_STORIES.md and CHANGELOG.md.

## Active

- [x] KC-000 Workflow bootstrap: plan.md, AGENTS.md, HANDOFF.md, gitleaks pre-commit hook (.githooks, installed by npm prepare), gitleaks in CI. Full-history scan 8 Nov 2026: 140 commits, 2 findings, both placeholders in .env.example (recorded in .gitleaksignore); no real secrets.

## Ready, in order

### P0

- [ ] KC-001 Feedback: stop publishing contact details; add limits
  - Why: /api/feedback writes name and contact into an issue on this public repo. No length or rate limits.
  - Do: remove name and contact from the public issue body. Either drop the contact field, or send feedback to a private repo via GITHUB_REPOSITORY (owner decides; default: private repo kiwi-commuter-feedback). Caps: message 2,000, name 80, contact 120, urlContext 300 chars; empty or oversized → 400. Honeypot field. Strip @mentions and links from the title.
  - Owner: create private repo if chosen; fine-grained token (Issues write, that repo only); set secret; lock or delete existing public issues containing contact details.
  - Done when: test asserts the public issue body never contains the contact value; oversized input → 400.

- [ ] KC-002 Share links: stop anyone listing saved trips
  - Why: saved_trips stores full commute input (addresses, coordinates); RLS allows public SELECT using (true) and the anon key is public.
  - Do: (1) migration: drop public SELECT policy; security-definer function get_saved_trip(trip_id uuid) returning that row's payload, granted to anon; check constraint on payload size (< 8 KB). (2) Scrub before insert: no street numbers, coordinates rounded to 3 decimals, only fields the calculator needs. (3) Read via the RPC in src/lib/supabase.ts. (4) Retention: delete rows older than 180 days (weekly GitHub job).
  - Owner: run the migration before merge; one-off scrub of existing rows.
  - Done when: anon select * from saved_trips returns nothing; old and new share links open; tests cover scrubbing.

- [ ] KC-003 Honest savings headline (avoidable costs by default)
  - Why: headline includes 70% of WOF, rego and insurance, which a commuter who keeps the car still pays (Fair Trading Act risk).
  - Do: headline and verdict use the existing "stops" totals (fuel or energy, RUC, parking, distance wear). Second labelled line "If you sold the car: $Y/year" uses stops + stays. In IRD mode the IRD figure is the "if you sold the car" line. Update copy, verdict bands, tests.
  - Done when: Mt Roskill to Parnell fixture headline equals the avoidable-cost delta; fixed costs only on the labelled line; OG receipt and share text match.

### P1

- [x] KC-015 Fix 5 failing e2e tests in tests/address-autocomplete.spec.ts
  - Cause: src/lib/mapbox.ts only called /api/geocode when NEXT_PUBLIC_MAPBOX_TOKEN started with pk., so CI (no token) never hit /api/geocode.
  - Do: make client always call /api/geocode (server handles Mapbox/Nominatim fallback); keep Turso and suburb fallbacks after it. In tests 1 and 2 mock /api/geocode with page.route (no real network).
  - Done when: all 5 e2e tests pass with no Mapbox token set; all checks in AGENTS.md pass.
  - Also: CI Playwright serves the prod build (dev server timed out); 500 test asserts STORY-25 disabled inputs; setupFlow unit test waits up to 3 s.

- [ ] KC-004 Rate limiting and spend caps on upstream APIs
  - Why: no limits; /api/routes makes several billable Google Routes calls per request; Nominatim 1 req/s policy; Mapbox quota.
  - Do: cache /api/routes responses by rounded origin/destination/mode for 24 h (Cache API). Nominatim: User-Agent with the app URL, max 1 req/s, cache results. Document the WAF rule in the runbook.
  - Owner: Cloudflare WAF rate limiting on /api/* (30/min per IP; /api/feedback 3 per 10 min; /api/routes 10/min); Google Cloud budget alert and daily Routes API quota.
  - Done when: identical route requests hit the cache (tested).

- [ ] KC-005 Input validation on API routes
  - Do: one shared validator. NZ coordinates (lat -47.5 to -34.0, lng 166.0 to 179.0); query length 2 to 120; days 0 to 7, passengers 1 to 4, rates within sensible maxima. 400 with a clear message.
  - Done when: unit tests for each route's rejects; no upstream call with unvalidated input.

- [ ] KC-006 Disclaimer, privacy statement and attribution
  - Do: footer "Estimates for information only. Not financial, tax or legal advice." IRD mode note: "IRD kilometre rates are a benchmark of total vehicle cost. Home-to-work travel is private and not tax deductible." Attribution: "Fuel prices: MBIE, CC BY 4.0"; "Map data © Mapbox © OpenStreetMap contributors" (Mapbox attribution control on); "Transit data: Auckland Transport"; OSM credit where Nominatim results show. /privacy page: what is stored (share links, feedback, analytics), where, how long, how to ask for deletion; linked from footer.
  - Done when: visible at 375 px; tests check the text renders.

- [ ] KC-007 IRD rates by vehicle type, with Tier 2
  - Why: IRD mode uses $1.20/km for every car. 2025-26 (OS 19/04 (KM 2026)): Tier 1 petrol 1.20, diesel 1.30, petrol hybrid 0.90, electric 1.22 (first 14,000 km); Tier 2 0.37, 0.38, 0.24, 0.23.
  - Do: replace IRD_MILEAGE_RATE_PER_KM with a table by powertrain, labelled with the income year. Tier 2 for yearly commute km above 14,000 (assume commute km are the first km of the year; say so). PHEV uses petrol hybrid rate (tooltip notes it).
  - Done when: tests per powertrain and for > 14,000 km/year.

- [ ] KC-008 AT fares: 4-zone maximum, 5+ zone bug, contactless note
  - Why: AT charges at most a 4-zone fare. Code has a 5-zone fare ($10.30) and forces 5+ zones to $7.90, below 4 zones ($8.50).
  - Do: verify Feb 2026 adult and concession fares against at.govt.nz; clamp zones to 4 in calculator.ts and fares.ts; remove 5-zone entries and the 7.90 override. Note that the $50 weekly cap needs an AT HOP card (contactless: $20 daily cap, no weekly cap).
  - Done when: a 6-zone trip costs the 4-zone fare; tests for zones 1 to 6 and each concession.

- [ ] KC-009 Check wear, maintenance and WOF for double counting
  - Why: NZ_AA_MAINTENANCE_PER_KM ($0.18/km) comment says it includes WOF and depreciation; WOF is also a fixed cost; plus a $3/week distance wear default.
  - Do: confirm which feed each mode; each cost appears once; fix comment and tooltip. No number changes without a cited source.
  - Done when: test asserts WOF counted once in Fuel mode; tooltips match code.

### P2

- [ ] KC-010 Remove unused preferences route and tables
  - Do: delete src/pages/api/preferences and tests/api/preferences.test.ts; remove user_preferences and routes from src/db/schema.ts; delete root db/schema.ts; add auckland_addresses to the Drizzle schema. Owner drops the Turso tables after merge.
  - Done when: no reference to /api/preferences; build and tests pass.

- [ ] KC-011 Token and key hygiene
  - Owner: GitHub feedback token fine-grained (Issues write, one repo, expiry); Mapbox public token URL-restricted to www.kiwicommuter.app, kiwicommuter.app, localhost; Supabase service role key only in GitHub Actions secrets; pause or disconnect the old Vercel project.
  - Code: /api/geocode uses MAPBOX_API_KEY only, not the public token.
  - Done when: checklist ticked here with dates (no values).

- [ ] KC-012 Move /api/geocode to the App Router
  - Do: port src/pages/api/geocode to src/app/api/geocode/route.ts (same contract); delete src/pages. Uses KC-005 validation and KC-004 caching.
  - Done when: no src/pages; geocode tests pass; cf:build passes.

- [ ] KC-013 Repo docs refresh
  - Do: replace /docs content with a short README pointing to the Drive folder and plan.md; fix stale facts in README.md (Next 15.5, fares, Cloudflare); remove file:/// paths. Keep ADRs; add ADR 0002 (Cloudflare move) and 0003 (share-link privacy, after KC-002).
  - Done when: no fare or rate in repo docs disagrees with fares.config.ts.

- [ ] KC-014 CI clean-up
  - Do: merge ci.yml and regression.yml; one unit runner locally and in CI (Vitest or tsx); add cf:build to CI; one AT key name (AT_API_SUBSCRIPTION_KEY); fix fuel job cron comment.
  - Done when: one workflow, green on main.

## Later

- Park and ride (US-12). Live GTFS-RT disruptions; rail closures. Blank map on tab switch (resize on show, or MapLibre). Greater Wellington / Metlink (US-08).

## Open (non-ticket)

- Decide: one database or two (Supabase plus Turso).
- Record the source and licence of auckland_addresses (LINZ addresses are CC BY 4.0).
