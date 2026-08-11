import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Offline-first is a core requirement (see docs/01_System_Architecture.md).
// The service worker precaches the app shell so IrrigaSmart opens without a network.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enable the PWA in `vite dev` so offline behavior can be verified during development.
      devOptions: { enabled: true },
      // Precached alongside the app shell: the tab icon, the iOS home-screen
      // icon (which Safari reads from the <link>, not the manifest), and the
      // in-app brand mark rendered in the header and on onboarding.
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'logo.png'],
      workbox: {
        // The photo leaf check (V1.7 item 16) ships two large binaries: the
        // ONNX Runtime WASM build (~13.5 MB) and the MobileNetV3 model
        // (~6.2 MB). Both are deliberately kept OUT of the precache and served
        // by the runtime caches below instead.
        //
        // The reasoning, because it is not the obvious choice for an
        // offline-first app: Workbox's precache is all-or-nothing and blocks
        // service-worker installation. Precaching ~20 MB would mean a farmer on
        // a slow rural connection cannot complete the install, and until it
        // completes the app has NO offline capability at all — they would lose
        // the irrigation advice, which is the core product, in exchange for an
        // advisory photo feature they may never open. Seven of the ten
        // supported crops cannot use the model at all.
        //
        // Runtime CacheFirst gets the same end state by a safer route: the
        // shell stays ~500 kB and installs anywhere, and the first photo check
        // — which the UI warns about before the farmer taps — downloads the
        // runtime and the model once and keeps them forever. From the second
        // check on it is fully offline, which is what "on-device" was chosen
        // for.
        globIgnores: ['**/ort-wasm*.wasm'],
        runtimeCaching: [
          {
            // Hashed filename, so a new build produces a new URL and the old
            // entry ages out via maxEntries rather than being served stale.
            urlPattern: ({ url }) => /\/assets\/ort-wasm.*\.wasm$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'onnx-runtime',
              expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // NOTE: these URLs are NOT content-hashed — they are static files
            // under public/. A retrained model must therefore ship under a new
            // filename (and a matching PLANT_DISEASE_MODEL spec), or phones
            // that already cached the old one will never see it.
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'disease-model',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'IrrigaSmart',
        short_name: 'IrrigaSmart',
        description: 'Offline-first smart irrigation decision support for farmers',
        theme_color: '#16814c',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            // A separate, more generously padded render. Android crops maskable
            // icons to whatever shape the launcher uses, so the mark has to sit
            // inside the 80% safe zone — reusing the tightly framed icon above
            // would clip the leaf and the wifi arc.
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Bind the dual-stack wildcard so the dev server answers on BOTH 127.0.0.1
    // and ::1 — Node's default 'localhost' resolution can bind only ::1 on
    // Windows, which makes the app unreachable for browsers that resolve
    // localhost to IPv4. Also enables LAN access for testing on a phone.
    host: '::',
  },
});
