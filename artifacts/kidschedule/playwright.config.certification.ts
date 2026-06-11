/**
 * Math Playground production certification — all feature flags enabled.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_CERT_PORT ?? "5191");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "math-playground-certification.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  reporter: [["list"], ["json", { outputFile: "playwright/certification-artifacts/report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `VITE_MP_MINI_GAMES=1 VITE_MP_PHASE6=1 VITE_MP_VOICE_MODE=1 VITE_MP_INTELLIGENCE=1 PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-certification.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
