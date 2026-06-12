import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in";

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "full-app-certification.spec.ts",
  timeout: 600_000,
  retries: 0,
  workers: 1,
  reporter: [["line"], ["json", { outputFile: "playwright/full-app-cert-artifacts/playwright-report.json" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 5"],
  },
});
