/**
 * Playwright: Amy Astronomy portrait layout + FAB/nav clearance.
 *
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.amy-astro-portrait.ts
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5194");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "amy-astro-portrait-layout.spec.ts",
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
    url: `http://127.0.0.1:${PORT}/playwright-amy-astro-visual.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
