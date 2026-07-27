# IrrigaSmart — AI Developer Handoff Document

**Prepared for:** Kimi K3 (or any successor AI developer)
**Project owner:** IrrigaSmart Dev
**Date:** 2026-07-27
**Status:** MVP complete, deployed, ready for Phase 2 development

---

## 1. What Is IrrigaSmart?

IrrigaSmart is an **offline-first Progressive Web Application (PWA)** that helps smallholder farmers in India decide:

1. **Should I irrigate today?**
2. **How much water should I apply?**
3. **Why is this recommendation being made?**

It is a **decision-support tool**, not an automation system. It never controls pumps, never guarantees yield, and never replaces an agricultural expert. Its entire value is in giving a farmer a trustworthy, explainable answer to those three questions — even when there is no internet connection.

The app is live at: **https://irriga-smart-frontend.vercel.app**
The backend API is live at: **https://irrigasmart-backend.onrender.com**

---

## 2. The Problem Being Solved

Smallholder farmers in rural India typically irrigate based on intuition, fixed schedules, or what their neighbours are doing — not on actual crop water requirements. This leads to:

- Over-irrigation (water waste, nutrient leaching, electricity cost)
- Under-irrigation (crop stress, yield loss)
- No understanding of *why* a decision was made

Existing "smart irrigation" products assume continuous internet, expensive IoT sensors, modern smartphones, English interfaces, and technically experienced users. None of those assumptions hold for the target user.

IrrigaSmart's answer: a free, installable PWA that works offline, explains every recommendation in plain language, and requires only a basic Android phone.

---

## 3. Target Users

### Primary user — Rajesh (the design persona)
- Age 42, village of Bolpur, West Bengal
- Owns 2 acres of rice on clay soil, uses drip irrigation
- Uses WhatsApp occasionally; internet is intermittent
- Doesn't know whether tomorrow's rain should delay today's irrigation
- Wants a simple answer he can trust, in under one minute
- Not technically experienced; may be a first-time smartphone user

### Secondary users
- Agricultural extension workers demonstrating the tool
- NGOs working with farming communities
- Agricultural researchers and students
- Anyone evaluating the platform for broader rollout

---

## 4. Product Philosophy (non-negotiable principles)

These five principles govern every design and engineering decision. Do not violate them.

| Principle | Meaning |
|-----------|---------|
| **Trust before intelligence** | Every recommendation must be explained in plain language. Explainability > accuracy. Never show a black-box result. |
| **Offline first** | The app must work fully after the first load, with no internet. Connectivity improves the experience; it does not enable it. |
| **Simplicity wins** | The simplest correct solution is always preferred. No unnecessary AI models, no over-engineering. |
| **Accessibility** | Must work for first-time smartphone users, elderly farmers, low-literacy users, low-end Android devices, and inconsistent internet. |
| **Modular growth** | Future AI capabilities extend the existing engine — they never replace it. The architecture must stay layered and decoupled. |

---

## 5. Tech Stack

### Frontend
| Item | Value |
|------|-------|
| Framework | React 18.3.1 |
| Build tool | Vite 6 |
| Language | TypeScript (strict — no `any`) |
| PWA | vite-plugin-pwa (Workbox, generateSW mode) |
| Offline storage | IndexedDB via `idb` library |
| State management | Custom `useAppStore` hook (no Redux, no Zustand) |
| Navigation | State-based tab switching — no react-router |
| Styling | Plain CSS with CSS custom properties (no Tailwind, no CSS-in-JS) |
| Package manager | npm workspaces (monorepo) |

### Backend
| Item | Value |
|------|-------|
| Runtime | Node.js 20 |
| Framework | Express 4.21.2 |
| Language | TypeScript (strict, NodeNext module resolution) |
| Weather provider | Open-Meteo (free, **no API key required**) |
| Dev server | `tsx watch` |
| Production build | `tsc` → `dist/`, started with `node dist/index.js` |

### Hosting
| Service | What it hosts |
|---------|--------------|
| Vercel | Frontend (CDN, ideal for PWA) |
| Render (free tier) | Backend API |

### Key environment variables
| Variable | Where set | Purpose |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | Vercel dashboard | Backend URL baked into the frontend bundle at build time |
| `CORS_ORIGIN` | Render dashboard | Comma-separated list of allowed frontend origins |
| `NODE_ENV` | Render dashboard (`production`) | Prevents Express stack-trace leaks |
| `NODE_VERSION` | render.yaml (`20`) | Pins Node version on Render |

