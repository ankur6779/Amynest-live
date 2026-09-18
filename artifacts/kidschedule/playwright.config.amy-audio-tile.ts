/**
 * Playwright: Amy Audio first-class module tile.
 *
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.amy-audio-tile.ts
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5192");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "amy-audio-module-tile.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
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
    url: `http://127.0.0.1:${PORT}/playwright-amy-audio-module-tile.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
