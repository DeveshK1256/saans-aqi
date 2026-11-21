# Saans (सांस) — Breathe Smarter, Together.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/DeveshK1256/saans-aqi)

A GenAI-powered urban air quality assistant that helps Indian families understand, reduce, and collectively act on air pollution exposure.

> **Status:** Planning complete. M0 (Foundation) build starting.

## What is Saans?

Saans transforms raw air-quality data into personalized, household-level exposure estimates. It pairs every recommendation with its computed impact — in micrograms of PM2.5 avoided, cigarette-equivalents reduced, and CO₂ saved. Every number is computed by deterministic, unit-tested code — the LLM explains, code calculates.

**Saans is not** a medical device, sensor, or substitute for a physician.

## MVP Features

1. **Household Risk Profile** — 2-minute onboarding; every recommendation weighted by the most vulnerable member
2. **Personal Exposure Score** — estimated daily PM2.5 dose (µg) per person, not just a city AQI
3. **What-If Impact Simulator** — sliders for behavior changes → live recalculated dose (client-side, ≤ 100 ms)
4. **DIY Purifier Builder + Myth Buster** — Corsi-Rosenthal box guide; evidence-rated claim checker
5. **Neighborhood Clean-Air Pledge** — society leaderboard on collective emissions saved

## Documentation

- **Master Planning Document:** [`docs/SAANS_MASTER_DOC.md`](docs/SAANS_MASTER_DOC.md) — all 27 sections covering product vision, requirements, architecture, security, testing, and implementation plan
- **M0 Starter Prompt:** [`docs/STARTER_PROMPT_M0.md`](docs/STARTER_PROMPT_M0.md) — foundation milestone build instructions

## Project Structure

```
saans-aqi/
├── docs/                  # Planning documents
│   ├── SAANS_MASTER_DOC.md
│   └── STARTER_PROMPT_M0.md
├── src/
│   ├── lib/               # Deterministic engines (exposure, AQI, emission factors)
│   ├── components/        # React components
│   └── app/               # Next.js App Router pages
├── tests/
│   ├── unit/              # Unit tests (Vitest)
│   ├── schema/            # JSON Schema validation tests
│   └── eval/              # LLM evaluation test sets
├── public/                # Static assets
├── .github/workflows/     # CI pipeline
└── landing/               # Landing page (static)
```

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run schema tests only
npm run test:schema
```

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Cache | Upstash Redis |
| LLM | Gemini 2.0 Flash |
| Hosting | Vercel |
| CI | GitHub Actions |

## Environment Variables

See [`.env.example`](.env.example) for required variables. **Never commit secrets.**

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security

See [`SECURITY.md`](SECURITY.md). To report a vulnerability, email security@saans.app (placeholder — see Open Decisions).

## License

- Exposure/AQI computation engine (`src/lib/`): MIT License
- Product code, UI, agents: Proprietary (see [`LICENSE`](LICENSE))
