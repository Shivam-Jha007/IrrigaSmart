import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { askAssistant, assistantConfigured, AssistantError, parseRequest } from './assistant.js';
import { fetchLocationInfo, LocationProviderError, searchPlaces } from './location.js';
import { fetchSoilProperties, SoilProviderError } from './soil.js';
import { fetchTerrain, TerrainProviderError } from './terrain.js';
import { fetchWeather, WeatherProviderError } from './weather.js';

/**
 * Backend API (docs/01_System_Architecture.md, docs/04_System_Interfaces.md).
 *
 * Responsibilities: weather retrieval (Interface 5), reverse geocoding and soil
 * lookup for Smart Farm Location (docs/12_Product_Roadmap_v2.md Feature 1),
 * terrain slope (Interface 7), the farmer assistant (Interface 8), plus future
 * synchronization and shared datasets.
 *
 * The three site lookups — location, soil and terrain — are all fetched once per
 * farm and then stored on the device, so none of them is on any path a farmer
 * waits on twice, and none of them is needed again offline. Persistent farm data
 * lives client-side in IndexedDB for the offline-first MVP
 * (docs/03_Data_Models.md), so the backend only exposes stateless provider
 * proxies, the assistant, and a health check.
 *
 * The assistant is the one route that is not a provider proxy. It exists here
 * rather than in the browser for exactly one reason: ANTHROPIC_API_KEY must
 * never be shipped in a bundle. See assistant.ts.
 */

const app = express();

/**
 * CORS allowlist.
 *
 * In production the API must only be callable from the deployed frontend, so the
 * allowed origin(s) come from the CORS_ORIGIN environment variable
 * (comma-separated). When unset OR blank — i.e. local development — we fall back
 * to the Vite dev server origin so `npm run dev` works without extra
 * configuration. Requests without an Origin header (curl, health checks,
 * same-origin) are always allowed.
 *
 * `?.trim()` then a length check, not `??`: an `.env` file with a present but
 * empty `CORS_ORIGIN=` line (a normal thing to leave in a template) loads as
 * `""`, and `"" ?? fallback` returns `""` — not the fallback, since `??` only
 * triggers on null/undefined. Treating blank the same as unset is what keeps a
 * harmless empty line in `.env` from silently emptying the allowlist and
 * locking every browser out of the API with no visible server-side error.
 */
const rawCorsOrigin = process.env.CORS_ORIGIN?.trim();
const allowedOrigins = (rawCorsOrigin ? rawCorsOrigin : 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no Origin (curl, health checks, same-origin) and any
      // origin on the allowlist. Disallowed origins are rejected by omitting the
      // CORS headers (callback(null, false)) rather than throwing — the browser
      // blocks the response as usual, and we never leak an error/stack trace.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  }),
);
app.use(express.json({ limit: '32kb' }));

const nowIso = (): string => new Date().toISOString();

// Response shape follows docs/04_System_Interfaces.md: status, data, timestamp.
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    data: {
      service: 'irrigasmart-backend',
      version: '0.1.0',
      // Whether the assistant has a key, so a deployment can be checked without
      // sending a question — and without ever revealing the key itself.
      assistant: assistantConfigured() ? 'configured' : 'disabled',
    },
    timestamp: nowIso(),
  });
});

/**
 * GET /api/weather?lat={lat}&lon={lon}
 *
 * Current weather + today's rainfall forecast for a coordinate
 * (docs/04_System_Interfaces.md Weather resource). The frontend caches the
 * result for offline use (Phase 4 offline fallback); the backend itself is
 * stateless.
 */
