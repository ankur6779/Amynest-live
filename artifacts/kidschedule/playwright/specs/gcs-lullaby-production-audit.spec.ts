/**
 * Production GCS lullaby audit — real signed URLs, real GCS bucket.
 *
 * Requires local API with GCS credentials (production bucket):
 *   DATABASE_URL=... pnpm run dev:api
 *
 * Run:
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.gcs-lullaby-prod-audit.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import registry from "../../src/data/rhymes-gcs-registry.json" with { type: "json" };

const AUDIT_DIR = join(process.cwd(), "playwright", "gcs-lullaby-prod-audit-artifacts");
const API_ORIGIN = (process.env.PLAYWRIGHT_API_ORIGIN ?? "http://127.0.0.1:5010").replace(/\/$/, "");

type PlaybackMetrics = {
  audioId: string;
  label: string;
  signedUrlMs: number;
  audioStartMs: number | null;
  bufferingMs: number | null;
  gcsStatus: number | null;
  gcsHeaders: Record<string, string>;
  playbackSuccess: boolean;
  error: string | null;
  cached: boolean | null;
};

type AuditReport = {
  timestamp: string;
  project: string;
  apiOrigin: string;
  registryCount: number;
  metrics: PlaybackMetrics[];
  expiryTest: Record<string, unknown>;
  successRate: number;
};

const registryIds = registry.entries.map((e) => e.id);
const FIRST_ID = registryIds[0]!;
const FIFTH_ID = registryIds[4]!;
const RANDOM_ID = registryIds[Math.floor(registryIds.length * 0.37)]!;

async function fetchSignedUrl(page: Page, audioId: string): Promise<{
  signedUrl: string | null;
  elapsedMs: number;
  cached: boolean;
  status: number;
}> {
  const t0 = Date.now();
  const res = await page.request.get(`${API_ORIGIN}/api/audio/signed-url/${encodeURIComponent(audioId)}`);
  const elapsedMs = Date.now() - t0;
  if (!res.ok()) return { signedUrl: null, elapsedMs, cached: false, status: res.status() };
  const body = (await res.json()) as { success?: boolean; signedUrl?: string; cached?: boolean };
  return {
    signedUrl: body.success ? body.signedUrl ?? null : null,
    elapsedMs,
    cached: Boolean(body.cached),
    status: res.status(),
  };
}

async function probeGcsHeaders(page: Page, signedUrl: string) {
  const res = await page.request.fetch(signedUrl, { method: "HEAD" });
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(res.headers())) headers[k.toLowerCase()] = v;
  return { status: res.status(), headers };
}

async function measureAudioPlayback(page: Page, signedUrl: string, timeoutMs = 15_000): Promise<{
  audioStartMs: number | null;
  bufferingMs: number | null;
  success: boolean;
  error: string | null;
}> {
  return page.evaluate(async (url) => {
    return new Promise<{ audioStartMs: number | null; bufferingMs: number | null; success: boolean; error: string | null }>((resolve) => {
      const audio = new Audio();
      const t0 = performance.now();
      let bufferingMs: number | null = null;
      let started = false;

      const finish = (success: boolean, error: string | null) => {
        audio.pause();
        audio.src = "";
        resolve({
          audioStartMs: started ? Math.round(performance.now() - t0) : null,
          bufferingMs: bufferingMs !== null ? Math.round(bufferingMs) : null,
          success,
          error,
        });
      };

      audio.addEventListener("loadeddata", () => {
        if (bufferingMs === null) bufferingMs = performance.now() - t0;
      });
      audio.addEventListener("playing", () => {
        started = true;
        setTimeout(() => finish(true, null), 400);
      }, { once: true });
      audio.addEventListener("error", () => {
        const mediaError = audio.error;
        finish(false, mediaError?.message ?? "MEDIA_ELEMENT_ERROR");
      }, { once: true });

      audio.src = url;
      audio.play().catch((err: Error) => finish(false, err.message));
      setTimeout(() => finish(false, "timeout_15s"), timeoutMs);
    });
  }, signedUrl);
}

async function playLullabyInApp(page: Page, testId: string): Promise<void> {
  await page.getByRole("tab", { name: /^lullabies$/i }).click();
  await page.waitForTimeout(400);
  await page.getByTestId(`sleep-track-tile-${testId}`).click();
  await page.waitForTimeout(1500);
}

async function runLullabyScenario(
  page: Page,
  audioId: string,
  label: string,
): Promise<PlaybackMetrics> {
  const signed = await fetchSignedUrl(page, audioId);
  expect(signed.status, `${label} signed URL API`).toBe(200);
  expect(signed.signedUrl, `${label} signedUrl present`).toBeTruthy();

  const gcs = await probeGcsHeaders(page, signed.signedUrl!);
  expect(gcs.status, `${label} GCS HEAD`).toBe(200);

  const playback = await measureAudioPlayback(page, signed.signedUrl!);

  return {
    audioId,
    label,
    signedUrlMs: signed.elapsedMs,
    audioStartMs: playback.audioStartMs,
    bufferingMs: playback.bufferingMs,
    gcsStatus: gcs.status,
    gcsHeaders: {
      "content-type": gcs.headers["content-type"] ?? "",
      "content-length": gcs.headers["content-length"] ?? "",
      "accept-ranges": gcs.headers["accept-ranges"] ?? "",
      "access-control-allow-origin": gcs.headers["access-control-allow-origin"] ?? "(none)",
    },
    playbackSuccess: playback.success,
    error: playback.error,
    cached: signed.cached,
  };
}

test.describe("GCS lullaby production audit", () => {
  test.beforeAll(() => {
    mkdirSync(AUDIT_DIR, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "networkidle" });
    await page.locator("body").click({ position: { x: 8, y: 8 } });
  });

  test("lullaby playback matrix — real GCS signed URLs", async ({ page }, testInfo) => {
    const metrics: PlaybackMetrics[] = [];

    metrics.push(await runLullabyScenario(page, FIRST_ID, "first-lullaby"));
    await page.screenshot({ path: join(AUDIT_DIR, `first-${testInfo.project.name}.png`), fullPage: true });

    metrics.push(await runLullabyScenario(page, FIFTH_ID, "fifth-lullaby"));

    metrics.push(await runLullabyScenario(page, RANDOM_ID, "random-lullaby"));
    await page.screenshot({ path: join(AUDIT_DIR, `random-${testInfo.project.name}.png`), fullPage: true });

    // In-app playback (first lullaby)
    await playLullabyInApp(page, FIRST_ID);
    await expect(page.getByTestId("sleep-track-fullscreen-player")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: join(AUDIT_DIR, `in-app-player-${testInfo.project.name}.png`), fullPage: true });

    const passed = metrics.filter((m) => m.playbackSuccess).length;
    const report: AuditReport = {
      timestamp: new Date().toISOString(),
      project: testInfo.project.name,
      apiOrigin: API_ORIGIN,
      registryCount: registry.count,
      metrics,
      expiryTest: {},
      successRate: passed / metrics.length,
    };
    writeFileSync(join(AUDIT_DIR, `report-${testInfo.project.name}.json`), JSON.stringify(report, null, 2));

    expect(metrics.every((m) => m.gcsStatus === 200), "no GCS 403/4xx").toBe(true);
    expect(metrics.every((m) => m.playbackSuccess), "all playback scenarios succeed").toBe(true);
  });

  test("background + visibility resume", async ({ page }, testInfo) => {
    const signed = await fetchSignedUrl(page, FIRST_ID);
    expect(signed.signedUrl).toBeTruthy();

    const result = await page.evaluate(async (url) => {
      const audio = new Audio(url);
      audio.loop = true;
      await audio.play();
      await new Promise((r) => setTimeout(r, 600));
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 800));
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 400));
      const paused = audio.paused;
      if (!paused) await audio.play().catch(() => {});
      return { pausedAfterResume: audio.paused, currentTime: audio.currentTime };
    }, signed.signedUrl!);

    expect(result.pausedAfterResume, "audio resumes after visibility").toBe(false);
    await page.screenshot({ path: join(AUDIT_DIR, `visibility-${testInfo.project.name}.png`) });
  });

  test("slow network — signed URL + GCS stream", async ({ page, context }, testInfo) => {
    await context.route(/storage\.googleapis\.com/, async (route) => {
      await new Promise((r) => setTimeout(r, 350));
      await route.continue();
    });
    if (testInfo.project.name === "android-chrome") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        downloadThroughput: (400 * 1024) / 8,
        uploadThroughput: (400 * 1024) / 8,
        latency: 400,
      });
    }

    const m = await runLullabyScenario(page, RANDOM_ID, "slow-3g-random");
    // Re-measure with longer timeout under throttle
    if (!m.playbackSuccess && m.gcsStatus === 200) {
      const signed = await fetchSignedUrl(page, RANDOM_ID);
      if (signed.signedUrl) {
        const retry = await measureAudioPlayback(page, signed.signedUrl, 45_000);
        m.playbackSuccess = retry.success;
        m.audioStartMs = retry.audioStartMs;
        m.bufferingMs = retry.bufferingMs;
        m.error = retry.error;
      }
    }
    writeFileSync(join(AUDIT_DIR, `slow3g-${testInfo.project.name}.json`), JSON.stringify(m, null, 2));
    expect(m.gcsStatus).toBe(200);
    expect(m.playbackSuccess, "slow 3G eventually plays").toBe(true);
  });

  test("signed URL expiry + client refresh", async ({ page, request }, testInfo) => {
    // First URL from short-lived signing (server env set in webServer for API)
    const first = await fetchSignedUrl(page, FIRST_ID);
    expect(first.signedUrl).toBeTruthy();

    // Wait past short TTL (API started with RHYMES_SIGNED_URL_TTL_MS=8000)
    await page.waitForTimeout(10_000);

    const stalePlayback = await measureAudioPlayback(page, first.signedUrl!);

    const second = await fetchSignedUrl(page, FIRST_ID);
    expect(second.signedUrl).toBeTruthy();
    const freshPlayback = await measureAudioPlayback(page, second.signedUrl!);

    const expiryReport = {
      staleAfter10s: stalePlayback,
      refreshedUrl: second.cached,
      freshPlayback,
    };
    writeFileSync(join(AUDIT_DIR, `expiry-${testInfo.project.name}.json`), JSON.stringify(expiryReport, null, 2));

    expect(freshPlayback.success, "retry after expiry succeeds").toBe(true);
  });
});
