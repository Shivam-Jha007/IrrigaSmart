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
      includeAssets: ['favicon.svg'],
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
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
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
