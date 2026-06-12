import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in";

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: /phonics-cert\.spec\.ts/,
  timeout: 600_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  outputDir: "playwright/audio-coverage-artifacts/test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 5"],
  },
});
