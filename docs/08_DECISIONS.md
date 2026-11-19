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
