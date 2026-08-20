# Deploying IrrigaSmart

This guide deploys the **frontend to Vercel** (a CDN, ideal for the offline-first PWA)
and the **backend to Render**. Farmer/farm data lives in the browser (IndexedDB), so
the backend is stateless — it proxies weather, soil, terrain and geocoding from keyless
public providers, and hosts the farmer assistant (the one route that needs a secret).

## Security model — what's protected

- **At most one secret, backend-only.** The data providers are all keyless. The one
  optional secret is a farmer-assistant provider key — either `ANTHROPIC_API_KEY` or
  `GEMINI_API_KEY` — and it lives on Render only. Never put secrets in `VITE_`-prefixed
  vars — those are baked into the public browser bundle.
- **Locked-down API.** The backend only accepts cross-origin requests from the origin(s)
  in the `CORS_ORIGIN` env var. Any other site calling the API is rejected.
- **Config lives in the host, not the repo.** Real `.env` files are gitignored; only the
  documented `*.env.example` templates are committed. Set actual values in the Render and
  Vercel dashboards.

## Environment variables

| Where    | Variable            | Value                                             |
|----------|---------------------|---------------------------------------------------|
| Render   | `CORS_ORIGIN`       | Your Vercel URL, e.g. `https://irrigasmart.vercel.app` |
| Render   | `ANTHROPIC_API_KEY` | Your Anthropic key — **optional**, enables the assistant (Step 3b) |
| Render   | `GEMINI_API_KEY`    | Your Gemini key — **optional**, free-tier alternative to Anthropic (Step 3b). If both are set, `ANTHROPIC_API_KEY` wins. |
| Render   | `GEMINI_MODEL`      | **Optional**, and normally left unset. Overrides the Gemini model id (default `gemini-flash-lite-latest`). Only read when `GEMINI_API_KEY` is the active key. |
| Render   | `NODE_VERSION`      | `20` (already set by `render.yaml`)               |
| Render   | `PORT`              | *Do not set* — Render injects it automatically    |
| Vercel   | `VITE_API_BASE_URL` | Your Render URL, e.g. `https://irrigasmart-backend.onrender.com` |


The two URLs reference each other, so deploy in the order below (backend → frontend →
set CORS → redeploy).

---

## Step 0 — Push to GitHub (prerequisite)

```bash
git add -A
git commit -m "Add deployment config (Render + Vercel)"
git push
```

If you haven't created the GitHub repo yet, see the README / do it via
`gh repo create IrrigaSmart --public --source=. --remote=origin --push`.

## Step 1 — Deploy the backend on Render

1. Go to https://dashboard.render.com → **New +** → **Blueprint**.
2. Connect your GitHub and select the **IrrigaSmart** repo. Render detects
   [`render.yaml`](./render.yaml) and proposes the `irrigasmart-backend` web service.
3. Click **Apply**. Leave `CORS_ORIGIN` blank for now (you'll fill it in Step 3).
4. Wait for the deploy to finish, then copy the service URL
   (e.g. `https://irrigasmart-backend.onrender.com`).
5. **Verify:** open `https://<your-backend>/health` — you should see
   `{"status":"ok", ...}`.

> Free-tier note: Render spins the service down after inactivity, so the first request
> after idle can take ~30–60s to wake. Because IrrigaSmart caches weather and works
> offline, a cold start just means the first recommendation uses cached data until the
> API wakes.

## Step 2 — Deploy the frontend on Vercel

1. Go to https://vercel.com → **Add New… → Project** → import the **IrrigaSmart** repo.
2. **Important — Root Directory:** click **Edit** and set it to **`frontend`**.
   Vercel auto-detects Vite (build `vite build`, output `dist`).
3. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = your Render URL from Step 1 (no trailing slash).
4. Click **Deploy**. When it finishes, copy the frontend URL
   (e.g. `https://irrigasmart.vercel.app`).

## Step 3 — Point CORS at the frontend, then redeploy the backend

1. Back in Render → your service → **Environment** → add/edit:
   - `CORS_ORIGIN` = your Vercel URL from Step 2 (exact origin, no trailing slash,
     e.g. `https://irrigasmart.vercel.app`).
2. Save — Render redeploys automatically.

> Add every origin you use, comma-separated. If you also open the Vercel **preview**
> deployments, add those too, e.g.
> `CORS_ORIGIN=https://irrigasmart.vercel.app,https://irrigasmart-git-main-you.vercel.app`.

## Step 3b — Enable the farmer assistant (optional)

The assistant answers free-text questions that the on-device rules cannot. It needs a
model provider key, which is why it is the one part of the app that is off by default.
Two providers are supported — pick one:

**Option A — Google Gemini (free tier, no billing account required):**
1. Get a key from https://aistudio.google.com/apikey (sign in with a Google account).
2. Render → your service → **Environment** → add `GEMINI_API_KEY` = your key.
3. Save — Render redeploys automatically.

**Option B — Anthropic (Claude, paid):**
1. Get a key from https://console.anthropic.com → **API Keys**.
2. Render → your service → **Environment** → add `ANTHROPIC_API_KEY` = your key.
3. Save — Render redeploys automatically.

Set only one of the two keys — if both are present, `ANTHROPIC_API_KEY` takes priority
and the Gemini key is ignored.

*Optional:* `GEMINI_MODEL` overrides which Gemini model is called (default
`gemini-flash-lite-latest`). Leave it unset unless you have a reason — nothing validates
the id, so a model name the API does not recognise makes every assistant call fail, and
the app falls back to its on-device rules exactly as if no key were set. That is safe,
but the reason will not be obvious from the app.

**Verify:** `https://<your-backend>/health` should now report `"assistant":"configured"`.
While neither key is set it reports `"disabled"`.

> **Skipping this is a supported configuration, not a broken one.** With no key,
> `POST /api/assistant` answers `503 ASSISTANT_DISABLED` and the app falls back to its
> on-device rules, so the farmer still gets every figure the engine computed. What they
> lose is the free-text questions the rules do not cover — and for those the panel says
> *"I cannot answer that one without internet"*, because from the browser's side an
> unavailable model is indistinguishable from being offline.
>
> **Gemini's free tier is rate-limited** (roughly 15 requests/minute, 1,000/day on
> `gemini-flash-lite-latest` as of writing) — fine for personal use and testing, but
> Google may throttle harder before an upgrade if traffic grows. Rate-limit and
> authentication failures both fall back the same way as a missing key: to the
> on-device rules, never to a broken UI.


