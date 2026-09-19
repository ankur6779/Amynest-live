import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_CONTENT_DELIVERY_PORT ?? "5211");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: ["content-delivery-cert.spec.ts"],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  reporter: [
    ["list"],
    ["json", { outputFile: "playwright/content-delivery-artifacts/report.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: "chromium-mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-content-delivery-cert.html`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
