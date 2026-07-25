/**
 * Birth Sky RC2 — multi-form-factor smoke (Pack 8 §1.5).
 * Certifies kill switch + route gating on Web / Android proxy / iPhone / iPad viewports.
 * Does not deploy. Does not require Firebase when flag is off.
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_BIRTH_SKY_RC2_PORT ?? "5197");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "birth-sky-rc2*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [
    ["list"],
    ["json", { outputFile: "certification/birth-sky/playwright-rc2-report.json" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "web-chromium", use: { ...devices["Desktop Chrome"] } },
    // Chromium + mobile viewports (form-factor proxies). Avoid WebKit dependency on CI hosts.
    {
      name: "android-webview-proxy",
      use: { ...devices["Pixel 5"], browserName: "chromium", defaultBrowserType: "chromium" },
    },
    {
      name: "ios-iphone-proxy",
      use: { ...devices["iPhone 13"], browserName: "chromium", defaultBrowserType: "chromium" },
    },
    {
      name: "ios-ipad-proxy",
      use: { ...devices["iPad Pro"], browserName: "chromium", defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    // Master flag OFF — kill-switch certification (Pack 8 §1.5 #9)
    command: `VITE_FF_BIRTH_SKY=0 PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