## Step 4 — Verify the live app

1. Open your Vercel URL on a phone or desktop.
2. Go to **Farms → Add farm**, enter a real location, save.
3. On **Today**, confirm you get a live recommendation.
4. Open the browser console — there should be **no CORS errors**.
5. **Offline check:** with the tab open, turn off Wi-Fi and reload — the app shell should
   still render and show the last cached recommendation (PWA + IndexedDB).
6. **Install (optional):** Chrome → "Install app" / iOS Safari → Share → "Add to Home
   Screen" to run it full-screen like a native app.

## Troubleshooting

- **CORS error in console** → `CORS_ORIGIN` on Render doesn't exactly match the Vercel
  origin (check for `https://`, no trailing slash, correct subdomain), or the backend
  hasn't finished redeploying.
- **Recommendation never loads live weather** → confirm `VITE_API_BASE_URL` is set on
  Vercel and you redeployed after adding it (Vite bakes env vars at build time). Test
  `https://<backend>/api/weather?lat=23.6&lon=87.7` directly.
- **404 on refresh** → ensure `frontend/vercel.json` (SPA rewrite) is deployed.
- **The assistant always says it needs internet** → check `/health`. If it reports
  `"assistant":"disabled"`, `ANTHROPIC_API_KEY` is not set on Render (Step 3b). The
  message is the same whether the device is offline or the model is unreachable, so the
  health check — not the panel — is what tells the two apart.

### Live weather stopped working

The app shows *"No weather data available yet"* (or keeps using cached weather) and
`https://<backend>/api/weather?lat=23.6&lon=87.7` returns
`WEATHER_UNAVAILABLE: weather provider returned 429: <reason>`.

**Open-Meteo's free tier is rate-limited per IP, and it is the IP that matters, not your
traffic.** Render's free tier puts many services behind a shared egress IP, so the quota
can be exhausted by other tenants entirely. The provider's own reason (appended to the
message above and logged by the backend) is what tells you which case you are in:

| Reason mentions | What it means | What to do |
|---|---|---|
| *minutely* | A short burst hit the per-minute cap | Clears within a minute; nothing to fix |
| *hourly* / *daily* | The quota for that IP is spent | Not fixable from your side while the IP is shared — see the options below |

Because the failure is per-IP rather than per-account, redeploying does not help. The
durable fixes, in rough order of effort:

1. **Move the backend off the shared IP** — a paid Render instance, or any host where the
   egress IP is yours.
2. **Use an Open-Meteo API key** (`customer-api.open-meteo.com`), which meters by account
   instead of by IP.
3. **Fetch weather in the browser instead of via the backend.** Open-Meteo is keyless and
   CORS-enabled, so each farmer's device would spend its own quota. This is the most
   robust option for real users, but it moves network access out of the backend and so
   departs from the "all provider calls are centralized" rule in
   `docs/07_Engineering_Rules.md` — a deliberate architectural change, not a config
   tweak.

Meanwhile the app degrades as designed: any device that has fetched weather at least once
keeps giving advice from its cache. A device that never has shows the *"no weather data"*
note and a **Low confidence** badge, which is the honest reading — and it is also why a
question like *"How dry is my soil?"* cannot be answered from the on-device rules: the
soil-water balance those rules quote is computed from weather that never arrived.

