# IrrigaSmart

Offline-first, AI-ready smart irrigation decision-support platform (PWA).

Helps smallholder farmers decide **when to irrigate, how much water to apply, and why** — working fully offline after initial setup.

## Monorepo layout

```
frontend/   React + Vite + TypeScript PWA
backend/    Express + TypeScript REST API (weather, future sync)
docs/       Engineering specification (source of truth)
```

## Prerequisites

- Node.js >= 20
- npm >= 10

## Getting started

```bash
npm install          # installs all workspaces
npm run dev          # runs frontend + backend together
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3001

## Common scripts (run from repo root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend and backend in parallel |
| `npm run build` | Build both workspaces |
| `npm run typecheck` | TypeScript check both workspaces |
| `npm run lint` | Lint both workspaces |
| `npm run format` | Prettier format the repo |

## Deployment

Frontend deploys to Vercel and the backend to Render, with the API locked to the
frontend origin via CORS and all config supplied through host environment variables
(no secrets in the repo). See [DEPLOYMENT.md](./DEPLOYMENT.md) for the step-by-step
guide, and `*.env.example` in each workspace for the required variables.

## Documentation

All product and engineering decisions live in [`docs/`](./docs). The specification is the
source of truth; code must not diverge from it silently. Start with
`docs/09_AI_Implementation_Guide.md`.

## Status

**MVP complete** — all roadmap phases (0–7) are implemented and verified end-to-end
(see `docs/06_Development_Roadmap.md`).

The primary workflow works fully: create a farm, receive a deterministic irrigation
recommendation with a plain-language explanation, review history, and continue offline
using cached weather. Weather comes from [Open-Meteo](https://open-meteo.com) via the
backend (no API key required).

### Architecture at a glance

```
frontend/src/
  types/       Core data models (Farmer, Farm, Crop, Soil, Weather, Recommendation…)
  storage/     IndexedDB layer (idb) — the only path to local persistence
  services/    Decision engine, knowledge base, weather + API client
  app/         Integration store wiring storage + weather + engine together
  components/  Presentational UI (RecommendationCard, WeatherSummary, nav…)
  pages/       Dashboard, Farms, Fertilizer, Settings
backend/src/
  index.ts     Express app: /health and GET /api/weather
  weather.ts   Open-Meteo provider integration
```

Business logic lives in `services/` and the decision engine is deterministic and
framework-independent; the UI only displays its output. Numeric formulas and parameters
are owned by `docs/11_Decision_Logic.md`.
