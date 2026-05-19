import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in";

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "prod-crash-verify.spec.ts",
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 5"],
  },
});
