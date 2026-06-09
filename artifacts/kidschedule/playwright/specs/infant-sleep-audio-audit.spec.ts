/**
 * Post-fix runtime audit — infant sleep audio (lullabies, poems, stories).
 *
 * Run:
 *   pnpm --filter @workspace/kidschedule exec playwright install chromium webkit
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.infant-sleep-audio.ts
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page, type BrowserContext } from "@playwright/test";

type PlaybackLog = {
  selectedId: string;
  resolvedAudioUrl: string;
  contentType: string;
  pipeline: string;
};

type TtsCall = {
  text: string;
  audioUrl: string;
};

const AUDIT_DIR = join(process.cwd(), "playwright", "infant-sleep-audio-audit-artifacts");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

async function hashRemoteMp3(page: Page, url: string): Promise<{ hash: string; bytes: number }> {
  const res = await page.request.get(url);
  expect(res.ok(), `fetch ${url}`).toBeTruthy();
  const buf = Buffer.from(await res.body());
  return { hash: sha256(buf), bytes: buf.length };
}

async function setupTtsMock(page: Page, calls: TtsCall[]): Promise<void> {
  await page.route("**/api/tts/generate", async (route) => {
    const body = route.request().postDataJSON() as { text?: string; category?: string };
    const text = (body.text ?? "").trim();
    const slug = createHash("md5").update(text).digest("hex").slice(0, 12);
    const audioUrl = `/api/tts/audio/mock-tts-${slug}.mp3`;
    calls.push({ text, audioUrl });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        success: true,
        url: audioUrl,
        audioUrl,
        cacheKey: slug,
        cached: true,
        charCount: text.length,
        contentType: "audio/mpeg",
      }),
    });
  });

  // Serve tiny distinct MP3 bodies per mock TTS URL (valid MPEG frame header).
  await page.route("**/api/tts/audio/mock-tts-*.mp3", async (route) => {
    const url = route.request().url();
    const slug = url.split("mock-tts-")[1]?.replace(".mp3", "") ?? "x";
    const seed = createHash("md5").update(slug).digest();
    const body = Buffer.concat([
      Buffer.from([0xff, 0xfb, 0x90, 0x00]),
      seed,
      Buffer.alloc(512, slug.charCodeAt(0) % 256),
    ]);
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body,
    });
  });
}

function parsePlaybackLogs(consoleLines: string[]): PlaybackLog[] {
  return consoleLines
    .filter((l) => l.includes("[InfantSleepPlayback]"))
    .map((l) => {
      const jsonStart = l.indexOf("{");
      if (jsonStart < 0) return null;
      try {
        return JSON.parse(l.slice(jsonStart)) as PlaybackLog;
      } catch {
        return null;
      }
    })
    .filter((x): x is PlaybackLog => x !== null);
}

async function openTab(page: Page, name: RegExp): Promise<void> {
  await page.getByRole("tab", { name }).click();
  await page.waitForTimeout(400);
}

async function primeAudioUnlock(page: Page): Promise<void> {
  await page.locator("body").click({ position: { x: 8, y: 8 } });
  await page.waitForTimeout(200);
}

