import { defineConfig } from 'vitest/config';

/**
 * Test configuration, kept separate from vite.config.ts on purpose.
 *
 * The build config loads vite-plugin-pwa, which generates a service worker.
 * Tests neither need that nor should pay for it, and Vitest prefers this file
 * over vite.config.ts when both exist.
 *
 * TZ is pinned because the engine derives the local calendar day from an
 * injected ISO timestamp (services/dateUtils.localDayString) and the season from
 * the local month (services/regionalKnowledge.getSeasonForDate). Without a fixed
 * zone the golden snapshots would differ between a developer's machine and CI,
 * which would make them useless as a regression net. Asia/Kolkata is the app's
 * target region, so tests run in the zone the app is actually used in.
 */
export default defineConfig({
  test: {
    environment: 'node',
    env: { TZ: 'Asia/Kolkata' },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
