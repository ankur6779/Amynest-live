/**
 * Onboarding completion E2E smoke — Sign Up → Login → Finish Setup → Dashboard.
 *
 * Requires credentials (skipped in CI without secrets):
 *   E2E_ONBOARDING_EMAIL / E2E_ONBOARDING_PASSWORD
 *   or STRESS_TEST_EMAIL / STRESS_TEST_PASSWORD
 *
 * Run:
 *   pnpm --filter @workspace/kidschedule run test:e2e:onboarding
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_ONBOARDING_PORT ?? "5190");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "onboarding-smoke.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/pricing`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
