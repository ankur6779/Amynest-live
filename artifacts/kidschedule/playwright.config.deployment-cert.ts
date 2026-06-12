import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: /deployment-cert-infant\.spec\.ts/,
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ?? "https://www.amynest.in",
    ...devices["Pixel 5"],
  },
});