test.describe("Infant sleep audio — post-fix runtime audit", () => {
  test.beforeAll(() => {
    mkdirSync(AUDIT_DIR, { recursive: true });
  });

  test("TEST 1–4: lullabies, poems, stories, network trace", async ({ page }, testInfo) => {
    const consoleLines: string[] = [];
    const dupWarnings: string[] = [];
    const ttsCalls: TtsCall[] = [];
    const mp3Gets: string[] = [];

    const allTtsRequests: string[] = [];

    page.on("console", (msg) => {
      const t = msg.text();
      consoleLines.push(t);
      if (t.includes("AUDIO CONTENT DUPLICATION DETECTED")) dupWarnings.push(t);
    });

    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("/api/tts/") || u.includes("tts/generate")) {
        allTtsRequests.push(`${req.method()} ${u}`);
      }
      if (u.includes("/infant-sleep-audio/") && u.endsWith(".mp3")) {
        mp3Gets.push(u);
      }
    });

    await setupTtsMock(page, ttsCalls);
    await page.route("**/api/admin/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          disableStreaming: false,
          disableApi: false,
          forceEmergencyMode: false,
          safeMode: false,
          apiEnabled: true,
          streamingEnabled: true,
        }),
      });
    });
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "networkidle" });
    await primeAudioUnlock(page);

    // ── TEST 1: Lullabies ──
    await openTab(page, /^lullabies$/i);
    const lullabyIds = ["lul-twinkle", "lul-brahms", "lul-rock-a-bye"];
    const lullabyUrls: Record<string, string> = {};
    const lullabyHashes: Record<string, string> = {};

    for (const id of lullabyIds) {
      await page.getByTestId(`sleep-track-tile-${id}`).click();
      await page.waitForTimeout(1200);
      await page.getByTestId("sleep-track-fullscreen-player").getByLabel("Close player").click();
      await page.waitForTimeout(300);
    }

    const lullabyMp3Requests = [...new Set(mp3Gets.filter((u) => u.includes("/lullabies/")))];
    expect(lullabyMp3Requests.length, "each lullaby should fetch its MP3").toBeGreaterThanOrEqual(3);

    for (const id of lullabyIds) {
      const slug = id.replace("lul-", "");
      const match = lullabyMp3Requests.find((u) => u.includes(`/${slug}.mp3`));
      expect(match, `network request for ${id}`).toBeTruthy();
      lullabyUrls[id] = match!;
      const { hash, bytes } = await hashRemoteMp3(page, match!);
      lullabyHashes[id] = hash;
      expect(bytes, `${id} mp3 size`).toBeGreaterThan(10_000);
    }

    const hashSet = new Set(Object.values(lullabyHashes));
    expect(hashSet.size, "lullaby SHA-256 hashes must differ").toBe(3);

    await page.screenshot({
      path: join(AUDIT_DIR, `test1-lullabies-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // ── TEST 2: Poems ──
    ttsCalls.length = 0;
    await openTab(page, /^poems$/i);
    const poemSpecs = [
      { id: "poem-sleep-baby-sleep", ageTab: "0-6m", mustInclude: "Sleep baby sleep" },
      { id: "poem-hush-little-cloud", ageTab: "0-6m", mustInclude: "Hush little cloud" },
      { id: "poem-pat-pat-pat", ageTab: "6-12m", mustInclude: "Pat pat pat" },
    ];

    for (const spec of poemSpecs) {
      await page.getByTestId(`poem-age-tab-${spec.ageTab}`).click();
      await page.waitForTimeout(300);
      await page.getByTestId(`poem-tile-${spec.id}`).click();
      await expect(page.getByTestId("poem-fullscreen-player")).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(800);
      await page.getByTestId("poem-fullscreen-close").click();
      await page.waitForTimeout(300);
    }

    expect(ttsCalls.length, `poems must call TTS generate (saw: ${allTtsRequests.join("; ")})`).toBeGreaterThanOrEqual(3);
    for (const spec of poemSpecs) {
      const call = ttsCalls.find((c) => c.text.toLowerCase().includes(spec.mustInclude.toLowerCase()));
      expect(call, `TTS text for ${spec.id}`).toBeTruthy();
      expect(call!.text.length, "full poem lines spoken").toBeGreaterThan(20);
      expect(call!.audioUrl, "poem uses TTS url").toMatch(/\/api\/tts\/audio\//);
      expect(call!.audioUrl, "not instrumental poem mp3").not.toMatch(/\/infant-sleep-audio\/.*\/poems\//);
    }

    const uniquePoemTexts = new Set(ttsCalls.map((c) => c.text));
    expect(uniquePoemTexts.size, "distinct poem TTS texts").toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: join(AUDIT_DIR, `test2-poems-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // ── TEST 3: Stories (5 total across age tabs) ──
    ttsCalls.length = 0;
    await openTab(page, /^stories$/i);
    const storySpecs = [
      { id: "story-moon-blanket", ageTab: "6-12m" },
      { id: "story-cloud-pillow", ageTab: "6-12m" },
      { id: "story-boat-dreams", ageTab: "6-12m" },
      { id: "story-star-friend", ageTab: "12-24m" },
      { id: "story-garden-sleep", ageTab: "12-24m" },
    ];

    for (const spec of storySpecs) {
      await page.getByTestId(`sleep-age-tab-${spec.ageTab}`).click();
      await page.waitForTimeout(300);
      await page.getByTestId(`sleep-track-tile-${spec.id}`).click();
      await page.waitForTimeout(1800);
      const close = page.getByTestId("sleep-track-fullscreen-player").getByLabel("Close player");
      if (await close.isVisible()) await close.click();
      await page.waitForTimeout(300);
    }

    expect(ttsCalls.length, "all 5 stories call TTS").toBeGreaterThanOrEqual(5);
    for (const call of ttsCalls) {
      expect(call.text.length, "story narration longer than title").toBeGreaterThan(80);
      expect(call.audioUrl).toMatch(/\/api\/tts\/audio\//);
      expect(call.audioUrl).not.toMatch(/\/infant-sleep-audio\/.*\/stories\//);
    }

    await page.screenshot({
      path: join(AUDIT_DIR, `test3-stories-${testInfo.project.name}.png`),
      fullPage: true,
    });

    // ── TEST 4: Network / console pipeline trace ──
    const traceFromWindow = await page.evaluate(() => {
      const trace = window.__infantSleepAudit?.getPlaybackTrace?.() ?? [];
      return trace.map((t) => ({
        selectedId: t.selectedId ?? "(unknown)",
        resolvedAudioUrl: t.resolvedAudioUrl ?? "(tts)",
        contentType: t.contentType,
        pipeline: t.pipeline,
      }));
    });
    const playbackLogs =
      traceFromWindow.length > 0 ? traceFromWindow : parsePlaybackLogs(consoleLines);
    expect(playbackLogs.length, "InfantSleepPlayback trace entries").toBeGreaterThan(0);

    const lullabyLogs = playbackLogs.filter((l) => l.contentType === "lullaby");
    const poemLogs = playbackLogs.filter((l) => l.contentType === "poem");
    const storyLogs = playbackLogs.filter((l) => l.contentType === "story");

    expect(lullabyLogs.some((l) => l.pipeline === "bundled_mp3")).toBe(true);
    expect(poemLogs.every((l) => l.pipeline === "tts_narration")).toBe(true);
    expect(storyLogs.every((l) => l.pipeline === "tts_narration")).toBe(true);
    expect(storyLogs.every((l) => !l.resolvedAudioUrl.includes("/infant-sleep-audio/"))).toBe(true);
    expect(poemLogs.every((l) => !l.resolvedAudioUrl.includes("/infant-sleep-audio/"))).toBe(true);

    const report = {
      timestamp: new Date().toISOString(),
      project: testInfo.project.name,
      test1_lullabies: {
        urls: lullabyUrls,
        sha256: lullabyHashes,
        uniqueHashes: hashSet.size,
      },
      test2_poems: ttsCalls.filter((c) => c.text.includes("baby") || c.text.includes("Pat") || c.text.includes("cloud")),
      test3_stories: ttsCalls.map((c) => ({ chars: c.text.length, preview: c.text.slice(0, 60) })),
      test4_playbackLogs: playbackLogs,
      dupWarnings,
    };

    writeFileSync(join(AUDIT_DIR, `audit-report-${testInfo.project.name}.json`), JSON.stringify(report, null, 2));
    writeFileSync(join(AUDIT_DIR, `console-${testInfo.project.name}.log`), consoleLines.join("\n"));

    expect(dupWarnings, "no false duplication warnings for distinct lullabies").toHaveLength(0);
  });

  test("TEST 5: iOS Safari — replay, pause, resume, next item", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "iOS Safari project only");

    const ttsCalls: TtsCall[] = [];
    await setupTtsMock(page, ttsCalls);
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "networkidle" });
    await primeAudioUnlock(page);

    await openTab(page, /^poems$/i);
    await page.getByTestId("poem-age-tab-0-6m").click();
    await page.getByTestId("poem-tile-poem-sleep-baby-sleep").click();
    await expect(page.getByTestId("poem-fullscreen-player")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(800);

    const pauseBtn = page.getByTestId("poem-play-pause");
    await expect(pauseBtn).toBeVisible();
    await pauseBtn.click();
    await page.waitForTimeout(500);
    await pauseBtn.click();
    await page.waitForTimeout(800);

    await page.getByTestId("poem-fullscreen-close").click();
    await page.getByTestId("poem-tile-poem-hush-little-cloud").click();
    await page.waitForTimeout(1200);

    expect(ttsCalls.length).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: join(AUDIT_DIR, "test5-ios-safari-poems.png"), fullPage: true });
  });

  test("TEST 6: offline mode — lullaby works, TTS graceful failure", async ({ page, context }) => {
    const ttsCalls: TtsCall[] = [];
    await setupTtsMock(page, ttsCalls);
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "networkidle" });
    await primeAudioUnlock(page);

    await openTab(page, /^lullabies$/i);
    // Warm bundled MP3 into browser cache while online.
    await page.getByTestId("sleep-track-tile-lul-twinkle").click();
    await page.waitForTimeout(1500);
    await page.getByTestId("sleep-track-fullscreen-player").getByLabel("Close player").click();
    await page.waitForTimeout(300);

    await context.setOffline(true);
    await page.getByTestId("sleep-track-tile-lul-twinkle").click();
    await expect(page.getByTestId("sleep-track-fullscreen-player")).toBeVisible({ timeout: 10_000 });

    await openTab(page, /^poems$/i);
    await page.getByTestId("poem-age-tab-0-6m").click();
    await page.getByTestId("poem-tile-poem-sleep-baby-sleep").click();
    await page.waitForTimeout(2000);

    const errorVisible = await page.getByTestId("poem-error").isVisible().catch(() => false);
    const crashOverlay = await page.locator("#amynest-crash-overlay").count();
    expect(crashOverlay).toBe(0);
    expect(errorVisible || ttsCalls.length === 0, "poem shows error or TTS blocked offline").toBe(true);

    await context.setOffline(false);
    await page.screenshot({ path: join(AUDIT_DIR, "test6-offline.png"), fullPage: true });
  });

  test("TEST 7: duplication guard", async ({ page }) => {
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "domcontentloaded" });

    const noDup = await page.evaluate(() => {
      window.__infantSleepAudit?.resetTrace();
      const a = window.__infantSleepAudit!.warnDuplication(
        "lul-twinkle",
        "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3",
      );
      const b = window.__infantSleepAudit!.warnDuplication(
        "lul-brahms",
        "/infant-sleep-audio/packs/core-v1/lullabies/brahms.mp3",
      );
      const c = window.__infantSleepAudit!.warnDuplication(
        "lul-twinkle",
        "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3",
      );
      return { a, b, c };
    });
    expect(noDup.a).toBe(false);
    expect(noDup.b).toBe(false);
    expect(noDup.c).toBe(false);

    const dup = await page.evaluate(() => {
      window.__infantSleepAudit?.resetTrace();
      window.__infantSleepAudit!.warnDuplication("lul-twinkle", "/same.mp3");
      return window.__infantSleepAudit!.warnDuplication("lul-brahms", "/same.mp3");
    });
    expect(dup).toBe(true);
  });

  test("TEST 8: memory — back-to-back playback", async ({ page }) => {
    const ttsCalls: TtsCall[] = [];
    await setupTtsMock(page, ttsCalls);
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "networkidle" });
    await primeAudioUnlock(page);

    const before = await page.evaluate(() => ({
      audioCount: document.querySelectorAll("audio").length,
      heap: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
    }));

    await openTab(page, /^lullabies$/i);
    const lullabyTiles = ["lul-twinkle", "lul-brahms", "lul-rock-a-bye", "lul-hush-baby"];
    for (let round = 0; round < 3; round++) {
      for (const id of lullabyTiles) {
        await page.getByTestId(`sleep-track-tile-${id}`).click();
        await page.waitForTimeout(400);
        const close = page.getByTestId("sleep-track-fullscreen-player").getByLabel("Close player");
        if (await close.isVisible()) await close.click();
      }
    }

    await openTab(page, /^poems$/i);
    const poemRuns: { id: string; ageTab: string }[] = [
      { id: "poem-sleep-baby-sleep", ageTab: "0-6m" },
      { id: "poem-hush-little-cloud", ageTab: "0-6m" },
      { id: "poem-moon-and-me", ageTab: "0-6m" },
    ];
    for (const { id, ageTab } of poemRuns) {
      await page.getByTestId(`poem-age-tab-${ageTab}`).click();
      await page.waitForTimeout(200);
      await page.getByTestId(`poem-tile-${id}`).click();
      await page.waitForTimeout(400);
      await page.getByTestId("poem-fullscreen-close").click();
    }

    await openTab(page, /^stories$/i);
    const storyRuns = [
      { id: "story-moon-blanket", ageTab: "6-12m" },
      { id: "story-cloud-pillow", ageTab: "6-12m" },
      { id: "story-star-friend", ageTab: "12-24m" },
    ];
    for (const { id, ageTab } of storyRuns) {
      await page.getByTestId(`sleep-age-tab-${ageTab}`).click();
      await page.waitForTimeout(200);
      await page.getByTestId(`sleep-track-tile-${id}`).click();
      await page.waitForTimeout(400);
      const close = page.getByTestId("sleep-track-fullscreen-player").getByLabel("Close player");
      if (await close.isVisible()) await close.click();
    }

    const after = await page.evaluate(() => ({
      audioCount: document.querySelectorAll("audio").length,
      pausedOrEmpty: Array.from(document.querySelectorAll("audio")).filter(
        (a) => a.paused || !a.src,
      ).length,
      heap: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
    }));

    expect(after.audioCount, "audio elements bounded").toBeLessThan(15);
    expect(after.pausedOrEmpty, "no orphaned playing audio").toBeGreaterThanOrEqual(after.audioCount - 2);

    writeFileSync(
      join(AUDIT_DIR, "test8-memory.json"),
      JSON.stringify({ before, after, ttsCallCount: ttsCalls.length }, null, 2),
    );
  });
});
