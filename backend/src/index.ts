import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { fetchLocationInfo, LocationProviderError } from './location.js';
import { fetchWeather, WeatherProviderError } from './weather.js';

/**
 * Backend API (docs/01_System_Architecture.md, docs/04_System_Interfaces.md).
 *
 * Responsibilities: weather retrieval (Interface 5), reverse geocoding and soil
 * lookup for Smart Farm Location (docs/12_Product_Roadmap_v2.md Feature 1),
 * plus future synchronization and shared datasets. Persistent farmer/farm data
 * lives client-side in IndexedDB for the offline-first MVP
 * (docs/03_Data_Models.md), so the backend only exposes stateless provider
 * proxies and a health check.
 */

const app = express();

/**
 * CORS allowlist.
 *
 * In production the API must only be callable from the deployed frontend, so the
 * allowed origin(s) come from the CORS_ORIGIN environment variable
 * (comma-separated). When unset — i.e. local development — we fall back to the
 * Vite dev server origin so `npm run dev` works without extra configuration.
 * Requests without an Origin header (curl, health checks, same-origin) are always
 * allowed.
 */
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
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
app.use(express.json());

const nowIso = (): string => new Date().toISOString();

// Response shape follows docs/04_System_Interfaces.md: status, data, timestamp.
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    data: { service: 'irrigasmart-backend', version: '0.1.0' },
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

const PORT = Number(process.env.PORT ?? 3001);

app.listen(PORT, () => {
  // Development-only startup log.
  console.log(`IrrigaSmart backend listening on http://localhost:${PORT}`);
});
