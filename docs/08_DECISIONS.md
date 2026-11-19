# Architecture Decision Records (ADR Log) — Saans

## ADR-001: Maintain "Saans" as App Identity
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Challenge 6 specifies an urban air quality assistant. User explicitly instructed to keep the established name "Saans" (सांस) rather than "Swaas" or "Shwas".
- **Decision:** Keep "Saans" everywhere in repository, documentation, package name, database, and UI branding.
- **Consequences:** Consistency across master spec, previous commits, and deployed URLs.

## ADR-002: Next.js App Router + TypeScript Monolith for Slice A0
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Slice A0 establishes the foundation for full-stack deployment on Cloud Run / Netlify with API routes, server rendering, and client-side PWA capability.
- **Decision:** Use Next.js 14+ App Router with strict TypeScript (`noImplicitAny`, `strictNullChecks`). Shared domain logic in `src/domain` or `src/lib` imported by both server API routes and client UI.
- **Consequences:** Single codebase for server calculation and client simulator with zero drift.

## ADR-003: Pure Domain Code Isolated from I/O (Science Rule)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Core principle: "The LLM explains, code calculates." All exposure, AQI, and dose numbers must be deterministic and testable without network or database dependencies.
- **Decision:** Pure calculation engines in `src/lib` (`exposure-engine.ts`, `aqi-breakpoints.ts`) have zero external runtime dependencies and execute in <10ms.
- **Consequences:** Enables property-based testing (fast-check), high mutation test coverage, and offline client execution.

## ADR-004: Priority Air Quality Ingestion with Multi-Tier Fallback and Grid Caching
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Slice A1 requires ingesting air quality data with high availability and resilience across Indian localities. Data must prioritize high-resolution hyperlocal feeds while gracefully falling back to official monitors or CAMS reanalysis during outages.
- **Decision:** Implement a multi-tier provider chain with `GoogleAirQualityProvider` (priority 1), `CpcbStationProvider` (priority 2), and `OpenMeteoProvider` (priority 4, CAMS reanalysis). A deterministic `GridCellCache` keys locations to ~1 km grid cells (`toFixed(2)`), applies 30-minute TTL for current readings and 3-hour for forecasts, and implements request coalescing to eliminate duplicate in-flight calls (`EFF-05`).
- **Consequences:** Ensures zero single points of failure. Primary provider failure degrades to CPCB or Open-Meteo seamlessly with provenance annotations.

## ADR-005: Deterministic Confidence & Staleness Meter ("I'm unsure" Behavior)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Raw AQI values without confidence context mislead users, especially when stations are distant, offline, or missing gaseous pollutants.
- **Decision:** Implement a 4-factor confidence scoring algorithm (data age weight 0.40, station distance weight 0.30, pollutant completeness weight 0.20, provider agreement weight 0.10). Readings older than 180 minutes or scoring below 0.45 automatically trigger `isUnsure: true` and switch UI to conservative protective guidance with transparent explanations.
- **Consequences:** Prevents false precision and builds user trust during sensor blackouts or regional inversions.
