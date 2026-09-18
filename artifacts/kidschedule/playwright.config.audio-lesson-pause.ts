/**
 * Playwright config for Audio Lesson Pause → Play resume.
 *
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.audio-lesson-pause.ts
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? "5191");

export default defineConfig({
  testDir: "./playwright/specs",
  testMatch: "audio-lesson-pause-resume.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${PORT} BASE_PATH=/ pnpm exec vite --config vite.config.ts --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}/playwright-audio-lesson-player.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