**Important Render build note:** The build command is `npm install --include=dev && npm run build --workspace backend`. The `--include=dev` flag is required because `NODE_ENV=production` would otherwise cause npm to skip `devDependencies`, which includes the TypeScript compiler and `@types/*` packages needed to compile the backend.

---

## 6. Repository Structure

```
IrrigaSmart/                     ← monorepo root
├── package.json                 ← npm workspaces config, root scripts
├── render.yaml                  ← Render Blueprint (backend deploy config)
├── README.md
├── DEPLOYMENT.md                ← step-by-step Vercel + Render deploy guide
├── docs/                        ← engineering specification (source of truth)
│   ├── 00_Master_PRD_Part1.md   ← product vision, users, philosophy
│   ├── 00_Master_PRD_Part2.md   ← extended product requirements
│   ├── 01_System_Architecture.md
│   ├── 02_Decision_Engine.md    ← pipeline stages
│   ├── 03_Data_Models.md        ← all entity shapes
│   ├── 04_System_Interfaces.md  ← API contracts
│   ├── 05_UI_UX_Spec.md         ← screen layouts, interaction rules
│   ├── 06_Development_Roadmap.md ← phase-by-phase plan (all ✅ for MVP)
│   ├── 07_Engineering_Rules.md  ← coding standards (must follow)
│   ├── 08_Testing_Strategy.md   ← testing levels and checklists
│   ├── 09_AI_Implementation_Guide.md ← AI assistant instructions
│   ├── 10_Knowledge_Base.md     ← agronomic facts (crops, soils, methods)
│   ├── 11_Decision_Logic.md     ← formulas, parameters, thresholds
│   └── CLAUDE.md                ← AI assistant context file
├── frontend/
│   ├── vercel.json              ← SPA fallback rewrite for Vercel
│   ├── .env.example             ← documents VITE_API_BASE_URL
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── types/               ← all shared TypeScript entity types
│       │   ├── index.ts         ← barrel + enums (CROP_NAMES, SOIL_TYPES, etc.)
│       │   ├── farmer.ts
│       │   ├── farm.ts
│       │   ├── crop.ts
│       │   ├── soil.ts
│       │   ├── weather.ts
│       │   ├── recommendation.ts
│       │   ├── history.ts
│       │   └── settings.ts
│       ├── storage/             ← ALL IndexedDB access lives here
│       │   ├── db.ts            ← DB schema, version, store names
│       │   ├── repository.ts    ← generic CRUD base
│       │   ├── repositories.ts  ← typed repos (farmers, farms, crops, etc.)
│       │   ├── settingsStore.ts ← app settings (name, language, units)
│       │   ├── weatherCacheStore.ts ← per-farm weather cache
│       │   └── index.ts         ← barrel
│       ├── services/            ← business logic (no React, no browser APIs)
│       │   ├── decisionEngine.ts   ← FAO-56 irrigation recommendation engine
│       │   ├── decisionParameters.ts ← all numeric constants (single source)
│       │   ├── knowledgeBase.ts    ← Kc values, soil profiles, method labels
│       │   ├── weatherService.ts   ← fetch weather + offline cache fallback
│       │   ├── apiClient.ts        ← centralized fetch wrapper (all network calls)
│       │   └── index.ts            ← barrel
│       ├── app/                 ← integration layer wiring storage + services
│       │   ├── useAppStore.ts   ← main React hook (AppStore interface)
│       │   ├── appTypes.ts      ← FarmDraft, FarmProfile, RecommendationView
│       │   ├── defaults.ts
│       │   └── entityFactories.ts
│       ├── components/          ← reusable presentational components
│       │   ├── RecommendationCard.tsx
│       │   ├── WeatherSummary.tsx
│       │   ├── BottomNav.tsx
│       │   ├── OfflineBanner.tsx
│       │   └── format.ts        ← formatLiters, formatMm, statusColor
│       ├── pages/               ← one file per tab/screen
│       │   ├── Dashboard.tsx    ← main screen: farm select + recommendation
│       │   ├── FarmsPage.tsx    ← farm list with add/edit/delete
│       │   ├── FarmForm.tsx     ← create/edit farm (text inputs for coords)
│       │   ├── HistoryPage.tsx  ← chronological recommendation history
│       │   └── SettingsPage.tsx ← farmer name, language, units
│       ├── hooks/
│       │   └── useOnlineStatus.ts
│       ├── App.tsx              ← shell: header + BottomNav + page routing
│       ├── App.css              ← all application styles
│       └── main.tsx
└── backend/
    ├── .env.example             ← documents PORT and CORS_ORIGIN
    ├── tsconfig.json
    └── src/
        ├── index.ts             ← Express app: /health + GET /api/weather
        └── weather.ts           ← Open-Meteo integration
```

