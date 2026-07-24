import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_HEALTH_LAB_PORT ?? "5195");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: ["health-lab-rc2*.spec.ts"],
  fullyParallel: false,
  timeout: 25 * 60 * 1000,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-health-lab.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
