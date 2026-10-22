import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { fetchLocationInfo, LocationProviderError, searchPlaces } from './location.js';
import { fetchSoilProperties, SoilProviderError } from './soil.js';
import { TtsProviderError, TTS_MAX_TEXT_LENGTH } from './tts.js';
import { createCachedSynthesizer } from './ttsCache.js';
import { fetchTerrain, TerrainProviderError } from './terrain.js';
import { fetchWeather, WeatherProviderError } from './weather.js';

/**
 * Backend API (docs/01_System_Architecture.md, docs/04_System_Interfaces.md).
 *
 * Responsibilities: weather retrieval (Interface 5), reverse geocoding and soil
 * lookup for Smart Farm Location (docs/12_Product_Roadmap_v2.md Feature 1),
 * terrain slope (Interface 7), plus future synchronization and shared datasets.
 *
 * The three site lookups — location, soil and terrain — are all fetched once per
 * farm and then stored on the device, so none of them is on any path a farmer
 * waits on twice, and none of them is needed again offline. Persistent farm data
 * lives client-side in IndexedDB for the offline-first MVP
 * (docs/03_Data_Models.md), so the backend only exposes stateless provider
 * proxies and a health check.
 *
 * The farmer assistant route (Interface 8) was removed in V2.3: the chatbot it
 * served was replaced by the deterministic audio briefing, which is built and
 * spoken entirely on the device. No LLM key is read, held or proxied here
 * anymore.
 *
 * The optional keys this backend holds today are SARVAM_API_KEY and
 * GEMINI_API_KEY (V2.4): the key-backed fallback providers behind the
 * keyless Edge TTS tier. Edge serves en/hi/bn/ur with no key at all; the
 * keys only decide which providers backstop Edge when it fails, so with
 * neither key the app still speaks with cloud voices for those languages
 * and the device's voices elsewhere. Nothing depends on any key.
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
 * POST /api/tts — { text, locale } → audio bytes (MP3 from Edge, WAV from the rest)
 *
 * Cloud TTS synthesis for the audio briefing and card speakers (V2.4):
 * Edge Read Aloud (Azure Neural, keyless) first for en/hi/bn/ur, Sarvam
 * Bulbul v3 second, Gemini third (and Urdu's key-backed backup). The success
 * body is raw audio, not the JSON envelope — wrapping base64 audio in JSON
 * would inflate the payload by a third and buy nothing. The Content-Type is
 * per provider (audio/mpeg or audio/wav) and an X-Tts-Provider header names
 * who answered, for demo-day debugging with curl. Errors keep the standard
 * error envelope so the frontend's central ApiError handling classifies them
 * exactly like every other route's.
 *
 * Only the languages a cloud provider actually speaks are offered; Assamese
 * never reaches this route — the frontend's own table keeps it on the
 * on-device path — and a request for any other locale answers 503, which the
 * frontend treats identically to any other cloud failure: fall back to the
 * device's voices. Edge needs no key, so even a fully keyless deployment
 * serves cloud voices for those languages; the route never 5xx-crashes a
 * demo — the farmer still hears the briefing.
 */
/**
 * The route's synthesiser: provider selection plus an in-process LRU cache
 * of successful syntheses (ttsCache.ts). Briefing text is deterministic, so
 * the same text+locale recurs across reloads, devices and demo runs — and a
 * repeat now answers from memory instead of paying the ~2s WebSocket
 * handshake + synthesis round trip again. Failures are never cached, so
 * provider recovery is noticed on the very next request.
 */
const synthesizeCached = createCachedSynthesizer();

app.post('/api/tts', (req: Request, res: Response) => {
  const keys = {
    sarvam: process.env.SARVAM_API_KEY?.trim() || undefined,
    gemini: process.env.GEMINI_API_KEY?.trim() || undefined,
  };
  const { text, locale } = (req.body ?? {}) as { text?: unknown; locale?: unknown };

  if (typeof text !== 'string' || !text.trim() || typeof locale !== 'string' || !locale.trim()) {
    res.status(400).json({
      status: 'error',
      errorCode: 'INVALID_INPUT',
      message: 'Both text and locale are required.',
      timestamp: nowIso(),
    });
    return;
  }
  if (text.length > TTS_MAX_TEXT_LENGTH) {
    res.status(400).json({
      status: 'error',
      errorCode: 'INVALID_INPUT',
      message: `text must be at most ${TTS_MAX_TEXT_LENGTH} characters.`,
      timestamp: nowIso(),
    });
    return;
  }

  void (async () => {
    try {
      const result = await synthesizeCached(text, locale, keys);
      res.set('Content-Type', result.format === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      res.set('X-Tts-Provider', result.provider);
      res.set('X-Tts-Cache', result.cacheHit ? 'hit' : 'miss');
      res.send(result.audio);
    } catch (error) {
      const status = error instanceof TtsProviderError ? error.status : 500;
      const message = error instanceof Error ? error.message : 'unexpected error';
      // 400 is the client's fault (and already impossible after the checks
      // above); everything else is "cloud unavailable, speak locally".
      res.status(status === 400 ? 400 : 503).json({
        status: 'error',
        errorCode: status === 400 ? 'INVALID_INPUT' : 'TTS_UNAVAILABLE',
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