app.get('/api/weather', (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  void (async () => {
    try {
      const weather = await fetchWeather(lat, lon);
      res.json({ status: 'ok', data: weather, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof WeatherProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      res.status(status).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'WEATHER_UNAVAILABLE',
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

/**
 * GET /api/location?lat={lat}&lon={lon}
 *
 * Reverse geocoding + soil suggestion for Smart Farm Location
 * (docs/12_Product_Roadmap_v2.md Feature 1). Returns village/district/state and
 * a best-effort suggested soil type that the farmer must always confirm.
 */
app.get('/api/location', (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  void (async () => {
    try {
      const location = await fetchLocationInfo(lat, lon);
      res.json({ status: 'ok', data: location, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof LocationProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      res.status(status).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'LOCATION_UNAVAILABLE',
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

/**
 * GET /api/location/search?q={name}
 *
 * Forward geocoding fallback (roadmap Feature 1): find a village/city by name
 * when GPS is unavailable or inaccurate. India-only results.
 */
app.get('/api/location/search', (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';

  void (async () => {
    try {
      const results = await searchPlaces(q);
      res.json({ status: 'ok', data: results, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof LocationProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      res.status(status).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'LOCATION_UNAVAILABLE',
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

/**
 * GET /api/soil?lat={lat}&lon={lon}
 *
 * Measured soil hydraulic properties by depth (docs/04_System_Interfaces.md
 * Interface 6). The frontend weights these over the crop's own root zone and
 * stores them on the farm's Soil record, so this is fetched once per farm.
 *
 * Never 5xx on a provider failure: the payload carries `source: 'table'` and a
 * `fallbackReason`, and the frontend falls back to the Knowledge Base table. A
 * farm must remain creatable when SoilGrids is down.
 */
app.get('/api/soil', (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  void (async () => {
    try {
      const soil = await fetchSoilProperties(lat, lon);
      res.json({ status: 'ok', data: soil, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof SoilProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      res.status(status).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'SOIL_UNAVAILABLE',
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

/**
 * GET /api/terrain?lat={lat}&lon={lon}
 *
 * Approximate terrain slope from a ~90 m DEM (docs/04_System_Interfaces.md
 * Interface 7). Fetched once per farm at creation and stored on the Farm
 * record, so it costs nothing offline and never repeats.
 *
 * Never 5xx on a provider failure: the payload carries `source: 'unavailable'`
 * and a `fallbackReason`, and the frontend simply omits the terrain record —
 * which is what every farm created before this route existed already does.
 */
app.get('/api/terrain', (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);

  void (async () => {
    try {
      const terrain = await fetchTerrain(lat, lon);
      res.json({ status: 'ok', data: terrain, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof TerrainProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      res.status(status).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'TERRAIN_UNAVAILABLE',
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

/**
 * POST /api/assistant
 *
 * The farmer assistant (docs/04_System_Interfaces.md Interface 8; item 17).
 *
 * The first POST route and the first that is not a provider proxy. The body
 * carries the farmer's question, the farm's already-computed situation, and the
 * recent conversation; the reply is plain text in the farmer's language.
 *
 * This route is an ENHANCEMENT, never the mechanism. The frontend answers from
 * its own deterministic rules first and only calls this when it is online and
 * the rules fell short, so every failure here — no key (503), rate limit (429),
 * provider down (502) — leaves the farmer with the offline answer they already
 * had. That is why nothing here is a 500 the client is expected to treat as
 * fatal (item 18).
 */
app.post('/api/assistant', (req: Request, res: Response) => {
  void (async () => {
    try {
      const request = parseRequest(req.body);
      const reply = await askAssistant(request);
      res.json({ status: 'ok', data: reply, timestamp: nowIso() });
    } catch (error) {
      const status = error instanceof AssistantError ? error.status : 500;
      const code = error instanceof AssistantError ? error.code : 'ASSISTANT_UNAVAILABLE';
      const message = error instanceof Error ? error.message : 'unexpected error';
      // Log the cause server-side; the farmer sees only the short message, and
      // nothing about the key or the provider ever crosses the wire.
      if (status >= 500) {
        console.error('[IrrigaSmart] assistant request failed', error);
      }
      res.status(status).json({
        status: 'error',
        errorCode: code,
        message,
        timestamp: nowIso(),
      });
    }
  })();
});

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  // Development-only startup log.
  console.log(`IrrigaSmart backend listening on http://localhost:${PORT}`);
});
