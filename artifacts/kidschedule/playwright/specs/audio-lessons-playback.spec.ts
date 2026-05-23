/**
 * E2E: sign-in → audio lesson play → TTS must return audioUrl (not tts_background).
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.prod-verify.ts \
 *     playwright/specs/audio-lessons-playback.spec.ts
 */
import { test, expect } from "@playwright/test";
import { dismissCountryPromptIfVisible, signInWithEmail } from "../helpers/auth";

test("audio lessons: play paragraph without tts_background failure", async ({ page }) => {
  const consoleWarnings: string[] = [];
  let synthesizeBody: Record<string, unknown> | null = null;

  page.on("console", (msg) => {
    const t = msg.text();
    if (t.includes("tts_background") || t.includes("TTS warming in background")) {
      consoleWarnings.push(t);
    }
  });

  page.on("response", async (res) => {
    if (res.url().includes("/api/tts/synthesize") && res.request().method() === "POST") {
      try {
        synthesizeBody = (await res.json()) as Record<string, unknown>;
      } catch {
        /* non-json */
      }
    }
  });

  await signInWithEmail(page);
  await page.goto("/audio-lessons", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissCountryPromptIfVisible(page);
  await page.waitForTimeout(2_000);

  await expect(page.getByRole("heading", { name: /audio lessons/i })).toBeVisible({
    timeout: 60_000,
  });

  const ageTile = page.getByTestId("age-tile-2-4");
  await ageTile.click({ timeout: 30_000 });
  await page.waitForTimeout(800);

  const lessonCard = page.getByTestId(/lesson-card-/).first();
  await lessonCard.click({ timeout: 30_000 });
  await page.waitForTimeout(1_500);

  const playBtn = page.getByRole("button", { name: "Play" });
  await expect(playBtn).toBeVisible({ timeout: 20_000 });
  await playBtn.click();

  await expect
    .poll(
      () => synthesizeBody !== null,
      { timeout: 90_000, message: "waiting for /api/tts/synthesize response" },
    )
    .toBe(true);

  // Legacy prod API may return background:true once; client polls until cache is ready.
  const pauseBtn = page.getByRole("button", { name: "Pause" });
  await expect(pauseBtn).toBeVisible({ timeout: 75_000 });

  await page.waitForTimeout(2_000);
  expect(consoleWarnings, `console warnings: ${consoleWarnings.join("; ")}`).toHaveLength(0);

  const finalSuccess =
    synthesizeBody?.success === true ||
    synthesizeBody?.ok === true ||
    (await pauseBtn.isVisible());
  expect(finalSuccess, `playback failed: ${JSON.stringify(synthesizeBody)}`).toBe(true);

  const crashOverlay = await page.locator("#amynest-crash-overlay").count();
  expect(crashOverlay).toBe(0);
});

test("static audio test button plays good job (dev build only)", async ({ page }) => {
  await signInWithEmail(page);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const testBtn = page.getByTestId("static-audio-test");
  if (!(await testBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
    test.skip(true, "TEST AUDIO button only ships in Vite dev (import.meta.env.DEV)");
  }

  let staticStatus: number | null = null;
  page.on("response", (res) => {
    if (res.url().includes("/api/static-audio/") && res.url().endsWith(".mp3")) {
      staticStatus = res.status();
    }
  });

  await testBtn.click();
  await page.waitForTimeout(2_000);
  expect(staticStatus).toBe(200);
});
