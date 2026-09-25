# Living Documentation & Contribution Guidelines

This repository follows a **Docs-as-Code** workflow. Documentation in `/docs` must remain in sync with production code.

## Rules for Future Changes
1. **New Features:** Every new feature branch must append its user story and BDD acceptance criteria to `docs/USER_STORIES.md`.
2. **Rate & Tariff Updates:** When NZTA adjusts RUC or Auckland Transport updates fares, update `src/config/fares.config.ts` (and `src/config/pricing.ts`) and document the change in `docs/SYSTEM_DESIGN.md`.
3. **Architectural Decisions:** If adding third-party integrations, auth, or schema modifications, add an Architectural Decision Record in `docs/adr/000X-<title>.md`.
4. **Atomic Commits:** Any code PR altering calculation logic, database schemas, or layout structure must include documentation updates in the same commit.

---

## 1. Local Development Setup

### 1.1 Prerequisites
- **Node.js:** v18.17.0+ (Tested on Node v20+ and v24)
- **Package Manager:** `npm` (v9+)
- **Git**

### 1.2 Installation
```bash
# Clone the repository
git clone https://github.com/casayurannick-svg/kiwi-commuter.git
cd kiwi-commuter

# Install dependencies
npm install
```

### 1.3 Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required keys:
```env
# Mapbox token for route rendering and directions
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1I...

# Optional: Supabase credentials for live MBIE benchmark persistence
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Optional: Auckland Transport API
AT_API_SUBSCRIPTION_KEY=your_key_here
```

### 1.4 Running the Application
```bash
# Start Next.js local development server (port 3000)
npm run dev

# Run unit tests
npm test

# Run type check
npx tsc --noEmit

# Run production build
npm run build
```

---

## 2. Documentation Mapping Matrix

Whenever a specific subsystem or file is touched, the corresponding document **must** be updated:

| Change Category | Code Files Changed | Required Documentation Updates |
| :--- | :--- | :--- |
| **Tariffs & Statutory Rates** | `src/config/pricing.ts`, `src/config/fares.config.ts`, `src/lib/calculator.ts` | Update formulas, rates, and examples in [`docs/PRD.md`](./PRD.md) and [`docs/SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md). |
| **New Features & Enhancements** | `src/components/*`, `src/app/*` | Add user story and acceptance criteria to [`docs/USER_STORIES.md`](./USER_STORIES.md); update [`docs/README.md`](./README.md) feature list. |
| **Database & Ingestion Changes** | `supabase/migrations/*`, `scripts/*` | Update ER diagram, schema table, and data pipeline descriptions in [`docs/SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md). |
| **API Route Modifications** | `src/app/api/*` | Update API request/response contracts and status codes in [`docs/SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md). |
| **Architectural / Tech Stack Changes** | `package.json`, framework migration, new cloud dependencies | Create a new Architectural Decision Record in [`docs/adr/`](./adr/) using the standard template. |

---

## 3. ADR Creation Protocol

When making significant architectural choices (e.g. changing map providers, switching caching strategy, altering database vendors):
1. Create a new markdown file under `docs/adr/000X-descriptive-title.md` (sequentially numbered, e.g. `0002-realtime-gtfs-transit-integration.md`).
2. Follow the MADR structure:
   - **Status:** Proposed / Accepted / Superseded
   - **Context & Problem Statement**
   - **Decision**
   - **Consequences**

---

## 4. Pull Request & Verification Checklist

Before submitting a PR or concluding an agentic goal:

- [ ] **Tests Passing:** `npm test` passes with 100% green suites (all calculation, API, and component tests).
- [ ] **Type Safety:** `npx tsc --noEmit` exits with `0` errors.
- [ ] **Clean Build:** `npm run build` generates static and server routes cleanly.
- [ ] **Living Docs Updated:** The relevant files in `/docs` have been updated to reflect the new code changes in the same commit.
- [ ] **No Secrets Committed:** `.env*.local` is untouched and not tracked by Git.
- [ ] **Mobile-First UX Preserved:** New UI elements include responsive Tailwind classes and touch target compliance (min 44px).
