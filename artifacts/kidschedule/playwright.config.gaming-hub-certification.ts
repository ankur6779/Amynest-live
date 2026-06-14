import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_GH_CERT_PORT ?? "3000");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "gaming-hub-certification.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"], ["json", { outputFile: "certification/output/playwright-report.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-gaming-hub-certification.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
