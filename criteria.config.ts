/**
 * Criteria Configuration for Saans (सांस)
 * Part 9.3 of docs/00_MASTER_SPEC.md
 *
 * Each check defines:
 * - id: Unique Check ID
 * - criterion: Category (Code Quality, Security, Efficiency, Testing, Accessibility, Google Services, Science)
 * - title: Concise description
 * - since: The first slice where this check is strictly applicable (A0..A10)
 * - run: Automated test function or shell command, or 'MANUAL'
 */

export interface CriteriaCheck {
  id: string;
  criterion: 'CQ' | 'SEC' | 'EFF' | 'TST' | 'A11Y' | 'GS' | 'SCI';
  title: string;
  since: 'A0' | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7' | 'A8' | 'A9' | 'A10';
  command?: string;
  isManual?: boolean;
}

export const CRITERIA_CHECKS: CriteriaCheck[] = [
  // --- Code Quality ---
  { id: 'CQ-01', criterion: 'CQ', title: 'TypeScript strict mode with 0 errors', since: 'A0', command: 'npx tsc --noEmit' },
  { id: 'CQ-02', criterion: 'CQ', title: 'ESLint strict with max-warnings 0', since: 'A0', isManual: true },
  { id: 'CQ-03', criterion: 'CQ', title: 'Prettier formatting verified', since: 'A0', isManual: true },
  { id: 'CQ-04', criterion: 'CQ', title: 'Function complexity ≤ 10, files ≤ 400 lines', since: 'A1', isManual: true },
  { id: 'CQ-05', criterion: 'CQ', title: 'Layer boundary rules (domain imports no I/O)', since: 'A1', command: 'npx vitest run tests/unit/ 2>&1' },
  { id: 'CQ-06', criterion: 'CQ', title: 'No dead code or unused exports (knip)', since: 'A1', isManual: true },
  { id: 'CQ-07', criterion: 'CQ', title: 'Code duplication below 3% (jscpd)', since: 'A1', isManual: true },
  { id: 'CQ-08', criterion: 'CQ', title: 'No unlinked TODO/FIXME comments', since: 'A0', isManual: true },
  { id: 'CQ-09', criterion: 'CQ', title: 'Environment variables validated via zod', since: 'A1', isManual: true },
  { id: 'CQ-10', criterion: 'CQ', title: 'Standard AppError shape in API routes', since: 'A0', command: 'npx vitest run tests/ 2>&1' },
  { id: 'CQ-11', criterion: 'CQ', title: 'TSDoc on public domain functions', since: 'A1', isManual: true },
  { id: 'CQ-12', criterion: 'CQ', title: 'Pinned dependencies and lockfile verified', since: 'A0', isManual: true },
  { id: 'CQ-13', criterion: 'CQ', title: 'Commit messages follow A<n>: title format', since: 'A0', isManual: true },

  // --- Security ---
  { id: 'SEC-01', criterion: 'SEC', title: 'Security headers present on all routes', since: 'A0', isManual: true },
  { id: 'SEC-02', criterion: 'SEC', title: 'Cookie flags & session security', since: 'A2', isManual: true },
  { id: 'SEC-03', criterion: 'SEC', title: 'Household authz matrix 100% isolation', since: 'A2', isManual: true },
  { id: 'SEC-04', criterion: 'SEC', title: 'All input endpoints validate with zod', since: 'A1', isManual: true },
  { id: 'SEC-05', criterion: 'SEC', title: 'CSRF Origin check on mutation requests', since: 'A2', isManual: true },
  { id: 'SEC-06', criterion: 'SEC', title: 'Rate limits on auth, LLM, and uploads', since: 'A2', isManual: true },
  { id: 'SEC-07', criterion: 'SEC', title: 'Upload hardening (EXIF stripped, private bucket)', since: 'A5', isManual: true },
  { id: 'SEC-08', criterion: 'SEC', title: 'XSS & injection payloads inert', since: 'A1', command: 'npx vitest run tests/schema/ 2>&1' },
  { id: 'SEC-09', criterion: 'SEC', title: 'Prompt injection eval 100% resilient', since: 'A6', command: 'npx vitest run tests/eval/ 2>&1' },
  { id: 'SEC-10', criterion: 'SEC', title: 'Gitleaks & secret scanner clean (0 leaks)', since: 'A0', command: 'git log --all --diff-filter=A -- "*.env" "*.key" 2>&1' },
  { id: 'SEC-11', criterion: 'SEC', title: 'CodeQL 0 high/critical vulnerabilities', since: 'A0', isManual: true },
  { id: 'SEC-12', criterion: 'SEC', title: 'npm audit clean for production deps', since: 'A0', isManual: true },
  { id: 'SEC-13', criterion: 'SEC', title: 'Trivy container scan clean, non-root user', since: 'A0', isManual: true },
  { id: 'SEC-14', criterion: 'SEC', title: 'IAM least privilege (Workload Identity)', since: 'A0', isManual: true },
  { id: 'SEC-15', criterion: 'SEC', title: 'Storage bucket private with 24h lifecycle', since: 'A5', isManual: true },
  { id: 'SEC-16', criterion: 'SEC', title: 'OIDC verification on job/cron endpoints', since: 'A7', isManual: true },
  { id: 'SEC-17', criterion: 'SEC', title: 'Structured logs contain zero PII / health data', since: 'A0', isManual: true },
  { id: 'SEC-18', criterion: 'SEC', title: 'DPDP consent, data export, & deletion work', since: 'A2', isManual: true },
  { id: 'SEC-19', criterion: 'SEC', title: 'SECURITY.md, privacy, & terms present', since: 'A0', isManual: true },
  { id: 'SEC-20', criterion: 'SEC', title: 'Field-level KMS encryption verified', since: 'A2', isManual: true },
  { id: 'SEC-21', criterion: 'SEC', title: 'k-Anonymity threshold (≥5 households) enforced', since: 'A8', isManual: true },
  { id: 'SEC-22', criterion: 'SEC', title: 'OWASP ZAP baseline 0 high alerts', since: 'A10', isManual: true },

  // --- Efficiency ---
  { id: 'EFF-01', criterion: 'EFF', title: 'Lighthouse mobile performance ≥ 90 (public)', since: 'A0', isManual: true },
  { id: 'EFF-02', criterion: 'EFF', title: 'JS bundle per route ≤ 170 KB gzip', since: 'A0', isManual: true },
  { id: 'EFF-03', criterion: 'EFF', title: 'What-if recomputation < 50ms in browser', since: 'A3', isManual: true },
  { id: 'EFF-04', criterion: 'EFF', title: 'Exposure compute < 20ms for 7 days', since: 'A3', command: 'npx vitest run tests/unit/exposure-engine.test.ts 2>&1' },
  { id: 'EFF-05', criterion: 'EFF', title: 'Air data grid-cell cache hit ratio ≥ 90%', since: 'A1', isManual: true },
  { id: 'EFF-06', criterion: 'EFF', title: 'First useful content < 3s on 3G network', since: 'A9', isManual: true },

  // --- Testing ---
  { id: 'TST-01', criterion: 'TST', title: 'Unit, schema, and golden tests present', since: 'A0', command: 'npx vitest run 2>&1' },
  { id: 'TST-02', criterion: 'TST', title: 'Domain code coverage ≥ 95% lines', since: 'A3', isManual: true },
  { id: 'TST-03', criterion: 'TST', title: 'Mutation test score ≥ 80% on domain logic', since: 'A3', isManual: true },
  { id: 'TST-04', criterion: 'TST', title: 'NAQI boundary & property tests passing', since: 'A1', command: 'npx vitest run tests/unit/aqi-breakpoints.test.ts 2>&1' },
  { id: 'TST-05', criterion: 'TST', title: 'Integration tests against Postgres/fixtures', since: 'A2', isManual: true },
  { id: 'TST-06', criterion: 'TST', title: 'E2E user journeys verified (Playwright)', since: 'A3', isManual: true },
  { id: 'TST-07', criterion: 'TST', title: 'AI evaluation thresholds passing', since: 'A6', command: 'npx vitest run tests/schema/ 2>&1' },
  { id: 'TST-08', criterion: 'TST', title: 'Google API contract tests with fixtures', since: 'A1', isManual: true },
  { id: 'TST-09', criterion: 'TST', title: 'Red-then-green regression tests for bugs', since: 'A0', isManual: true },
  { id: 'TST-10', criterion: 'TST', title: 'Flake-free test suite (20 consecutive passes)', since: 'A10', isManual: true },
  { id: 'TST-11', criterion: 'TST', title: 'Automated post-deploy smoke test green', since: 'A0', isManual: true },

  // --- Accessibility ---
  { id: 'A11Y-01', criterion: 'A11Y', title: 'Axe 0 accessibility violations', since: 'A0', isManual: true },
  { id: 'A11Y-02', criterion: 'A11Y', title: 'Keyboard-only navigable journeys', since: 'A0', isManual: true },
  { id: 'A11Y-03', criterion: 'A11Y', title: 'Skip link and focus management', since: 'A0', isManual: true },
  { id: 'A11Y-04', criterion: 'A11Y', title: 'Semantic landmarks and heading hierarchy', since: 'A0', isManual: true },
  { id: 'A11Y-05', criterion: 'A11Y', title: 'Accessible form inputs and error messages', since: 'A2', isManual: true },
  { id: 'A11Y-06', criterion: 'A11Y', title: 'WCAG contrast tokens (≥4.5:1 text, ≥3:1 UI)', since: 'A0', isManual: true },
  { id: 'A11Y-07', criterion: 'A11Y', title: 'Reflow at 320px viewport without truncation', since: 'A0', isManual: true },
  { id: 'A11Y-08', criterion: 'A11Y', title: 'Minimum 44px touch targets', since: 'A0', isManual: true },
  { id: 'A11Y-09', criterion: 'A11Y', title: 'Respects prefers-reduced-motion setting', since: 'A0', isManual: true },
  { id: 'A11Y-10', criterion: 'A11Y', title: 'Language tag and Devanagari typography', since: 'A0', isManual: true },
  { id: 'A11Y-11', criterion: 'A11Y', title: 'ARIA live regions for slider & dynamic calculations', since: 'A0', isManual: true },
  { id: 'A11Y-12', criterion: 'A11Y', title: 'AQI risk levels never communicated by color alone', since: 'A0', isManual: true },
  { id: 'A11Y-13', criterion: 'A11Y', title: 'Lighthouse Accessibility score = 100', since: 'A0', isManual: true },

  // --- Google Services ---
  { id: 'GS-01', criterion: 'GS', title: 'Gemini API integration with provider adapter', since: 'A4', isManual: true },
  { id: 'GS-02', criterion: 'GS', title: 'Google Sign-In (Auth.js / OpenID)', since: 'A2', isManual: true },
  { id: 'GS-03', criterion: 'GS', title: 'Google Cloud Run deployment container', since: 'A0', isManual: true },
  { id: 'GS-04', criterion: 'GS', title: 'Cloud Storage with signed URLs & 24h retention', since: 'A5', isManual: true },
  { id: 'GS-05', criterion: 'GS', title: 'Secret Manager integration for API keys', since: 'A0', isManual: true },
  { id: 'GS-06', criterion: 'GS', title: 'Cloud Tasks & Cloud Scheduler for alerts', since: 'A7', isManual: true },
  { id: 'GS-07', criterion: 'GS', title: 'Cloud Logging & Error Reporting configured', since: 'A0', isManual: true },
  { id: 'GS-08', criterion: 'GS', title: 'Google Maps Platform (Places, Geocoding, Routes)', since: 'A1', isManual: true },
  { id: 'GS-09', criterion: 'GS', title: 'Google Air Quality API primary ingestion', since: 'A1', isManual: true },
  { id: 'GS-10', criterion: 'GS', title: 'Firebase Cloud Messaging for web push', since: 'A7', isManual: true },
  { id: 'GS-11', criterion: 'GS', title: 'Cloud Text-to-Speech / Speech-to-Text', since: 'A7', isManual: true },
  { id: 'GS-12', criterion: 'GS', title: 'Cloud KMS field-level envelope encryption', since: 'A2', isManual: true },
  { id: 'GS-13', criterion: 'GS', title: 'Workload Identity Federation for keyless CI', since: 'A0', isManual: true },
  { id: 'GS-14', criterion: 'GS', title: 'Graceful degradation tested for all Google APIs', since: 'A1', isManual: true },

  // --- Science ---
  { id: 'SCI-01', criterion: 'SCI', title: 'All constants cite authoritative sources (EPA/CPCB)', since: 'A3', isManual: true },
  { id: 'SCI-02', criterion: 'SCI', title: 'Methodology page publishes all formulas & limits', since: 'A3', isManual: true },
  { id: 'SCI-03', criterion: 'SCI', title: 'Golden and property math tests all pass', since: 'A3', command: 'npx vitest run tests/unit/exposure-engine.test.ts 2>&1' },
  { id: 'SCI-04', criterion: 'SCI', title: 'LLM explains, code calculates (no LLM math)', since: 'A0', isManual: true },
  { id: 'SCI-05', criterion: 'SCI', title: 'Ranges displayed rather than false precision', since: 'A3', isManual: true },
  { id: 'SCI-06', criterion: 'SCI', title: 'Cigarette-equivalent unit shows explicit caveat', since: 'A0', isManual: true },
  { id: 'SCI-07', criterion: 'SCI', title: 'CPCB NAQI breakpoints table matches official spec', since: 'A1', command: 'npx vitest run tests/unit/aqi-breakpoints.test.ts 2>&1' },
];
