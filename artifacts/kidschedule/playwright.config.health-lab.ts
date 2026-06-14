import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_HEALTH_LAB_PORT ?? "5195");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: ["health-lab-certification*.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: [["list"], ["json", { outputFile: "playwright/health-lab-artifacts/report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-health-lab.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
