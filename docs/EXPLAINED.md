# IrrigaSmart — simple project explanation

Last checked: **22 October 2026**.

This file is a short memory of the current product. The numbered files in
`docs/` are still the detailed engineering source of truth.

## 1. What this app is

IrrigaSmart is an offline-first PWA for smallholder farmers. It helps answer:

- **When should I irrigate?**
- **How much water should I use?**
- **Why did the app make this recommendation?**

It also gives weather, soil, fertilizer, disease, reminder, and voice guidance.
The main product idea is: **simple, explainable advice that can keep working in
the field when the internet is weak or unavailable.**

## 2. Current status

The current local application is working as an MVP. The worktree is **not clean**:
many changes are modified, deleted, or untracked, so they are not safely recorded
in GitHub yet.

The current uncommitted work mainly does this:

- Removes the old live farmer chatbot and its large rule/LLM code path.
- Replaces it with a deterministic **Today briefing** and per-card speak buttons.
- Adds cloud TTS, offline TTS audio caching, provider fallback, and stop controls.
- Adds curated rice disease-management guidance after a photo result.
- Improves disease-photo, soil, fertilizer, dashboard, weather, translations,
  storage, tests, deployment settings, and package dependencies.
- Adds new backend TTS files and related frontend tests.

Important: untracked files are not included in a future commit until they are
reviewed and staged.

## 3. Main user flow

1. Open the app and complete onboarding.
2. Create a farm or select an existing farm.
3. Enter location, crop, growth stage, soil, irrigation method, and optional lab data.
4. The app loads weather and optional location, soil, and terrain information.
5. The deterministic decision engine produces an irrigation recommendation.
6. The dashboard explains the recommendation and lets the farmer log watering.
7. The farmer can use fertilizer, disease, reminders, and voice features as needed.
8. Farm data and cached results stay in the browser's IndexedDB database.

## 4. Features currently implemented

### Dashboard / Today

- Irrigate, delay, or monitor recommendation.
- Recommended time, litres, depth, duration, flow, confidence, reasons, and explanation.
- Current weather and cached/offline weather fallback.
- Five-day irrigation outlook when daily forecast data is available.
- Root-zone moisture/depletion estimate and days of water left.
- Optional manual soil-moisture reading.
- Irrigation checklist: full/partial watering, pump minutes, undo, and saved litres.
- Weather-based disease-risk advisory and inspection guidance.
- Rice leaf-photo disease check using an on-device ONNX model.
- Curated management steps for supported rice disease findings.
- Today's reminders and a simple water-saving history.
- Deterministic Today briefing with text and a speak button.

### Farm management

- Create, edit, select, and delete multiple farms.
- GPS location and India place-name search fallback.
- Reverse-geocoded place information.
- Soil suggestion, measured SoilGrids profile, and terrain/slope estimate.
- Crop, variety/stage, field area, soil type, irrigation method, and water-quality inputs.

### Fertilizer advisor

- Official West Bengal soil-test-based tables.
- Supported tables: Rice, Wheat, Maize, Cotton, Potato, and Groundnut.
- Rice season and Potato variety choices where the source table requires them.
- Five West Bengal soil zones.
- Simple Low/Medium/High fertility mode.
- N/P/K Soil Health Card mode with optional pH, EC, organic carbon, sulphur,
  and micronutrients.
- NPK dose, manure, amendments, sulphur, micronutrients, split timing, remarks,
  source, and disclaimer.
- Saved readings and fertilizer selections are reused later.

### Language, voice, and offline use

- English, Hindi, Bengali, Assamese, and Urdu UI translations.
- Per-card speech and a full Today briefing.
- Voice order: cached cloud audio → cloud TTS → device speech.
- Assamese currently uses the device voice path.
- IndexedDB stores farms, recommendations, history, weather cache, reminders,
  water ledger, depletion state, settings, and TTS audio cache.
- Vite PWA service worker supports installation and cached app assets.

### Reminders

- Generated irrigation reminders.
- Custom farmer-selected reminder times.
- Browser notification permission and delivery while the app is open.

## 5. How the code is organised

