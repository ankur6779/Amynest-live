import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../../audit/final-cert",
  testMatch: /dev-route-redirect\.spec\.ts/,
  timeout: 120_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in",
    screenshot: "on",
    ...devices["Pixel 5"],
  },
  outputDir: "../../audit/screenshots/final-cert/test-results",
});
