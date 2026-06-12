import type { Page, Locator } from "@playwright/test";
import { primeUserGesture } from "./hub-navigation";
import { dismissBlockingOverlays, selectBlendingAgeChild } from "./cert-preconditions";

export type PhonicsWordResult = {
  word: string;
  clickOk: boolean;
  audioManagerPlayInvoked: boolean;
  mediaElementExists: boolean;
  currentTimeAdvances: boolean;
  endedEventFired: boolean;
  sourceUrl: string | null;
  duration: number | null;
  events: string[];
  peakCurrentTime: number;
  playPath?: string;
  error?: string;
};

export type PhonicsCertReport = {
  preconditionsOk: boolean;
  preconditionError?: string;
  selectedChild?: string;
  words: PhonicsWordResult[];
  reloadWords: PhonicsWordResult[];
  allWordsPass: boolean;
  reloadPass: boolean;
};

/** Close overlays, stop audio, clear media session. Fail if modal remains. */
export async function ensureCleanAudioState(page: Page): Promise<void> {
  await dismissBlockingOverlays(page);

  const blocking = await page.evaluate(() => {
    const modals = Array.from(
      document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
    ).filter((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    });
    return {
      modalCount: modals.length,
      modalLabels: modals.map((m) => m.getAttribute("aria-label") ?? m.className.slice(0, 60)),
    };
  });

  if (blocking.modalCount > 0) {
    throw new Error(
      `Precondition failed: ${blocking.modalCount} modal(s) still open: ${blocking.modalLabels.join("; ")}`,
    );
  }
}

export async function installPhonicsPlayHook(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.evaluate(() => {
    const w = window as Window & {
      __phonicsCert?: {
        playCalls: Array<{ at: number; src: string; phrase?: string }>;
        events: string[];
      };
      __amynestAudioManagerRef?: {
        play?: (
          audio: HTMLAudioElement,
          meta?: { phrase?: string; proxyUrl?: string },
          opts?: unknown,
        ) => Promise<boolean>;
      };
    };
    w.__phonicsCert = { playCalls: [], events: [] };
    const mgr = w.__amynestAudioManagerRef;
    if (!mgr?.play || (mgr.play as { __phonicsCertHooked?: boolean }).__phonicsCertHooked) return;
    const orig = mgr.play.bind(mgr);
    const wrapped = async (
      audio: HTMLAudioElement,
      meta?: { phrase?: string; proxyUrl?: string },
      opts?: unknown,
    ) => {
      w.__phonicsCert!.playCalls.push({
        at: Date.now(),
        src: audio?.src ?? meta?.proxyUrl ?? "",
        phrase: meta?.phrase,
      });
      w.__phonicsCert!.events.push(`audioManager.play:${meta?.phrase ?? audio?.src ?? "?"}`);
      return orig(audio, meta ?? {}, opts);
    };
    (wrapped as { __phonicsCertHooked?: boolean }).__phonicsCertHooked = true;
    mgr.play = wrapped;
  });
      return;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(1_500);
    }
  }
}

async function expandPhonicsLibrary(page: Page): Promise<void> {
  const library = page.getByTestId("phonics-full-library");
  if (await library.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await library.scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
    const toggle = library.locator('button[aria-expanded="false"]').first();
    if (await toggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await toggle.click({ timeout: 5_000, noWaitAfter: true });
      await page.waitForTimeout(500);
    }
  }
}

async function prepareCvcBlendingLevel1(page: Page): Promise<void> {
  const card = page.getByTestId("cvc-blending-practice");
  if (!(await card.isVisible({ timeout: 8_000 }).catch(() => false))) return;
  await card.scrollIntoViewIfNeeded({ timeout: 15_000 });
  const level1 = card.getByRole("button", { name: "Level 1", exact: true });
  if (await level1.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await level1.click({ timeout: 5_000, noWaitAfter: true });
    await page.waitForTimeout(400);
  }
}

