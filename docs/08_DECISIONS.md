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

## ADR-006: Google Sign-In & DPDP Act 2023 Explicit Consent Architecture
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Slice A2 introduces authenticated household risk profiling. Under India's Digital Personal Data Protection (DPDP) Act 2023, health-adjacent data requires explicit opt-in consent, purpose limitation, right to data portability (export), and right to erasure (deletion).
- **Decision:** Authenticate users via Google Sign-In (OpenID Connect / `GS-02`) with zero passwords stored locally. Enforce an explicit DPDP consent gate before any household profile is persisted. Implement `/api/household/export` and `DELETE /api/household` for full compliance.
- **Consequences:** Satisfies statutory requirements for Indian data privacy while maintaining seamless single-click user onboarding.

## ADR-007: Cloud KMS Field-Level Envelope Encryption for Sensitive Health Flags
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Storing sensitive category flags (e.g., asthma, pregnancy, cardiovascular conditions) in plaintext database columns creates substantial privacy risks during data dumps or unauthorized access.
- **Decision:** Implement Google Cloud KMS envelope encryption (`GS-12`, `SEC-20`) using authenticated AES-256-GCM. Sensitive fields are serialized into an authenticated envelope (`kms:{version}:{iv}:{ciphertext}:{authTag}`) before persistence. The database stores only ciphertext; decryption occurs transiently in memory for the verified owner.
- **Consequences:** Guarantees zero plaintext leakage at rest. Any ciphertext tampering causes GCM authentication failure and rejects processing.

## ADR-008: Single-Zone Mass Balance Differential Indoor Air Model
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Urban families spend 70–90% of their day indoors, where outdoor smog infiltrates and indoor sources (cooking, incense, coils) create dangerous localized PM2.5 concentrations. Simple empirical multipliers fail to account for building envelope leakage, CADR filtration decay rates, or volume dynamics.
- **Decision:** Implement the Nazaroff (2004) single-zone mass balance analytical differential equation:
  $$\lambda = a + k + \frac{Q_p}{V}$$
  $$C_{ss} = \frac{P \cdot a \cdot C_{out} + S / V}{\lambda}$$
  $$C_{in}(t + \Delta t) = C_{ss} + (C_{in}(t) - C_{ss}) \cdot e^{-\lambda \Delta t}$$
  All parameters ($P, k, a, S, V$) are maintained as `{low, central, high, unit, source, citation, verified}` in `data/params/` without hardcoded constants in logic.
- **Consequences:** Accurate transient and steady-state concentration predictions under window sealing, HEPA filtration, and indoor cooking emission events. Executes in <1 ms with zero I/O.

## ADR-009: Two-Way Impact What-If Engine (Personal Exposure & Community Emissions)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Features F4 & F5 require showing users both personal exposure reduction (µg/day dose avoided) and collective community emission mitigation (g CO2 and mg PM2.5 avoided) when making lifestyle modifications such as shifting from two-wheeler to metro or running an air purifier. The engine must adhere strictly to the Zero-Change Invariant (Part 3.4): zero drift or phantom savings when inputs remain unchanged.
- **Decision:** Build `simulateWhatIf` in `src/domain/exposure/what-if.ts`:
  1. **Zero-Change Invariant**: If overrides match baseline profile exactly, return strictly `{ low: 0.0, central: 0.0, high: 0.0 }` delta dose and `0.0 g` emissions avoided.
  2. **Exposure Reduction**: Evaluate baseline schedule vs scenario schedule across low, central, and high parameter bounds.
  3. **Community Emissions Avoided**: Calculate passenger-kilometer emission factors from ARAI/CPCB data (72 g CO2/km for petrol bike vs 16 g CO2/km for electric metro).
  4. **Relatable Unit Caveat**: Any cigarette-equivalent conversion (Berkeley Earth 22 µg/m³ = 1 cigarette) must accompany an explicit epidemiological disclaimer noting differing chemical composition and exposure pathways.
- **Consequences:** Provides transparent, scientifically rigorous, and empowering insights for families and communities without pseudo-scientific claims. Runs in <2 ms in-browser or on server.