---

## 7. Architecture — How It All Fits Together

The architecture is strictly layered. **Business logic never lives in UI components.**

```
┌─────────────────────────────────────────────────────┐
│  Presentation Layer                                  │
│  App.tsx → pages/* → components/*                   │
│  Only displays data, handles user input,             │
│  calls app store methods                             │
└────────────────────┬────────────────────────────────┘
                     │ calls
┌────────────────────▼────────────────────────────────┐
│  Application Layer (app/)                            │
│  useAppStore — wires storage + weather + engine      │
│  Exposes: farmer, profiles, generateForFarm(id)      │
└──────┬──────────────────────┬───────────────────────┘
       │ reads/writes         │ calls
┌──────▼──────────┐  ┌────────▼────────────────────────┐
│  Storage Layer  │  │  Services Layer                  │
│  storage/*      │  │  decisionEngine.ts (pure, no I/O)│
│  IndexedDB only │  │  weatherService.ts (fetch+cache) │
│  No UI access   │  │  apiClient.ts (all network calls)│
└─────────────────┘  └────────────────────────────────┘
                                    │ HTTP
                          ┌─────────▼──────────┐
                          │  Backend (Render)   │
                          │  GET /api/weather   │
                          │  GET /health        │
                          └─────────┬───────────┘
                                    │ HTTPS
                          ┌─────────▼──────────┐
                          │  Open-Meteo API     │
                          │  (no key required)  │
                          └────────────────────┘
```

### Key architectural rules
- **All network calls** go through `apiClient.ts`. No component or service calls `fetch` directly.
- **All IndexedDB access** goes through `storage/`. No component touches IndexedDB directly.
- **The decision engine** (`decisionEngine.ts`) is pure TypeScript — no React, no browser APIs, no I/O. It takes a farm profile + weather data and returns a recommendation. It is independently testable.
- **Navigation** is a `Tab` union type (`'dashboard' | 'farms' | 'history' | 'settings'`) managed in `useAppStore`. There is no react-router.
- **TypeScript is strict**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `no-explicit-any` (ESLint error). Never use `any`.

---

## 8. The Decision Engine — How Recommendations Are Made

This is the core of the product. It lives in `frontend/src/services/decisionEngine.ts` and `decisionParameters.ts`. All numeric constants are in `decisionParameters.ts` — changing a number there changes behavior everywhere without touching logic.

### The formula (FAO-56 based)

```
1. Look up Kc (crop coefficient) for crop + growth stage
2. ETc_adj = Kc × ETo_ref × weatherMultiplier   (crop water demand, mm/day)
3. Pe = rainfallForecast × rainEffFactor(soil)   (effective rainfall, mm)
4. NIR = max(0, ETc_adj − Pe)                    (net irrigation need, mm)

5. Decision:
   if Pe ≥ ETc_adj          → "Delay Irrigation"
   else if NIR < skipThreshold(soil) → "Monitor Tomorrow"
   else                     → "Irrigate Today"

6. If "Irrigate Today":
   grossDepth_mm = NIR / efficiency(irrigationMethod)
   volume_liters = grossDepth_mm × area_m2

7. Confidence = High if weather ≤ 6h old, Medium if ≤ 24h, Low otherwise
8. Explanation = plain-language sentence naming the key factors
```

### Key parameters (from `decisionParameters.ts` / `docs/11_Decision_Logic.md`)

| Parameter | Value | Notes |
|-----------|-------|-------|
| `ETo_ref` | 5.0 mm/day | Reference ET baseline (FAO indicative range 4–7) |
| `T_BASE` | 30°C | Temperature reference for weather multiplier |
| `H_BASE` | 55% | Humidity reference |
| `W_BASE` | 2 m/s | Wind speed reference |
| Clay `rainEffFactor` | 0.85 | Fraction of rain that is effective |
| Sandy `rainEffFactor` | 0.60 | |
| Clay `skipThreshold` | 2.0 mm | Below this NIR → Monitor Tomorrow |
| Drip efficiency | 0.90 | Applied water efficiency |
| Flood efficiency | 0.50 | |
| `FRESH_MAX_HOURS` | 6 | Weather age for High confidence |
| `STALE_MAX_HOURS` | 24 | Weather age for Medium confidence |
| `IRRIGATION_TIME_DEFAULT` | 06:00 | Early morning to minimize evaporation |

