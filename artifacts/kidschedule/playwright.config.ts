/**
 * Playwright config for the Abacus PRO Zone gameplay e2e.
 *
 * Boots a Vite dev server with the env vars Vite requires (PORT, BASE_PATH)
 * and points the test runner at the standalone fixture page
 * `/playwright-abacus.html`. The fixture mounts only <AbacusZone /> so
 * the spec exercises the real bead UI + unlock fetch contract without
 * needing Firebase auth or the full app shell.
 *
 * Run locally with:
 *   pnpm --filter @workspace/kidschedule run test:e2e
 *
 * Requires Chromium to be installed first:
 *   pnpm --filter @workspace/kidschedule exec playwright install chromium
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5188");

export default defineConfig({
  testDir: "./playwright/specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-abacus.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
