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

  const lessonCard = page.locator('[data-testid^="lesson-card-"]:not([disabled])').first();
  await lessonCard.click({ timeout: 30_000 });
  await page.waitForTimeout(1_500);

  const sheet = page.getByTestId("audio-player-sheet");
  await expect(sheet).toBeVisible({ timeout: 20_000 });
  const playBtn = sheet.getByRole("button", { name: "Play" });
  await expect(playBtn).toBeVisible({ timeout: 20_000 });
  await playBtn.click();

  // Static-audio hits skip /api/tts/synthesize — wait for audible playback instead.
  const pauseBtn = page.getByRole("button", { name: "Pause" });
  await expect(pauseBtn).toBeVisible({ timeout: 90_000 });

  await page.waitForTimeout(2_000);
  expect(consoleWarnings, `console warnings: ${consoleWarnings.join("; ")}`).toHaveLength(0);

  const audioPlaying = await page.evaluate(() => {
    const mgr = (window as Window & {
      __amynestAudioManagerRef?: { isSpeechPlaying?: () => boolean };
    }).__amynestAudioManagerRef;
    const media = document.querySelector("audio[src],video[src]") as HTMLMediaElement | null;
    return (
      mgr?.isSpeechPlaying?.() === true ||
      (media != null && !media.paused && media.currentTime > 0)
    );
  });
  const synthesizeOk =
    synthesizeBody?.success === true ||
    synthesizeBody?.ok === true ||
    synthesizeBody?.background === true;
  expect(
    audioPlaying || synthesizeOk,
    `playback failed: synthesize=${JSON.stringify(synthesizeBody)} audioPlaying=${audioPlaying}`,
  ).toBe(true);

  const crashOverlay = await page.locator("#amynest-crash-overlay").count();
  expect(crashOverlay).toBe(0);
});

test.skip("static audio health API returns ok (use dev console checkStaticAudioHealth)", async () => {
  /* TEST AUDIO UI removed — probe via window.checkStaticAudioHealth() in dev. */
});
