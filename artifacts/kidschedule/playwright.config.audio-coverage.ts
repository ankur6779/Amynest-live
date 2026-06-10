import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in";

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: /audio-coverage\.spec\.ts/,
  timeout: 300_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["json", { outputFile: "playwright/audio-coverage-artifacts/playwright-report.json" }]],
  outputDir: "playwright/audio-coverage-artifacts/test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ...devices["Pixel 5"],
  },
});
