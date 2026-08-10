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