### Worked example
Farm: Rice, Clay, Drip, 2 acres, Mid Season. Weather: 34°C, 50% humidity, 3 m/s wind, 2 mm rain, observed 3h ago.
```
Kc = 1.20 (rice mid season)
weatherMultiplier ≈ 1.118
ETc_adj = 1.20 × 5.0 × 1.118 ≈ 6.71 mm
Pe = 2 × 0.85 = 1.70 mm
NIR = 6.71 − 1.70 = 5.01 mm  (> clay skipThreshold 2.0)
→ "Irrigate Today"
grossDepth = 5.01 / 0.90 = 5.57 mm
volume = 5.57 × 8093.72 ≈ 45,082 L
confidence = High (weather 3h old ≤ 6h)
```

---

## 9. Offline Architecture

Offline-first is a first-class feature, not an afterthought.

### How it works
1. **Service worker** (Workbox, generated by vite-plugin-pwa) caches the entire app shell on first load. The app opens from cache on every subsequent load, with or without internet.
2. **IndexedDB** (via `idb`) stores all farmer/farm/crop/soil/recommendation/history data locally. Data survives browser refresh and app reinstall.
3. **Weather cache** (`storage/weatherCacheStore.ts`): when a live weather fetch succeeds, the result is stored per farm. When the backend is unreachable, `weatherService.ts` falls back to the cached entry and sets `fromCache: true`.
4. **Offline indicator**: `useOnlineStatus.ts` hook + `OfflineBanner.tsx` shows a banner when the device is offline.
5. **Confidence reflects data freshness**: a recommendation generated from 20-hour-old cached weather gets `Medium` confidence; from no weather at all, `Low` confidence with an explanatory note.

### What works offline
- Opening the app ✓
- Viewing existing farms ✓
- Generating a recommendation (using cached weather) ✓
- Viewing history ✓
- Editing settings ✓

### What requires internet
- Fetching fresh weather (degrades gracefully to cache)

---

## 10. Data Models

All types are in `frontend/src/types/`. Key entities:

```typescript
// A farmer (the app user)
Farmer { id, name, createdAt, updatedAt }

// A farm profile
Farm { id, farmerId, name, location: {latitude, longitude, label?},
       area, areaUnit, irrigationMethod, createdAt, updatedAt }

// A crop assigned to a farm
Crop { id, farmId, name, growthStage, plantingDate?, expectedHarvestDate? }

// Soil assigned to a farm
Soil { id, farmId, name, texture?, drainageClass?, waterHoldingCapacity? }

// Weather data (from backend or cache)
WeatherData { temperature, humidity, rainfallForecast, windSpeed, cloudCover,
              observationTime, dataSource }

// A recommendation (output of decision engine)
Recommendation { id, farmId, status: 'Irrigate Today'|'Delay Irrigation'|'Monitor Tomorrow',
                 recommendedTime, estimatedWaterAmount: {depthMm, volumeLiters},
                 explanation, confidence: 'High'|'Medium'|'Low', generatedAt }

// History entry
History { id, farmId, date, recommendation, weatherSnapshot }
```

Supported enum values (from `types/index.ts`):
- **Crops:** Rice, Wheat, Maize, Cotton, Sugarcane, Soybean, Groundnut, Tomato, Potato, Onion
- **Growth stages:** Initial, Development, Mid Season, Late Season
- **Soil types:** Sandy, Loamy, Clay
- **Irrigation methods:** Drip, Sprinkler, Furrow, Flood
- **Area units:** Square metre, Acre, Hectare

---

## 11. IndexedDB Schema

Database name: `irrigasmart`, version: `1`

| Store | Key | Indexes |
|-------|-----|---------|
| `farmers` | `id` | — |
| `farms` | `id` | `byFarmer` (farmerId) |
| `crops` | `id` | — |
| `soils` | `id` | — |
| `recommendations` | `id` | `byFarm` (farmId) |
| `history` | `id` | `byFarm` (farmId), `byDate` (date) |
| `weatherCache` | `farmId` | — |
| `settings` | (key-value) | — |

---

## 12. Backend API

The backend is intentionally minimal — it is stateless and only proxies weather.

### `GET /health`
Returns service status. Used by Render for health checks.
```json
{ "status": "ok", "data": { "service": "irrigasmart-backend", "version": "0.1.0" }, "timestamp": "..." }
```

