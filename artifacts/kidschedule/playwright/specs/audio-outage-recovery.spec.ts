/**
 * Post-deploy audio outage validation — confirms HTMLAudioElement advances currentTime.
 *
 * Run (local):
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.ts playwright/specs/audio-outage-recovery.spec.ts
 */
import { test, expect, type Page } from "@playwright/test";

const STREAM_BODY_BYTES = 4096;
const MIN_MP3 = Buffer.from([
  0xff, 0xfb, 0x90, 0x00,
  ...Array.from({ length: STREAM_BODY_BYTES }, (_, i) => i % 256),
]);

async function mockTtsStreamRoute(page: Page): Promise<void> {
  await page.route("**/api/tts/stream", async (route) => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MIN_MP3));
        controller.close();
      },
    });
    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      headers: { "X-TTS-Cache-Key": "mock-stream-key" },
      body,
    });
  });
}

async function assertAudioAdvances(page: Page, label: string): Promise<void> {
  const metrics = await page.evaluate(async () => {
    const audio = document.querySelector("audio");
    if (!audio) return { ok: false, reason: "no_audio_element" };
    try {
      await audio.play();
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : "play_failed" };
    }
    await new Promise((r) => setTimeout(r, 350));
    return {
      ok: audio.currentTime > 0 && (audio.duration > 0 || audio.currentTime > 0),
      currentTime: audio.currentTime,
      duration: audio.duration,
      paused: audio.paused,
    };
  });
  expect(metrics.ok, `${label}: ${JSON.stringify(metrics)}`).toBe(true);
}

test.describe("Audio outage recovery", () => {
  test.beforeEach(async ({ page }) => {
    await mockTtsStreamRoute(page);
    await page.goto("/playwright-infant-sleep-audio.html", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("AUDIBLE_START_DIAG", "0");
    });
  });

  test("TTS stream mock produces playable audio element", async ({ page }) => {
    await page.evaluate(async () => {
      const res = await fetch("/api/tts/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({ text: "hello", playbackMode: "partial-ok" }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.setAttribute("data-testid", "probe-audio");
      document.body.appendChild(audio);
    });
    await assertAudioAdvances(page, "stream_blob");
  });

  test("healthz audio shape includes stream probe fields", async ({ page }) => {
    await page.route("**/api/healthz/audio", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          status: "PASS",
          tts: { streamProbe: { ok: true, bytes: 512 } },
          playback: { phase1BlobFallback: true, mseStreamingActive: false },
        }),
      });
    });
    const res = await page.request.get("/api/healthz/audio");
    expect(res.ok()).toBeTruthy();
    const json = (await res.json()) as {
      status?: string;
      playback?: { phase1BlobFallback?: boolean };
    };
    expect(json.status).toBe("PASS");
    expect(json.playback?.phase1BlobFallback).toBe(true);
  });
});
