import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_ROOMS_PORT ?? "5198");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: ["rooms-living.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"], ["json", { outputFile: "playwright/rooms-living-artifacts/report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    viewport: { width: 360, height: 740 },
  },
  projects: [
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 12"], viewport: { width: 360, height: 740 } },
    },
  ],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-rooms-living.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
