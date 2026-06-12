import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "blocker-investigation.spec.ts",
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "https://www.amynest.in",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Pixel 5"],
  },
});