### `GET /api/weather?lat={lat}&lon={lon}`
Returns current weather + today's rainfall forecast from Open-Meteo.
```json
{
  "status": "ok",
  "data": {
    "temperature": 29.0,
    "humidity": 84,
    "rainfallForecast": 15.2,
    "windSpeed": 3.46,
    "cloudCover": 95,
    "observationTime": "2026-07-27T17:00:00.000Z",
    "dataSource": "open-meteo"
  },
  "timestamp": "..."
}
```

Error envelope:
```json
{ "status": "error", "errorCode": "INVALID_INPUT"|"WEATHER_UNAVAILABLE", "message": "...", "timestamp": "..." }
```

### CORS
The backend only allows origins listed in `CORS_ORIGIN`. Currently: `https://irriga-smart-frontend.vercel.app`. Requests from other origins are silently rejected (no stack trace, no error body).

---

## 13. Current MVP Status — What Is Done

All 9 roadmap milestones are complete (✅ in `docs/06_Development_Roadmap.md`):

| Phase | What was built |
|-------|---------------|
| 0 — Foundation | Monorepo, Vite+React+TS, PWA config, ESLint, Prettier |
| 1 — Data models | All TypeScript entity types, enums, constants |
| 2 — Offline storage | IndexedDB schema, generic repository, all typed stores |
| 3 — Decision engine | FAO-56 engine, knowledge base, deterministic parameters |
| 4 — Weather integration | Backend Open-Meteo proxy, frontend apiClient + weatherService with cache/fallback |
| 5 — User interface | All 4 tabs (Dashboard, Farms, History, Settings), BottomNav, all components |
| 6 — Integration | useAppStore wiring all layers end-to-end |
| 7 — Testing & polish | Bug fixes, offline verification, CORS hardening, deployment |

### Known working (verified in production)
- Live weather fetch from Render → Open-Meteo → Vercel frontend ✓
- Offline fallback to cached weather ✓
- All three recommendation outcomes (Irrigate Today / Delay / Monitor) ✓
- Farm CRUD with decimal coordinate input ✓
- Settings name save → dashboard greeting update ✓
- PWA installable on Android/iOS ✓
- CORS locked to Vercel origin ✓

---

## 14. What Is NOT Built (Deferred Features)

These are explicitly out of scope for the MVP. Do not implement them unless the project owner asks:

- Authentication / user accounts
- Cloud synchronization
- AI advisory / LLM chatbot
- IoT sensor integration
- Satellite imagery
- Yield prediction
- Disease detection
- Voice assistant
- Push notifications
- Automatic pump control
- Multi-language UI (Settings stub exists, but translations are not wired)
- SMS alerts
- Community features
- Payments / marketplace

---

## 15. Engineering Rules (must follow)

These come from `docs/07_Engineering_Rules.md`. They are non-negotiable.

1. **No `any` in TypeScript.** ESLint is configured to error on it. `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are enabled.
2. **Business logic never in UI components.** React components only display data, handle input, and call store methods.
3. **All network calls through `apiClient.ts`.** No component or service calls `fetch` directly.
4. **All IndexedDB access through `storage/`.** No component touches IndexedDB directly.
5. **The decision engine is pure.** No React, no browser APIs, no I/O. Same input → same output, always.
6. **Build only what the current phase requires.** Do not implement deferred features.
7. **Before adding a dependency**, verify the browser can't solve it natively and existing deps can't either.
8. **Before considering work complete**: no duplicated logic, no unused code, TypeScript passes, lint passes, build succeeds.
9. **Comments explain *why*, not *what*.** Code should be self-documenting.
10. **If documentation is ambiguous**, ask for clarification instead of guessing.

---

## 16. Testing Strategy

From `docs/08_Testing_Strategy.md`:

### Unit tests (not yet written — priority for next phase)
Test these functions in isolation:
- `decisionEngine.ts` — all three outcomes, edge cases (zero rain, extreme heat, missing weather)
- `decisionParameters.ts` — verify parameter values match the worked example in `docs/11_Decision_Logic.md`
- `weatherService.ts` — cache hit, cache miss, API error fallback
- `format.ts` — `formatLiters`, `formatMm`, `statusColor`
- Storage repositories — CRUD round-trips

### Integration tests (not yet written)
- UI → decision engine → storage round-trip
- Weather fetch → cache → offline fallback
- Farm create → recommendation generate → history save

### Manual functional tests (all passing)
- Create/edit/delete farm ✓
- Generate recommendation for each outcome ✓
- Offline mode (kill backend, reload) ✓
- PWA install ✓
- Settings name save ✓
- History view ✓

### Bug classification
- **Critical**: prevents core workflow (recommendation, farm CRUD, offline)
- **Major**: feature works incorrectly but has a workaround
- **Minor**: cosmetic
- **Enhancement**: improvement suggestion

---

## 17. Development Setup

```bash
# Prerequisites: Node.js >= 20, npm >= 10

