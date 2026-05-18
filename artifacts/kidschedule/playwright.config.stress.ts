import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5190");

/** Canonical production host for stress runs (matches app redirect). */
function normalizeStressBaseUrl(raw: string | undefined): string {
  const trimmed = raw?.replace(/\/$/, "");
  if (!trimmed) return `http://127.0.0.1:${PORT}`;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "amynest.in") u.hostname = "www.amynest.in";
    return u.origin;
  } catch {
    return trimmed;
  }
}

const BASE_URL = normalizeStressBaseUrl(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "app-stress.spec.ts",
  timeout: 600_000,
  expect: { timeout: 30_000 },
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-stress" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    ...devices["Pixel 5"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `PORT=${PORT} BASE_PATH=/ pnpm run dev -- --port ${PORT} --host 127.0.0.1 --strictPort`,
        url: `http://127.0.0.1:${PORT}/sign-in`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