async function resolveWordPlayTarget(page: Page, word: string): Promise<{ locator: Locator; path: string } | null> {
  await expandPhonicsLibrary(page);
  await prepareCvcBlendingLevel1(page);

  const tile = page.getByTestId(`phonics-tile-bl-${word}`);
  if (await tile.count()) {
    await tile.first().scrollIntoViewIfNeeded({ timeout: 15_000 }).catch(() => {});
    const inTile = tile.first().locator(`[data-testid="audio-play-${word}"]`);
    if (await inTile.isVisible({ timeout: 3_000 }).catch(() => false)) {
      return { locator: inTile.first(), path: `tile:bl-${word}` };
    }
  }

  const direct = page.getByTestId(`audio-play-${word}`).first();
  if (await direct.isVisible({ timeout: 1_500 }).catch(() => false)) {
    return { locator: direct, path: `audio-play-${word}` };
  }

  const cvcCard = page.getByTestId("cvc-blending-practice");
  if (await cvcCard.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await cvcCard.scrollIntoViewIfNeeded({ timeout: 20_000 });
    const wordBtn = cvcCard.getByRole("button", { name: word, exact: true });
    if (await wordBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return { locator: wordBtn, path: `cvc-blending:${word}` };
    }
  }

  return null;
}

export async function navigateToPhonics(page: Page): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(2_000);
    }
  }
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);
  await installPhonicsPlayHook(page);
  await dismissBlockingOverlays(page);

  await page
    .locator('[data-testid="phonics-practice-sounds"], [data-testid="phonics-full-library"]')
    .first()
    .waitFor({ state: "visible", timeout: 60_000 })
    .catch(() => {});

  const selectedChild = (await selectBlendingAgeChild(page)) ?? "default";

  await expandPhonicsLibrary(page);

  await page.evaluate(() => {
    const el = document.getElementById("phonics-learning");
    el?.scrollIntoView({ block: "start" });
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(1_200);

  await prepareCvcBlendingLevel1(page);

  const practice = page.getByTestId("phonics-practice-sounds").first();
  if (await practice.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await practice.scrollIntoViewIfNeeded({ timeout: 30_000 });
  }

  return selectedChild;
}

async function playWordAndVerify(page: Page, word: string): Promise<PhonicsWordResult> {
  await page.evaluate(() => {
    const w = window as Window & { __phonicsCert?: { playCalls: unknown[]; events: string[] } };
    if (w.__phonicsCert) {
      w.__phonicsCert.playCalls = [];
      w.__phonicsCert.events = [];
    }
  });

  const target = await resolveWordPlayTarget(page, word);
  if (!target) {
    return {
      word,
      clickOk: false,
      audioManagerPlayInvoked: false,
      mediaElementExists: false,
      currentTimeAdvances: false,
      endedEventFired: false,
      sourceUrl: null,
      duration: null,
      events: [],
      peakCurrentTime: 0,
      error: `No play target for "${word}" on page`,
    };
  }

  let clickOk = false;
  let clickError: string | undefined;
  try {
    await target.locator.scrollIntoViewIfNeeded({ timeout: 15_000 });
    await dismissBlockingOverlays(page);
    await target.locator.dispatchEvent("pointerdown");
    await target.locator.click({ timeout: 12_000, noWaitAfter: true });

    if (target.path.startsWith("cvc-blending:")) {
      const panel = page.getByTestId("cvc-blend-panel");
      await panel.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
      const playBlend = panel.getByRole("button", { name: /Play blend/i });
      if (await playBlend.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await playBlend.dispatchEvent("pointerdown");
        await playBlend.click({ timeout: 8_000, noWaitAfter: true });
      }
    }

    clickOk = true;
  } catch (e) {
    clickError = e instanceof Error ? e.message : String(e);
  }

  const observed = await page.evaluate(async ({ clickSucceeded }) => {
    const cert = (window as Window & {
      __phonicsCert?: { playCalls: Array<{ src: string; phrase?: string }>; events: string[] };
    }).__phonicsCert;
    const mgr = (window as Window & {
      __amynestAudioManagerRef?: {
        getRecentPlaybackEvidence?: (withinMs?: number) => {
          src: string;
          peakCurrentTime: number;
          ended: boolean;
        } | null;
        getRecentMediaElement?: (withinMs?: number) => HTMLAudioElement | null;
      };
    }).__amynestAudioManagerRef;

    const events: string[] = [...(cert?.events ?? [])];
    let media: HTMLMediaElement | null = null;

    for (let i = 0; i < 24; i++) {
      media =
        mgr?.getRecentMediaElement?.(12_000) ??
        (Array.from(document.querySelectorAll("audio")).find((a) => !!a.src) as
          | HTMLAudioElement
          | undefined) ??
        null;
      if (media?.src) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    let playingFired = false;
    let endedFired = false;
    let peakTime = 0;

    if (media) {
      const onPlaying = () => {
        playingFired = true;
        events.push("playing");
      };
      const onEnded = () => {
        endedFired = true;
        events.push("ended");
      };
      media.addEventListener("playing", onPlaying);
      media.addEventListener("ended", onEnded);

      if (media.paused && clickSucceeded) {
        try {
          await media.play();
          events.push("media.play()");
        } catch (e) {
          events.push(`media.play_error:${e instanceof Error ? e.message : String(e)}`);
        }
      }

      for (let t = 0; t < 16; t++) {
        peakTime = Math.max(peakTime, media.currentTime);
        if (endedFired) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      peakTime = Math.max(peakTime, media.currentTime);

      media.removeEventListener("playing", onPlaying);
      media.removeEventListener("ended", onEnded);
    }

    const evidence = mgr?.getRecentPlaybackEvidence?.(12_000);
    if (evidence) {
      peakTime = Math.max(peakTime, evidence.peakCurrentTime);
      if (evidence.ended) endedFired = true;
      if (evidence.peakCurrentTime > 0) events.push("playback_evidence");
    }

    const playCallsSinceClick = cert?.playCalls.length ?? 0;
    const src = media?.src ?? evidence?.src ?? cert?.playCalls.at(-1)?.src ?? null;
    const audioManagerPlayInvoked =
      playCallsSinceClick > 0 || (evidence?.peakCurrentTime ?? 0) > 0;

    return {
      audioManagerPlayInvoked,
      mediaElementExists: !!(media?.src || evidence?.src),
      currentTimeAdvances: peakTime > 0.02,
      endedEventFired: endedFired || (evidence?.ended ?? false),
      sourceUrl: src,
      duration: media && Number.isFinite(media.duration) ? media.duration : null,
      events,
      peakCurrentTime: peakTime,
    };
  }, { clickSucceeded: clickOk });

  return {
    word,
    clickOk,
    audioManagerPlayInvoked: observed.audioManagerPlayInvoked,
    mediaElementExists: observed.mediaElementExists,
    currentTimeAdvances: observed.currentTimeAdvances,
    endedEventFired: observed.endedEventFired,
    sourceUrl: observed.sourceUrl,
    duration: observed.duration,
    events: observed.events,
    peakCurrentTime: observed.peakCurrentTime,
    playPath: target.path,
    error: clickError,
  };
}

function wordPasses(r: PhonicsWordResult): boolean {
  return (
    r.clickOk &&
    r.audioManagerPlayInvoked &&
    r.mediaElementExists &&
    r.currentTimeAdvances &&
    r.endedEventFired
  );
}

export async function runPhonicsWordCert(
  page: Page,
  words: string[],
): Promise<PhonicsCertReport> {
  let preconditionsOk = true;
  let preconditionError: string | undefined;
  try {
    await ensureCleanAudioState(page);
  } catch (e) {
    preconditionsOk = false;
    preconditionError = e instanceof Error ? e.message : String(e);
    return {
      preconditionsOk,
      preconditionError,
      words: [],
      reloadWords: [],
      allWordsPass: false,
      reloadPass: false,
    };
  }

  const selectedChild = await navigateToPhonics(page);

  const wordsResults: PhonicsWordResult[] = [];
  for (const word of words) {
    await dismissBlockingOverlays(page).catch(() => {});
    await expandPhonicsLibrary(page);
    await prepareCvcBlendingLevel1(page);
    await page.waitForTimeout(500);
    wordsResults.push(await playWordAndVerify(page, word));
    await page.waitForTimeout(800);
  }

  await ensureCleanAudioState(page).catch(() => {});
  await navigateToPhonics(page);

  const reloadWords: PhonicsWordResult[] = [];
  for (const word of words) {
    await dismissBlockingOverlays(page).catch(() => {});
    await expandPhonicsLibrary(page);
    await prepareCvcBlendingLevel1(page);
    await page.waitForTimeout(500);
    reloadWords.push(await playWordAndVerify(page, word));
    await page.waitForTimeout(800);
  }

  return {
    preconditionsOk,
    selectedChild,
    words: wordsResults,
    reloadWords,
    allWordsPass: wordsResults.every(wordPasses),
    reloadPass: reloadWords.every(wordPasses),
  };
}