git clone <repo>
cd IrrigaSmart
npm install          # installs all workspaces

npm run dev          # starts frontend (:5173) + backend (:3001) in parallel
npm run build        # builds both workspaces
npm run typecheck    # TypeScript check both workspaces
npm run lint         # ESLint both workspaces
npm run format       # Prettier format
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

No `.env` files are needed for local development — the frontend defaults to `http://localhost:3001` and the backend defaults to port 3001 with CORS open to `http://localhost:5173`.

---

## 18. Deployment

Full guide: `DEPLOYMENT.md` in the repo root.

**Short version:**
1. Push to GitHub
2. Deploy backend on Render (Blueprint detects `render.yaml`) — copy the backend URL
3. Deploy frontend on Vercel (Root Directory = `frontend`, set `VITE_API_BASE_URL` = backend URL) — copy the frontend URL
4. Set `CORS_ORIGIN` = frontend URL on Render → redeploy

**Critical Render build note:** Use `npm install --include=dev` in the build command. `NODE_ENV=production` causes npm to skip devDependencies, which breaks the TypeScript compile.

---

## 19. Suggested Next Steps (in priority order)

These are the owner's stated priorities for Phase 2, in recommended order:

1. **"Use my location" button** on the farm form — browser Geolocation API auto-fills lat/long. Highest real-world UX impact; farmers stand in their field and tap one button.
2. **Unit tests for the decision engine** — the engine is pure and deterministic, making it ideal for unit testing. This is the most important quality investment.
3. **Multi-day forecast** — extend the Open-Meteo call to return 3–5 days of rainfall forecast; show a simple outlook on the dashboard.
4. **Localization (Hindi/Bengali)** — the Settings page has a language toggle stub. Wire real translations using a simple key-value map (no i18n library needed for MVP scale).
5. **AI advisory layer** — an LLM that explains recommendations conversationally and answers "why?" follow-ups. This is the "AI-ready" promise in the product name. Use the Claude API (see `docs/09_AI_Implementation_Guide.md`).
6. **Always-on backend** — Render free tier sleeps after ~15 min idle, causing ~50s cold starts. Upgrade to a paid plan or add a keep-warm ping.

---

## 20. Key Files to Read First

If you are starting fresh, read these in order:

1. `docs/00_Master_PRD_Part1.md` — product vision, users, philosophy
2. `docs/06_Development_Roadmap.md` — what is done, what is next
3. `docs/07_Engineering_Rules.md` — coding standards (mandatory)
4. `docs/11_Decision_Logic.md` — the recommendation formula and all parameters
5. `docs/09_AI_Implementation_Guide.md` — AI assistant instructions
6. `frontend/src/services/decisionEngine.ts` — the core engine implementation
7. `frontend/src/app/useAppStore.ts` — the integration layer
8. `frontend/src/storage/db.ts` — the IndexedDB schema

---

## 21. Important Gotchas

- **Render free tier cold starts**: the backend sleeps after ~15 min idle. The first request after idle takes ~50s. The app handles this gracefully by falling back to cached weather.
- **Vite bakes env vars at build time**: `VITE_API_BASE_URL` is embedded in the JS bundle during `vite build`. Changing it on Vercel requires a redeploy — it is not read at runtime.
- **CORS_ORIGIN must be exact**: `https://irriga-smart-frontend.vercel.app` — no trailing slash, correct subdomain. A mismatch silently blocks all API calls from the browser.
- **PWA service worker caching**: after a deploy, users may see the old version until the service worker updates. Hard-refresh (Ctrl+Shift+R) forces the update.
- **Growth stage is farmer-provided**: the engine does not derive it from a planting date. The farmer selects it when creating/editing a farm.
- **Cloud cover is not used numerically**: it is stored in the weather model for future ETo computation but intentionally excluded from the MVP formula. This is documented in `docs/11_Decision_Logic.md`.
- **No secrets exist**: Open-Meteo requires no API key. There is nothing sensitive in the codebase. The only "security" concern is the CORS allowlist.

---

*This document was generated from the live codebase and specification on 2026-07-27. The specification in `docs/` is the source of truth — if this document and the spec disagree, the spec wins.*
