/**
 * Playwright config for Math Playground mini-game e2e.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_MP_PORT ?? "5189");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "math-playground-mini-games.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `VITE_MP_MINI_GAMES=1 PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-math-playground.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
