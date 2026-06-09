import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5193");
const API_PORT = Number(process.env.PLAYWRIGHT_API_PORT ?? "5010");
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: /gcs-lullaby-production-audit\.spec\.ts/,
  timeout: 300_000,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["json", { outputFile: "playwright/gcs-lullaby-prod-audit-results.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "on",
    screenshot: "on",
    video: "off",
  },
  projects: [
    {
      name: "android-chrome",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "iphone-safari",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: [
    {
      command: `AUDIT_API_PORT=${API_PORT} RHYMES_SIGNED_URL_TTL_MS=8000 RHYMES_SIGNED_URL_CACHE_TTL_MS=3000 node ../../scripts/gcs-lullaby-audit-api.mjs`,
      url: `${API_ORIGIN}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `PORT=${WEB_PORT} VITE_APP_API_ORIGIN=${API_ORIGIN} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${WEB_PORT} --host 127.0.0.1 --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}/playwright-infant-sleep-audio.html`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
