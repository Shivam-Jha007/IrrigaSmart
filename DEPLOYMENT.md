# Deploying IrrigaSmart

This guide deploys the **frontend to Vercel** (a CDN, ideal for the offline-first PWA)
and the **backend to Render**. Farmer/farm data lives in the browser (IndexedDB), so
the backend is stateless — it only proxies weather from Open-Meteo (no API key needed).

## Security model — what's protected

- **No secrets.** Open-Meteo is keyless, so there is nothing to leak. Never put secrets
  in `VITE_`-prefixed vars — those are baked into the public browser bundle.
- **Locked-down API.** The backend only accepts cross-origin requests from the origin(s)
  in the `CORS_ORIGIN` env var. Any other site calling the API is rejected.
- **Config lives in the host, not the repo.** Real `.env` files are gitignored; only the
  documented `*.env.example` templates are committed. Set actual values in the Render and
  Vercel dashboards.

## Environment variables

| Where    | Variable            | Value                                             |
|----------|---------------------|---------------------------------------------------|
| Render   | `CORS_ORIGIN`       | Your Vercel URL, e.g. `https://irrigasmart.vercel.app` |
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
