/**
 * Local fixture: Pause → Play must resume currentTime, not restart at 0.
 *
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.audio-lesson-pause.ts
 */
import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

type SpeechSnapshot = {
  currentTime: number;
  paused: boolean;
  ended: boolean;
  src: string;
};

async function speechTime(page: import("@playwright/test").Page): Promise<SpeechSnapshot> {
  return page.evaluate(() => {
    const w = window as Window & {
      __amynestAudioManagerRef?: {
        getCurrentElement?: () => HTMLAudioElement | null;
      };
    };
    const el = w.__amynestAudioManagerRef?.getCurrentElement?.() ?? null;
    const media = el ?? (document.querySelector("audio") as HTMLAudioElement | null);
    if (!media) {
      return { currentTime: -1, paused: true, ended: false, src: "" };
    }
    return {
      currentTime: media.currentTime,
      paused: media.paused,
      ended: media.ended,
      src: media.src.slice(0, 48),
    };
  });
}

async function sameSpeechElement(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    const w = window as Window & {
      __amynestAudioManagerRef?: {
        getCurrentElement?: () => HTMLAudioElement | null;
      };
      __pausedLessonAudio?: HTMLAudioElement | null;
    };
    return w.__amynestAudioManagerRef?.getCurrentElement?.() === w.__pausedLessonAudio;
  });
}

async function markSpeechElement(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const w = window as Window & {
      __amynestAudioManagerRef?: {
        getCurrentElement?: () => HTMLAudioElement | null;
      };
      __pausedLessonAudio?: HTMLAudioElement | null;
    };
    w.__pausedLessonAudio = w.__amynestAudioManagerRef?.getCurrentElement?.() ?? null;
  });
}

test("audio lesson pause then play resumes from the paused time", async ({ page }) => {
  const staticAudioGets: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/api/static-audio/") && req.method() === "GET") {
      staticAudioGets.push(req.url());
    }
  });

  await page.goto("/playwright-audio-lesson-player.html", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const sheet = page.getByTestId("audio-player-sheet");
  await expect(sheet).toBeVisible({ timeout: 20_000 });
  const playBtn = sheet.getByTestId("amy-audio-sheet-play");
  await expect(playBtn).toBeVisible();

  await playBtn.click();
  await expect(playBtn).toHaveAttribute("aria-label", /Pause/i, { timeout: 20_000 });

  await expect
    .poll(async () => (await speechTime(page)).currentTime, { timeout: 20_000 })
    .toBeGreaterThan(5.5);

  const beforePause = await speechTime(page);
  expect(beforePause.paused).toBe(false);
  const pausedAt = beforePause.currentTime;
  expect(pausedAt).toBeGreaterThan(5.5);
  await markSpeechElement(page);

  await playBtn.click();
  await expect(playBtn).toHaveAttribute("aria-label", /Play/i, { timeout: 10_000 });

  await page.waitForTimeout(1500);
  const whilePaused = await speechTime(page);
  expect(whilePaused.paused).toBe(true);
  expect(Math.abs(whilePaused.currentTime - pausedAt)).toBeLessThan(0.75);
  await page.screenshot({
    path: "/opt/cursor/artifacts/audio_lesson_paused_clock_5s.png",
    fullPage: true,
  });

  const fetchesBeforeResume = staticAudioGets.length;
  await playBtn.click();
  await expect(playBtn).toHaveAttribute("aria-label", /Pause/i, { timeout: 10_000 });

  const afterResume = await speechTime(page);
  expect(afterResume.currentTime).toBeGreaterThan(pausedAt - 0.35);
  expect(afterResume.currentTime).toBeGreaterThan(5);
  expect(afterResume.paused).toBe(false);
  expect(await sameSpeechElement(page)).toBe(true);
  await page.screenshot({
    path: "/opt/cursor/artifacts/audio_lesson_resumed_clock_6s.png",
    fullPage: true,
  });

  await page.waitForTimeout(2000);
  const progressed = await speechTime(page);
  expect(progressed.currentTime).toBeGreaterThan(afterResume.currentTime + 0.8);

  expect(staticAudioGets.length).toBe(fetchesBeforeResume);

  await playBtn.click();
  await expect(playBtn).toHaveAttribute("aria-label", /Play/i, { timeout: 10_000 });
  const secondPause = await speechTime(page);
  expect(secondPause.paused).toBe(true);
  expect(secondPause.currentTime).toBeGreaterThan(5);

  await page.getByTestId("fixture-lesson-stop").click();
  await expect(playBtn).toHaveAttribute("aria-label", /Play/i);
  const afterStop = await speechTime(page);
  expect(afterStop.currentTime).toBeLessThan(0.35);

  await playBtn.click();
  await expect(playBtn).toHaveAttribute("aria-label", /Pause/i, { timeout: 10_000 });
  const afterStopPlay = await speechTime(page);
  expect(afterStopPlay.currentTime).toBeLessThan(1.2);

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(
    "/opt/cursor/artifacts/audio_lesson_pause_resume_times_v2.json",
    JSON.stringify(
      {
        pausedAt,
        whilePaused,
        afterResume,
        progressed,
        sameElement: true,
        staticAudioGetsAfterResume: staticAudioGets.length,
        fetchesBeforeResume,
        secondPause,
        afterStop,
        afterStopPlay,
      },
      null,
      2,
    ),
  );
  await page.screenshot({
    path: "/opt/cursor/artifacts/audio_lesson_after_stop_play.png",
    fullPage: true,
  });
});
