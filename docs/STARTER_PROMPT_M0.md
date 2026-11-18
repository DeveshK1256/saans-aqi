# Saans — Milestone 0 Starter Prompt

> **Purpose:** Hand this file to a coding agent to execute Milestone 0.
> It references the master planning document and specifies exactly what to build, what to verify, and what to leave alone.

---

## 0. Context

| Item | Location |
|---|---|
| Master planning document | [`/docs/SAANS_MASTER_DOC.md`](file:///C:/Users/deves/.gemini/antigravity/scratch/saans-aqi/docs/SAANS_MASTER_DOC.md) |
| Existing test scaffold | `tests/unit/`, `tests/schema/`, `tests/eval/` |
| Existing source modules | `src/lib/exposure-engine.ts`, `src/lib/aqi-breakpoints.ts` |
| CI pipeline | `.github/workflows/ci.yml` |
| Package manager | npm (see `package.json`) |

**Read the master doc fully before writing any code.** Sections 8 (Architecture), 10 (Schema), 11 (API), and 17 (Implementation Plan — M0 entry/exit criteria) are your primary references.

---

## 1. M0 Scope: "Foundation — Data Model, Integration Layer, and Engine"

### 1.1 Build These (in order)

| # | Deliverable | Master Doc Reference | Notes |
|---|---|---|---|
| 1 | **Database schema & migrations** | §10 (Backend Schema) | Prisma or Drizzle (choose one, log the decision). Tables: `households`, `members`, `air_readings`, `exposure_logs`, `evidence_corpus`. Include `created_at`, `updated_at`, soft-delete where noted. |
| 2 | **Air-quality integration layer** | §8.3, §11.1 | Implement the 4-tier fallback chain: CPCB RSS/API → SAFAR API → OpenAQ v3 → Open-Meteo CAMS reanalysis. Each provider is an adapter behind a common `AirDataProvider` interface. All responses conform to the `AirDataResponse` JSON Schema (§10.3, already tested in `tests/schema/`). |
| 3 | **Caching layer** | §8.3, §13 | Redis or in-memory LRU cache. TTLs: live ≤ 15 min, recent ≤ 60 min, stale ≤ 6 h, very_stale ≤ 24 h. Every cached response carries `freshness` tier label. |
| 4 | **Deterministic exposure engine** (server wiring) | §8.3 | The engine (`src/lib/exposure-engine.ts`) already exists and is tested. Wire it into an API route: `POST /api/v1/exposure/compute`. Input: `{ memberId, homeProfile, ambientPm25 }`. Output: `ExposureResult`. |
| 5 | **AQI conversion endpoint** | §11.1 | `GET /api/v1/aqi?pm25=<value>&scale=india|us`. Uses `src/lib/aqi-breakpoints.ts`. |
| 6 | **Health check endpoint** | §11 | `GET /api/v1/health` → `{ status, version, uptime, providers: { cpcb, safar, openaq, open_meteo } }` |
| 7 | **Environment config** | §8.5 | Load all API keys from env vars (see `.env.example`). Never hardcode. Use `zod` for env validation at startup. Fail fast with clear error if a required var is missing. |
| 8 | **Seed data** | §10 | Provide a `seed.ts` script with the Priya-household fixture (from master doc §2 personas) for local development. Label all seed data as `"Sample"`. |

### 1.2 Do NOT Build Yet

These are explicitly deferred to M1+ milestones. If you find yourself reaching for them, stop and log a decision.

- ❌ UI / frontend pages (M1)
- ❌ Authentication / user accounts (M2)
- ❌ LLM agent layer (M2)
- ❌ Myth Buster feature (M2)
- ❌ Pledge / leaderboard (M3)
- ❌ WhatsApp / SMS integration (M5+)
- ❌ Photo-based ventilation scoring (Phase 2)
- ❌ Multilingual / voice (Phase 3)

---

## 2. Technical Constraints

| Constraint | Rule |
|---|---|
| **LLM explains, code calculates** | Every number must come from the deterministic engine. No LLM calls in M0. |
| **Data provenance** | Every `air_readings` row must have `source`, `station_or_grid`, `observed_at`, `age_minutes`, `freshness`. |
| **No invented data** | Seed data is labeled `"Sample"`. Integration tests against real APIs use recorded fixtures (VCR pattern), not mocked values. |
| **Health guardrail** | Not wired in M0 (no user-facing flow), but the data model must include the `symptom_reports` table stub. |
| **Secrets** | Never commit API keys. Use `.env` + `.env.example`. |

---

## 3. Exit Gate (all must pass before M0 → M1)

### 3.1 Tests That Must Pass

```bash
# Existing tests (must still pass)
npx vitest run tests/unit/exposure-engine.test.ts
npx vitest run tests/unit/aqi-breakpoints.test.ts
npx vitest run tests/schema/schemas.test.ts

# New tests you write in M0
npx vitest run tests/unit/air-provider.test.ts     # adapter interface contract
npx vitest run tests/unit/cache-layer.test.ts       # TTL, freshness labeling
npx vitest run tests/integration/exposure-api.test.ts  # POST /api/v1/exposure/compute
npx vitest run tests/integration/aqi-api.test.ts       # GET /api/v1/aqi
npx vitest run tests/integration/health-api.test.ts    # GET /api/v1/health
```

### 3.2 CI Gate

- `npx vitest run` → all green
- `npx tsc --noEmit` → no type errors
- `npm audit --audit-level=critical` → no new critical vulnerabilities (pre-existing Next.js upstream issues are logged, not blocking)

### 3.3 Manual Verification

- [ ] `GET /api/v1/health` returns provider status for all 4 providers
- [ ] `POST /api/v1/exposure/compute` with the Priya fixture returns a valid `ExposureResult`
- [ ] `GET /api/v1/aqi?pm25=185&scale=india` returns `{ value: ~287, category: "Poor" }`
- [ ] Database migrations run cleanly on a fresh SQLite/Postgres instance
- [ ] `.env.example` lists every required env var with a description
- [ ] No secrets in git history (`git log --all --diff-filter=A -- '*.env' '*.key'` returns nothing)

### 3.4 Documentation

- [ ] Update `README.md` with M0-specific setup instructions (run migrations, seed, start dev server)
- [ ] Add `DECISIONS.md` or append to master doc §3 with any new decisions made during M0

---

## 4. Architecture Reminders

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  API Routes  │───▶│  Service Layer   │───▶│  Data Providers │
│  /api/v1/*   │    │  ExposureService │    │  CPCB, SAFAR,   │
│              │    │  AqiService      │    │  OpenAQ, CAMS   │
└─────────────┘    └──────────────────┘    └─────────────────┘
                           │                        │
                           ▼                        ▼
                   ┌──────────────┐         ┌──────────────┐
                   │  Cache Layer │         │  Database    │
                   │  (Redis/LRU) │         │  (Prisma)    │
                   └──────────────┘         └──────────────┘
```

### Provider Interface (implement this)

```typescript
interface AirDataProvider {
  readonly name: string;
  readonly priority: number; // lower = preferred
  isAvailable(): Promise<boolean>;
  fetchAirData(lat: number, lon: number): Promise<AirDataResponse>;
}
```

### Fallback Chain Logic

```typescript
async function getAirData(lat: number, lon: number): Promise<AirDataResponse> {
  // 1. Check cache (by lat/lon rounded to 2 decimals)
  // 2. Try providers in priority order: CPCB(1) → SAFAR(2) → OpenAQ(3) → CAMS(4)
  // 3. On success: cache with TTL based on freshness, return
  // 4. On all-fail: return last cached value with freshness='very_stale'
  // 5. On cache-miss + all-fail: throw AirDataUnavailableError
}
```

---

## 5. Quality Checklist (run before marking M0 done)

- [ ] Every new file has a header comment citing its master doc section reference
- [ ] No `console.log` in production code (use a structured logger)
- [ ] No `any` types in TypeScript (use `unknown` + type guards)
- [ ] Every API response includes `Content-Type: application/json` and standard error shape: `{ error: { code, message, details? } }`
- [ ] Rate limiting is documented (not necessarily implemented in M0, but the middleware stub exists)
- [ ] All env vars validated at startup with `zod` schema

---

## 6. What Success Looks Like

When M0 is complete, a developer should be able to:

```bash
git clone <repo>
cp .env.example .env   # fill in API keys
npm install
npm run db:migrate      # or prisma migrate dev
npm run db:seed         # loads Priya household fixture
npm run dev             # starts Next.js dev server
curl http://localhost:3000/api/v1/health
# → { "status": "ok", "version": "0.1.0", "providers": { ... } }
curl -X POST http://localhost:3000/api/v1/exposure/compute \
  -H 'Content-Type: application/json' \
  -d '{"memberId":"priya-001","homeProfile":{"homeType":"apartment","ventilation":"windows","hasPurifier":false,"purifierCadrM3h":0,"windowsOpen":false},"ambientPm25":185}'
# → { "memberId": "priya-001", "doseUg": ..., "cigaretteEquiv": 8.4, ... }
```

---

## 7. Decision Log Template

For every decision made during M0, append an entry:

```markdown
### DEC-M0-NNN: <title>
- **Date:** YYYY-MM-DD
- **Decision:** <what was chosen>
- **Alternatives considered:** <what was rejected and why>
- **Rationale:** <reasoning>
- **Reversible?:** Yes/No
- **Master doc reference:** §N.N
```
