import type { Page } from "@playwright/test";
import {
  expandHubGroup,
  expandHubSection,
  expandInfantHubUntil,
  openParentingHubTile,
  primeUserGesture,
  selectInfantChildIfPresent,
  selectSleepModuleTab,
} from "./hub-navigation";

export type AudioFeatureId =
  | "parent_hub_story"
  | "amy_coach"
  | "conversation_coach"
  | "speech_coach"
  | "infant_story"
  | "infant_poem"
  | "audio_lesson"
  | "phonics";

export type AudioFeatureSpec = {
  id: AudioFeatureId;
  label: string;
  trigger: (page: Page) => Promise<void>;
};

async function triggerParentHubStory(page: Page): Promise<void> {
  await openParentingHubTile(page, { group: "stories", tileId: "story-hub" });
  await page.getByTestId("story-hub").waitFor({ state: "visible", timeout: 30_000 });
  const watch = page.getByRole("button", { name: /^Watch / }).first();
  await watch.click({ timeout: 15_000 });
  await page.waitForTimeout(2_000);
  await page.evaluate(async () => {
    const video = document.querySelector("video");
    if (!video?.src) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        /* gesture already primed */
      }
    }
  });
  await page.waitForTimeout(1_500);
}

async function ensureAmyCoachListenReady(page: Page): Promise<void> {
  await page.goto("/amy-coach/progress", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_000);

  const continueBtn = page.getByRole("button", { name: /continue|resume|pick up|view plan/i }).first();
  if (await continueBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await continueBtn.click({ timeout: 10_000 });
    await page.waitForTimeout(2_500);
  }

  const listenOnProgress = page.getByTestId("coach-listen-btn").first();
  if (await listenOnProgress.isVisible({ timeout: 5_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/amy-coach", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);

  if (await listenOnProgress.isVisible({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const infantCategory = page.getByRole("button").filter({ hasText: /Baby Care/i }).first();
  await infantCategory.click({ timeout: 15_000 });
  await page.waitForTimeout(600);

  const sleepGoal = page.getByRole("button").filter({ hasText: /not sleeping/i }).first();
  await sleepGoal.click({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}

async function triggerAmyCoach(page: Page): Promise<void> {
  await ensureAmyCoachListenReady(page);
  const listen = page.getByTestId("coach-listen-btn").first();
  await listen.waitFor({ state: "visible", timeout: 25_000 });
  await listen.click({ timeout: 15_000 });
  await page.waitForTimeout(1_000);
}

async function ensureSpeechCoachChild(page: Page): Promise<void> {
  await page.goto("/speech-coach", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1_500);
  const child = page.locator('[data-testid^="speech-child-"]').first();
  if (await child.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await child.click({ timeout: 8_000 });
    await page.waitForTimeout(600);
  }
}

async function triggerConversationCoach(page: Page): Promise<void> {
  await ensureSpeechCoachChild(page);
  await page.goto("/speech-coach/talk", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_500);
  await primeUserGesture(page);
  await page.getByTestId("conversation-coach-page").waitFor({ state: "visible", timeout: 30_000 });

  const start = page.getByRole("button", { name: "Start Talking" });
  if (await start.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await start.click({ timeout: 12_000 });
  }
  await page
    .waitForFunction(
      () => {
        const mgr = (window as Window & {
          __amynestAudioManagerRef?: { isSpeechPlaying?: () => boolean };
        }).__amynestAudioManagerRef;
        return mgr?.isSpeechPlaying?.() === true || !!document.querySelector("audio[src],video[src]");
      },
      { timeout: 45_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(3_000);
}

async function triggerSpeechCoach(page: Page): Promise<void> {
  await ensureSpeechCoachChild(page);
  await page.goto("/speech-coach/live-session", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_500);
  await primeUserGesture(page);
  await page.getByTestId("live-speech-coach-page").waitFor({ state: "visible", timeout: 30_000 });

  const start = page.getByRole("button", { name: "Start Live Session" });
  if (await start.isVisible({ timeout: 12_000 }).catch(() => false)) {
    await start.click({ timeout: 12_000 });
  }
  const hearAgain = page.getByRole("button", { name: "Hear again" });
  if (await hearAgain.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await hearAgain.dispatchEvent("pointerdown");
    await hearAgain.click({ timeout: 8_000 });
  }
  await page
    .waitForFunction(
      () => {
        const mgr = (window as Window & {
          __amynestAudioManagerRef?: { isSpeechPlaying?: () => boolean };
        }).__amynestAudioManagerRef;
        return mgr?.isSpeechPlaying?.() === true || !!document.querySelector("audio[src],video[src]");
      },
      { timeout: 25_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(3_000);
}

async function openInfantSleepModule(page: Page): Promise<boolean> {
  await page.goto("/parenting-hub#tile-infant-hub", {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);
  const hasInfantChild = await selectInfantChildIfPresent(page);
  if (!hasInfantChild) return false;
  return expandInfantHubUntil(page, "sleep-module-shell");
}

async function openInfantSleepFixture(page: Page, tab: "poems" | "stories" | "lullabies"): Promise<void> {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "";
  if (base.includes("amynest.in")) {
    throw new Error("infant_sleep_fixture_not_deployed_on_production");
  }
  await page.goto("/playwright-infant-sleep-audio.html", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await primeUserGesture(page);
  const label = tab === "lullabies" ? /^lullabies$/i : tab === "poems" ? /^poems$/i : /^stories$/i;
  await page.getByRole("tab", { name: label }).click({ timeout: 12_000 });
  await page.waitForTimeout(400);
}

async function triggerInfantStory(page: Page): Promise<void> {
  const hubReady = await openInfantSleepModule(page);
  if (hubReady) {
    await selectSleepModuleTab(page, "lullabies");
    const tile = page.locator('[data-testid^="sleep-track-tile-"]').first();
    if (await tile.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await tile.click({ timeout: 15_000 });
      await page.waitForTimeout(1_200);
      const player = page.getByTestId("sleep-track-fullscreen-player");
      if (await player.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await primeUserGesture(page);
        await player.locator("button.h-16.w-16").click({ timeout: 8_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
      }
      return;
    }
  }
  if (process.env.PLAYWRIGHT_BASE_URL?.includes("amynest.in")) {
    throw new Error("infant_story_requires_infant_child_or_fixture");
  }
  await openInfantSleepFixture(page, "stories");
  const tile = page.locator('[data-testid^="sleep-track-tile-"]').first();
  await tile.waitFor({ state: "visible", timeout: 20_000 });
  await tile.click({ timeout: 15_000 });
  await page.waitForTimeout(1_200);
}

async function triggerInfantPoem(page: Page): Promise<void> {
  const hubReady = await openInfantSleepModule(page);
  if (hubReady && (await page.getByTestId("infant-poems-section").isVisible({ timeout: 2_000 }).catch(() => false))) {
    const poemTile = page.locator('[data-testid^="poem-tile-"]').first();
    await poemTile.click({ timeout: 15_000 });
    await page.waitForTimeout(1_200);
    return;
  }

  if (process.env.PLAYWRIGHT_BASE_URL?.includes("amynest.in")) {
    throw new Error("infant_poem_requires_infant_child_or_fixture");
  }
  await openInfantSleepFixture(page, "poems");
  const poemTile = page.locator('[data-testid^="poem-tile-"]').first();
  await poemTile.waitFor({ state: "visible", timeout: 20_000 });
  await poemTile.click({ timeout: 15_000 });
  await page.waitForTimeout(1_200);
}

async function triggerAudioLesson(page: Page): Promise<void> {
  await page.goto("/audio-lessons", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(1_500);
  await primeUserGesture(page);

  await page.getByTestId("age-tile-2-4").click({ timeout: 20_000 });
  await page.waitForTimeout(800);

  const enabledCard = page
    .locator('[data-testid^="lesson-card-"]:not([disabled])')
    .filter({ hasNot: page.locator("[disabled]") })
    .first();
  await enabledCard.click({ timeout: 20_000 });
  await page.waitForTimeout(1_000);

  const sheet = page.getByTestId("audio-player-sheet");
  await sheet.waitFor({ state: "visible", timeout: 20_000 });
  await sheet.getByRole("button", { name: "Play" }).click({ timeout: 15_000 });
  await page.waitForTimeout(1_000);
}

async function triggerPhonics(page: Page): Promise<void> {
  await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);

  const toddler = page.getByRole("button", { name: /Audit-Toddler/i });
  if (await toddler.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await toddler.click({ timeout: 8_000 });
    await page.waitForTimeout(800);
  }

  await page.locator("main.scroll-safe").first().click({ position: { x: 16, y: 120 }, force: true });
  await page.waitForTimeout(300);

  const cta = page.getByTestId("phonics-primary-cta");
  if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await cta.click({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
  }

  const practice = page.getByTestId("phonics-practice-sounds");
  await practice.scrollIntoViewIfNeeded({ timeout: 45_000 });
  await practice.waitFor({ state: "visible", timeout: 45_000 });

  let playByTestId = page.locator('[data-testid^="audio-play-"]').first();
  if (!(await playByTestId.isVisible({ timeout: 8_000 }).catch(() => false))) {
    await openParentingHubTile(page, { group: "learning", tileId: "phonics" });
    await page.getByTestId("phonics-practice-sounds").scrollIntoViewIfNeeded({ timeout: 30_000 });
    playByTestId = page.locator('[data-testid^="audio-play-"]').first();
  }
  await playByTestId.waitFor({ state: "visible", timeout: 25_000 });
  await playByTestId.click({ timeout: 12_000 });
  await page.waitForTimeout(1_500);
}

export const AUDIO_COVERAGE_FEATURES: AudioFeatureSpec[] = [
  { id: "parent_hub_story", label: "Parent Hub Story", trigger: triggerParentHubStory },
  { id: "amy_coach", label: "Amy Coach", trigger: triggerAmyCoach },
  { id: "conversation_coach", label: "Conversation Coach", trigger: triggerConversationCoach },
  { id: "speech_coach", label: "Speech Coach", trigger: triggerSpeechCoach },
  { id: "infant_story", label: "Infant Story", trigger: triggerInfantStory },
  { id: "infant_poem", label: "Infant Poem", trigger: triggerInfantPoem },
  { id: "audio_lesson", label: "Audio Lesson", trigger: triggerAudioLesson },
  { id: "phonics", label: "Phonics", trigger: triggerPhonics },
];

export async function expandHubForCoverage(page: Page): Promise<void> {
  await expandHubGroup(page, "stories");
  await expandHubGroup(page, "learning");
  await expandHubSection(page, "story-hub");
  await expandHubSection(page, "phonics");
}