## ADR-010: Curated Action Library with Physical Effect Models & Vulnerability-Weighted Ranker
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Feature F6 requires a curated action library with physical effect models rather than generic generative advice. Advice must prioritize the household member facing the highest physiological vulnerability (e.g. asthmatic child like Priya's child) while accounting for action difficulty, effort level, and two-way community co-benefits.
- **Decision:** Implement `ActionDefinition` library in `data/params/actions.json` with categories (`indoor_filtration`, `transit`, `source_control`, `envelope_sealing`, `behavioral`) and physical effect parameters. Implement `rankActions` in `src/domain/recommendations/action-ranker.ts`:
  1. Identify most vulnerable member with priority hierarchy: `hasAsthma && isChild/infant` > `isPregnant` > `isElderly && condition` > `hasAsthma` > `isChild` > `isElderly` > general.
  2. Compute physical dose reduction ($\mu\text{g/day}$) using the mass-balance and transit models for that specific vulnerable individual.
  3. Apply an effort-weighting factor: `score = deltaDose / (effortWeight * 0.8) + communityBonus`.
  4. Top 3 recommendations are generated with physical rule provenance, citations, and verified bounds.
- **Consequences:** Eliminates generic AI platitudes. Every action is quantitatively grounded in physical dose reduction for the person who needs it most.

## ADR-011: Numeric-Placeholder AI Architecture & Mathematical Consistency Verifier (GS-01)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Large Language Models (LLMs) frequently hallucinate or alter numerical quantities, which directly violates Saans's core tenet: "The LLM explains, code calculates." If an LLM changes an exposure reduction from $352.5\,\mu\text{g}$ to $400\,\mu\text{g}$, scientific credibility is lost.
- **Decision:** Implement a two-phase Numeric Placeholder Architecture:
  1. Pure domain code calculates all numbers and constructs a structured payload with exact calculated values and placeholder tokens: `{{delta_dose_ug}}`, `{{range_low}}`, `{{range_high}}`, `{{pct_saved}}`, `{{co2_avoided_g}}`.
  2. The Google Gemini API (`GS-01`) or fallback phraser is prompted strictly to weave natural Hindi/Marathi/English narrative *around* the placeholders without ever emitting raw numbers directly.
  3. `PlaceholderSubstitutor.substituteAndVerify()` populates the tokens and runs `verifyNumericConsistency()` to guarantee that every rendered numeric string exactly matches the physical engine output.
  4. If any discrepancy or missing placeholder is detected, the pipeline automatically falls back to deterministic template phrasing with zero user disruption.
- **Consequences:** 100% mathematical consistency guaranteed by unit tests. LLM fluency is achieved with zero risk of numerical hallucination.

## ADR-012: Diurnal Boundary-Layer Inversion Ventilation Planning & Stagnation Detection (F7, F22)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Features F7 and F22 require actionable micro-routines for natural ventilation and early warnings for atmospheric inversion events. In North Indian and Deccan plateau winters, nocturnal radiative cooling creates a sharp ground-level temperature inversion that traps vehicular and biomass exhaust below 350 meters, while afternoon solar heating breaks the inversion.
- **Decision:** Implement `generate24HourVentilationPlan()` and `planSmogForecast()` in `src/domain/routines/` and `src/domain/forecast/`:
  1. Flag Morning Peak (06:00–10:00) as Ground Inversion: strictly seal windows and avoid outdoor exertion.
  2. Flag Solar Mixing Window (12:00–16:00) as Optimal Ventilation: solar insolation elevates boundary layer height and wind speeds, making it safe to flush indoor CO₂ for 20 minutes.
  3. Detect Atmospheric Stagnation (`F22`): if surface wind speed drops below $1.5\,\text{m/s}$ and nocturnal boundary layer drops below $350\,\text{m}$, issue a Stagnation Alert ("Trapped Air Tonight").
  4. Produce 72-Hour Smog Prep Checklist with tangible items (N95 respirators, window sealing foam tape, HEPA replacement filters).
- **Consequences:** Replaces static advice with physically synchronized micro-routines based on meteorological boundary layer dynamics.

## ADR-013: Multimodal Route Air Quality & Inhaled Dose Comparison via Google Routes (F21, GS-08)
- **Status:** Accepted
- **Date:** 2026-11-19
- **Context:** Feature F21 requires cleaner-route commute comparisons. A commuter often faces a choice between a direct surface road (e.g. on a motorbike or auto-rickshaw directly behind heavy diesel trucks) versus a slightly longer transit route (e.g. electric metro rail corridor or separated arterial). Commuters need to see the difference in inhaled dose ($\mu\text{g}$) and tailpipe emissions eliminated ($\text{g CO}_2$).
- **Decision:** Implement `compareCommuteRoutes()` in `src/domain/routes/cleaner-route.ts`:
  1. Ingest route distance, travel duration, and mode for Route A (Standard Surface Arterial) and Route B (Cleaner Metro Transit Corridor).
  2. Compute microenvironment exposure factor ($1.8\times$ ambient for open two-wheeler traffic vs $0.35\times$ for air-conditioned metro train).
  3. Inhalation rate scaled by activity level (light physical driving vs seated passenger).
  4. Calculate inhaled PM2.5 dose ($\mu\text{g}$) and community tailpipe $\text{CO}_2$ mitigation (e.g., $1,120\,\text{g CO}_2$ saved for a 20 km round-trip commute).
- **Consequences:** Empowers commuters with tangible quantitative proof of both personal health protection and environmental impact.
