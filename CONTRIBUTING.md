# Contributing to Saans

Thank you for your interest in contributing to Saans!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/saans-aqi.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env.local` and fill in values
5. Run tests: `npm test`

## Development Guidelines

### Code Style
- TypeScript strict mode
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- All code must pass ESLint and type-check before commit

### Testing Requirements
- Every deterministic function must have unit tests
- Property-based tests for mathematical functions (monotonicity, non-negativity)
- Schema tests for every API contract and LLM payload
- Eval tests for LLM agents (see `tests/eval/`)

### Key Principles
- **The LLM explains; code calculates.** No computed number may come from the LLM.
- **Every number is tappable.** Users must be able to see the source and formula behind any value.
- **The most vulnerable member drives recommendations.** Always.
- **No invented data.** Every air quality value must come from a real API with source attribution.

## Pull Request Process

1. Ensure all tests pass: `npm test`
2. Ensure no lint errors: `npm run lint`
3. Update documentation if your change affects the planning document
4. Write a clear PR description referencing the relevant FR/TC IDs

## Security

If you discover a security vulnerability, please report it responsibly per `SECURITY.md`. Do NOT open a public issue.
