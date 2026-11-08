# Agent rules (Kiwi Commuter)

Read this before any change. Tickets live in plan.md; do only the ticket you were given.

## Workflow
- One ticket per branch and worktree (../kc-NNN). Tick the ticket in plan.md and commit when done.
- One tool writes at a time. Don't touch files outside the ticket's scope.
- Never push, merge or deploy. The owner ships; Claude reviews the PR.

## Done means all pass
- npx tsc --noEmit
- npm run lint (no new problems vs main)
- npm test
- npm run build
- npm run cf:build (Cloudflare Workers build)
- gitleaks git --redact -v

## Hard rules
- Public repo: no secrets, tokens, emails, phone numbers, street addresses or other personal data in code, tests, fixtures, commits, issues or logs.
- Cloudflare Workers runtime: no runtime fs reads, no edge-runtime routes, no Vercel-only APIs, no native or Node-only packages.
- Rates, fares and calculation logic: change src/config/fares.config.ts and the tests in the same commit; the PR description lists the source and date for any new number.
- Savings headlines count only avoidable costs (fuel or energy, RUC, parking, distance wear). Fixed costs only on a labelled "if you sold the car" line.
- Database changes: write the SQL in supabase/migrations (Supabase) or note it in the ticket (Turso). The owner runs it on production before merge. Never run SQL against production.
- New env vars: add the name to .env.example with a placeholder, never a real value.
- Mobile first: works at 375 px, touch targets at least 44 px.

## Where things are
- Engine: src/lib/calculator.ts. Rates: src/config/fares.config.ts. UI: src/components. API: src/app/api.
- Product, architecture, data and runbook docs: the "Kiwicommuter" Google Drive folder (00 to 07). plan.md is the source of truth for tickets.