```text
frontend/  React + Vite + TypeScript PWA
  src/pages/       screens
  src/components/  reusable UI
  src/services/    decision logic, weather, disease, fertilizer, speech
  src/storage/     IndexedDB and repositories
  src/types/       shared data models
backend/   Express + TypeScript provider API
docs/      product and engineering notes
```

Normal data flow is:

```text
UI → useAppStore → services → storage/API
```

Business rules stay in services. Components display data and handle taps. The
decision engine is deterministic and does not depend on React or browser APIs.

## 6. Backend API

- `GET /health` — health check.
- `GET /api/weather?lat=&lon=` — weather and daily forecast.
- `GET /api/location?lat=&lon=` — reverse geocoding and soil suggestion.
- `GET /api/location/search?q=` — India-only place search.
- `GET /api/soil?lat=&lon=` — soil properties with fallback metadata.
- `GET /api/terrain?lat=&lon=` — elevation and approximate slope.
- `POST /api/tts` — cloud speech audio for supported locales.

The backend is stateless. Farmer data stays locally in the browser. Production
configuration uses `VITE_API_BASE_URL` and `CORS_ORIGIN`. Optional TTS keys are
kept only in backend environment variables.

## 7. Verification completed on 22 October 2026

These checks passed on the current uncommitted code:

- `npm run verify` — typecheck, lint, and tests passed.
- Frontend: **24 test files, 491 tests passed**.
- Backend: **5 test files, 107 tests passed**.
- `npm run build` — frontend and backend built successfully.
- Local smoke check: frontend returned HTTP 200 at `http://localhost:5173`.
- Local smoke check: backend `/health` returned `status: "ok"` at `http://localhost:3001`.
- Browser smoke check: the IrrigaSmart onboarding screen loaded successfully.

The build has a warning about a large JavaScript/ONNX chunk. It is not a build
failure, but it is worth improving before production.

## 8. Known limits and risks

- The fertilizer data is regional: West Bengal only.
- The fertilizer page covers 6 of the 10 crop choices.
- The photo model is currently offered for Rice only.
- Weather, geocoding, SoilGrids, terrain, and TTS depend on external providers.
- The backend has no user authentication or rate limiting yet.
- Farm-to-soil matching still uses soil type plus coordinate matching; a real
  `soilId` foreign key would be safer for multiple farms with the same soil type.
- The fertilizer selection auto-save effect depends on the whole `store` object;
  this should be regression-tested because it may repeat saves/renders.
- There are strong unit tests, but no full browser end-to-end test yet.
- TTS is a convenience layer, not the core product; the app must always keep its
  device-voice fallback.
- `README.md` still references a missing `DEPLOYMENT.md` and should be cleaned up.

The removed chatbot is intentional. The current voice briefing is deterministic:
it speaks the same facts that the dashboard shows, so it cannot invent advice or
disagree with the decision engine.

## 9. **TOP 5 NEXT MOVES**

> **Do these in this order before adding many more features.**

1. **Fix correctness risks.** Add a regression test for fertilizer auto-save and
   migrate farms to store a direct `soilId`.
2. **Create a dependable demo deployment.** Deploy frontend/backend, configure
   CORS and API URL, seed one demo farm, and rehearse an offline demo.
3. **Add real workflow tests.** Cover onboarding, farm creation, recommendation,
   fertilizer persistence, cached weather, and photo-model failure/retry.
4. **Protect the backend.** Add rate limits, timeouts, structured errors, provider
   caching, and a simple demo authentication boundary before public launch.
5. **Validate the product with farmers.** Measure whether users understand the
   recommendation, trust the litres/minutes guidance, and actually save water.
   Use this evidence to choose the next feature: more crops, sync, or hardware.

## 10. How to continue safely

```bash
npm install
npm run dev       # frontend: 5173, backend: 3001
npm run verify
npm run build
```

Before changing code, read:

- `docs/09_AI_Implementation_Guide.md`
- `docs/06_Development_Roadmap.md`
- `docs/07_Engineering_Rules.md`

Do not commit `.env` files or API keys. Review `git diff` and `git status` before
staging anything. Commit the current work in small logical groups rather than one
large unclear commit.
