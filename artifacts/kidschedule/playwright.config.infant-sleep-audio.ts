import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5192");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: /infant-sleep-audio-audit\.spec\.ts/,
  timeout: 240_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "playwright/infant-sleep-audio-audit-results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on",
    screenshot: "on",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 14"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} VITE_APP_API_ORIGIN=http://127.0.0.1:${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-infant-sleep-audio.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
