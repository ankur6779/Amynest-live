import type { Page } from "@playwright/test";
import { primeUserGesture } from "./hub-navigation";

/** Tracks with stale server-side signed-URL cache (see audit/rhymes-lullaby-root-cause.md). */
export const STALE_SIGNED_URL_TRACK_IDS = ["how-much-is-that-doggie-in-the-window"];

/** Confirmed playable on production (2026-06-12 root-cause probe). */
export const CERT_KNOWN_GOOD_SLEEP_TRACK_ID = "a-dream-is-a-wish-your-heart-makes";

/** Pick cert sleep/rhyme tile — exact known-good track (avoids strict-mode .or() ambiguity). */
export function certSleepTileLocator(
  page: Page,
  prefix: "rhyme-tile" | "sleep-track-tile",
): ReturnType<Page["locator"]> {
  return page.getByTestId(`${prefix}-${CERT_KNOWN_GOOD_SLEEP_TRACK_ID}`);
}

/** After tile click, wait for immersive player and playback to start. */
export async function waitForSleepTrackPlayer(page: Page): Promise<void> {
  const player = page.getByTestId("sleep-track-fullscreen-player");
  await player.waitFor({ state: "visible", timeout: 10_000 });
  await player.locator(".animate-spin").waitFor({ state: "hidden", timeout: 30_000 }).catch(() => {});

  const playBtn = player.locator("button.h-16.w-16");
  const needsPlay = await playBtn.locator("svg.lucide-play, .lucide-play").isVisible().catch(() => false);
  if (needsPlay) {
    await primeUserGesture(page);
    await playBtn.click({ timeout: 8_000 }).catch(() => {});
  }
  await player
    .locator("svg.lucide-pause, .lucide-pause")
    .waitFor({ state: "visible", timeout: 25_000 })
    .catch(() => {});
  await page.waitForTimeout(1_500);
}

/** Wait until lullaby/rhyme playback has started (signed URL loaded). */
export async function waitForSleepAudioStart(page: Page): Promise<void> {
  const player = page.getByTestId("sleep-track-fullscreen-player");
  await player
    .locator(".animate-spin")
    .waitFor({ state: "hidden", timeout: 15_000 })
    .catch(() => {});

  await page
    .waitForFunction(
      () => {
        const w = window as Window & {
          __amynestAudioManagerRef?: {
            getRecentPlaybackEvidence?: (withinMs?: number) => { peakCurrentTime: number } | null;
            isAnyChannelPlaying?: () => boolean;
          };
        };
        const mgr = w.__amynestAudioManagerRef;
        const evidence = mgr?.getRecentPlaybackEvidence?.(15_000);
        if ((evidence?.peakCurrentTime ?? 0) > 0.05) return true;
        const audio = document.querySelector("audio");
        return !!(
          audio?.src?.startsWith("http") &&
          (audio.currentTime > 0.05 || (!audio.paused && audio.readyState >= 2))
        );
      },
      { timeout: 20_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

/** Close immersive players, dismiss overlays, stop audio before cert surface transitions. */
export async function dismissBlockingOverlays(page: Page): Promise<void> {
  await Promise.race([
    page.evaluate(() => {
    const w = window as Window & {
      __amynestAudioManagerRef?: { stopAll?: () => void };
    };
    w.__amynestAudioManagerRef?.stopAll?.();
    document.querySelectorAll("audio, video").forEach((el) => {
      const media = el as HTMLMediaElement;
      try {
        media.pause();
        media.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
    try {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.metadata = null;
      }
    } catch {
      /* ignore */
    }
  }),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);

  await Promise.race([
    page.evaluate(() => {
      document.getElementById("amynest-safe-recovery-overlay")?.remove();
      document.getElementById("amynest-crash-overlay")?.remove();
    }),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]).catch(() => {});

  for (let i = 0; i < 6; i++) {
    const safeRetry = page.locator("#amynest-safe-retry");
    if (await safeRetry.isVisible({ timeout: 300 }).catch(() => false)) {
      await safeRetry.click({ timeout: 3_000, noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(600);
      continue;
    }

    const closePlayer = page.getByLabel("Close player");
    if (await closePlayer.isVisible({ timeout: 400 }).catch(() => false)) {
      await closePlayer.click({ timeout: 3_000, noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(350);
      continue;
    }

    const blendClose = page.getByLabel(/close blend panel/i);
    if (await blendClose.isVisible({ timeout: 300 }).catch(() => false)) {
      await blendClose.click({ timeout: 2_000, noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(300);
      continue;
    }

    const dismiss = page.getByRole("button", { name: /^Dismiss$/i });
    if (await dismiss.isVisible({ timeout: 300 }).catch(() => false)) {
      await dismiss.click({ timeout: 2_000, noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(300);
      continue;
    }

    break;
  }

  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
}

/** Pick the child profile with the richest 3–4y CVC blending content. */
export async function selectBlendingAgeChild(page: Page): Promise<string | null> {
  const readLevelLabel = async (): Promise<string> => {
    const subtitle = page.locator("header").locator("p.truncate").first();
    if (await subtitle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return (await subtitle.innerText()).trim();
    }
    return "";
  };

  const section = page.locator('section[aria-label="Choose child"]');
  const hasPicker = await section.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!hasPicker) {
    const label = await readLevelLabel();
    return label.includes("·") ? label.split("·")[0]?.trim() ?? "default" : "default";
  }

  const buttons = section.locator("button");
  const count = await buttons.count();
  let bestName: string | null = null;
  let bestScore = -1;

  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i);
    const name = (await btn.innerText()).trim();
    await btn.click({ timeout: 8_000, noWaitAfter: true });
    await page.waitForTimeout(1_200);

    const levelLabel = await readLevelLabel();

    const library = page.getByTestId("phonics-full-library");
    if (await library.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const collapsed = library.locator('button[aria-expanded="false"]').first();
      if (await collapsed.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await collapsed.click({ timeout: 5_000, noWaitAfter: true });
        await page.waitForTimeout(600);
      }
    }

    const cvc = page.getByTestId("cvc-blending-practice");
    if (await cvc.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await cvc.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      const level1 = cvc.getByRole("button", { name: "Level 1", exact: true });
      if (await level1.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await level1.click({ timeout: 5_000, noWaitAfter: true });
        await page.waitForTimeout(400);
      }
    }

    let score = 0;
    if (/Blending/i.test(levelLabel)) score += 10;
    if (await page.getByTestId("phonics-tile-bl-bat").isVisible({ timeout: 2_500 }).catch(() => false)) {
      score += 5;
    }
    if (await page.getByTestId("phonics-tile-bl-mat").isVisible({ timeout: 1_500 }).catch(() => false)) {
      score += 5;
    }
    if (await page.getByTestId("phonics-tile-bl-cat").isVisible({ timeout: 1_000 }).catch(() => false)) {
      score += 2;
    }
    if (await page.getByTestId("cvc-blending-practice").isVisible({ timeout: 1_000 }).catch(() => false)) {
      const batBtn = page.getByTestId("cvc-blending-practice").getByRole("button", { name: "bat", exact: true });
      if (await batBtn.isVisible({ timeout: 1_500 }).catch(() => false)) score += 4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  if (bestName) {
    const match = section.getByRole("button", { name: bestName, exact: true });
    if (await match.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await match.click({ timeout: 8_000, noWaitAfter: true });
      await page.waitForTimeout(800);
    }
  }

  return bestName;
}
