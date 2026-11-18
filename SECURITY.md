# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Saans, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email: security@saans.app (placeholder — to be replaced with actual contact before launch)
3. Include: description of the vulnerability, steps to reproduce, potential impact, and any suggested fix.
4. We will acknowledge receipt within 48 hours and provide an initial assessment within 7 days.

## Scope

The following are in scope:
- PII exposure (member names, conditions, location)
- Authentication/authorization bypass (IDOR, session hijacking)
- Prompt injection leading to harmful advice
- API key exposure in client-side bundles
- File upload vulnerabilities (Phase 2)
- XSS or CSRF attacks
- Data leak in analytics pipeline

## Security Controls

See the master planning document, Section 14, for the full threat model and security controls (SEC-01 through SEC-15).

## Sensitive Data Handling

- Member names: AES-256 field-level encryption
- Health conditions: enum flags (not free text), RLS-protected
- Location: coarse (~1 km), precise GPS never stored
- Photo uploads (Phase 2): EXIF stripped, faces blurred, auto-deleted after 1 hour
- Analytics: no raw health data; anonymized event IDs only

## Dependencies

- Dependencies are pinned via lockfile
- `npm audit` runs in CI on every PR
- Dependabot alerts are enabled
- Secret scanning (`gitleaks`) runs in CI and pre-commit
