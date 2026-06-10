#!/usr/bin/env node
/**
 * Post-deploy audio recovery validation — production runtime evidence.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in").replace(/\/$/, "");
const EMAIL = process.env.STRESS_TEST_EMAIL ?? "demo@amynest.in";
const PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "AmyNest@2025";
const OUT_DIR = join(process.cwd(), "playwright", "post-deploy-audio-recovery-artifacts");

async function primeGesture(page) {
  await page.locator("body").click({ position: { x: 12, y: 12 }, force: true });
  await page.waitForTimeout(150);
}

const FEATURES = [
  {
    id: "parent_hub_story",
    label: "Parent Hub Story",
    async trigger(page) {
      await page.goto(`${BASE}/parenting-hub`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(3000);
      await primeGesture(page);
      const readAloud = page.getByRole("button", { name: /read aloud/i }).first();
      if (await readAloud.isVisible({ timeout: 12_000 }).catch(() => false)) {
        await readAloud.click({ timeout: 10_000 });
        return;
      }
      const article = page.locator('[data-testid^="article-card-"]').first();
      await article.click({ timeout: 12_000 });
      await page.waitForTimeout(800);
      await page.getByTestId("listen-article-btn").click({ timeout: 12_000 });
    },
  },
  {
    id: "amy_coach",
    label: "Amy Coach",
    async trigger(page) {
      await page.goto(`${BASE}/amy-coach`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(3500);
      await primeGesture(page);
      const btn = page.getByTestId("coach-listen-btn");
      await btn.click({ timeout: 20_000 });
    },
  },
  {
    id: "conversation_coach",
    label: "Conversation Coach",
    async trigger(page) {
      await page.goto(`${BASE}/speech-coach/talk`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(3000);
      await primeGesture(page);
      const start = page.getByRole("button", { name: /start|begin|let's talk|practice/i }).first();
      if (await start.isVisible({ timeout: 12_000 }).catch(() => false)) {
        await start.click({ timeout: 10_000 });
      }
    },
  },
  {
    id: "speech_coach",
    label: "Speech Coach",
    async trigger(page) {
      await page.goto(`${BASE}/speech-coach/live`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(3000);
      await primeGesture(page);
      const start = page.getByRole("button", { name: /start|practice|tap to|begin/i }).first();
      if (await start.isVisible({ timeout: 12_000 }).catch(() => false)) {
        await start.click({ timeout: 10_000 });
      }
    },
  },
  {
    id: "infant_story",
    label: "Infant Story",
    async trigger(page) {
      await page.goto(`${BASE}/parenting-hub`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => {
        document.getElementById("infant-sounds")?.scrollIntoView({ block: "center" });
        document.getElementById("tile-infant-hub")?.scrollIntoView({ block: "center" });
      });
      await page.waitForTimeout(800);
      await primeGesture(page);
      const lullabiesTab = page.getByRole("button", { name: /lullab/i }).first();
      if (await lullabiesTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await lullabiesTab.click();
      }
      const tile = page.locator('[data-testid^="sleep-track-tile-"]').first();
      await tile.click({ timeout: 15_000 });
      await page.waitForTimeout(1200);
      const play = page.locator('[data-testid="sleep-track-fullscreen-player"] button').filter({ hasText: /play|pause/i }).first();
      if (await play.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await play.click();
      }
    },
  },
  {
    id: "infant_poem",
    label: "Infant Poem",
    async trigger(page) {
      await page.goto(`${BASE}/parenting-hub`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.getElementById("tile-infant-hub")?.scrollIntoView({ block: "center" }));
      await primeGesture(page);
      const poemTile = page.locator('[data-testid^="poem-tile-"]').first();
      if (await poemTile.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await poemTile.click({ timeout: 12_000 });
        return;
      }
      const readAloud = page.getByRole("button", { name: /read aloud|aloud/i }).first();
      await readAloud.click({ timeout: 12_000 });
    },
  },
  {
    id: "audio_lesson",
    label: "Audio Lesson",
    async trigger(page) {
      await page.goto(`${BASE}/audio-lessons`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(1500);
      await primeGesture(page);
      await page.getByTestId("age-tile-2-4").click({ timeout: 20_000 });
      await page.waitForTimeout(800);
      await page.getByTestId(/lesson-card-/).first().click({ timeout: 20_000 });
      await page.waitForTimeout(1000);
      await page.getByRole("button", { name: "Play" }).click({ timeout: 20_000 });
    },
  },
  {
    id: "phonics",
    label: "Phonics",
    async trigger(page) {
      await page.goto(`${BASE}/phonics`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(2500);
      await primeGesture(page);
      const tile = page.locator('[data-testid^="phonics-tile-"]').first();
      if (await tile.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await tile.click({ timeout: 12_000 });
        return;
      }
      await page.getByTestId("phonics-primary-cta").click({ timeout: 12_000 }).catch(() => {});
      await page.locator('[data-testid^="phonics-tile-"]').first().click({ timeout: 12_000 });
    },
  },
];

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }
  await emailInput.fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"), {
    timeout: 120_000,
  });
  for (let i = 0; i < 3; i++) {
    const yes = page.getByRole("button", { name: /Yes, that's right/i });
    if (!(await yes.isVisible({ timeout: 2_000 }).catch(() => false))) break;
    await yes.click({ force: true });
    await page.waitForTimeout(600);
  }
  await page.waitForFunction(() => window.__amynestAppCoreReady === true, { timeout: 45_000 }).catch(() => {});
}

async function measureAudio(page) {
  return page.evaluate(async () => {
    const mgr = window.__amynestAudioManagerRef;
    const pick = () => {
      const fromMgr = mgr?.getCurrentElement?.() ?? null;
      if (fromMgr?.src) return fromMgr;
      const dom = Array.from(document.querySelectorAll("audio")).find((a) => a.src);
      return dom ?? null;
    };

    let audio = null;
    for (let i = 0; i < 12; i++) {
      audio = pick();
      if (audio?.src) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!audio?.src) {
      return { ok: false, reason: "no_audio_element", checks: { elementExists: false } };
    }

    let playResolved = false;
    let playError = null;
    if (audio.paused) {
      try {
        await audio.play();
        playResolved = true;
      } catch (e) {
        playError = e instanceof Error ? e.message : String(e);
        if (!audio.paused || audio.currentTime > 0) playResolved = true;
      }
    } else {
      playResolved = true;
    }

    await new Promise((r) => setTimeout(r, 2000));
    const t1 = audio.currentTime;
    await new Promise((r) => setTimeout(r, 500));
    const t2 = audio.currentTime;
    const dur = audio.duration;
    const durationOk = (Number.isFinite(dur) && dur > 0) || dur === Infinity;
    const currentTimeOk = t1 > 0;
    const advancing = t2 > t1 || (!audio.paused && t2 >= t1 && t1 > 0);
    const audible = currentTimeOk && (advancing || (!audio.paused && t1 > 0.02));

    return {
      ok: playResolved && currentTimeOk && durationOk && audible,
      reason: !playResolved
        ? `play_failed:${playError}`
        : !currentTimeOk
          ? "currentTime_zero"
          : !durationOk
            ? "invalid_duration"
            : !audible
              ? "not_audible"
              : "ok",
      checks: {
        elementExists: true,
        playResolved,
        currentTimeAfter2s: t1,
        currentTimeAdvancing: advancing,
        duration: dur,
        durationOk,
        paused: audio.paused,
        srcTail: (audio.src ?? "").slice(-80),
        readyState: audio.readyState,
        speechPlaying: mgr?.isSpeechPlaying?.() ?? null,
      },
    };
  });
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const healthRes = await fetch(`${BASE}/api/healthz/audio`);
  const health = await healthRes.json();

  const healthPass =
    health.status === "PASS" &&
    health.playback?.phase1BlobFallback === true &&
    health.env?.enableMseStreaming === "false";

  const consoleErrors = [];
  const pageErrors = [];
  const rejections = [];
  const mseErrors = [];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36 AmyNestAudioRecovery/1.0",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    consoleErrors.push(t);
    if (/MediaSource|SourceBuffer|mse_/i.test(t)) mseErrors.push(t);
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("requestfailed", () => {});
  await page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (e) => {
      window.__amynestUnhandledRejections = window.__amynestUnhandledRejections ?? [];
      window.__amynestUnhandledRejections.push(String(e.reason));
    });
  });

  await signIn(page);

  const featureResults = [];

  for (const feature of FEATURES) {
    const started = Date.now();
    let triggerError = null;
    try {
      await feature.trigger(page);
    } catch (e) {
      triggerError = e instanceof Error ? e.message : String(e);
    }
    const audio = await measureAudio(page);
    const unhandled = await page.evaluate(() => {
      const r = window.__amynestUnhandledRejections ?? [];
      window.__amynestUnhandledRejections = [];
      return r;
    });
    rejections.push(...unhandled);

    const pass = !triggerError && audio.ok;
    featureResults.push({
      feature: feature.label,
      id: feature.id,
      verdict: pass ? "PASS" : "FAIL",
      triggerError,
      audio,
      elapsedMs: Date.now() - started,
    });
    await page.waitForTimeout(800);
  }

  await browser.close();

  const report = {
    validatedAt: new Date().toISOString(),
    base: BASE,
    health: {
      verdict: healthPass ? "PASS" : "FAIL",
      status: health.status,
      phase1BlobFallback: health.playback?.phase1BlobFallback,
      enableMseStreaming: health.env?.enableMseStreaming,
      mseStreamingActive: health.playback?.mseStreamingActive,
      streamProbe: health.tts?.streamProbe,
    },
    global: {
      consoleErrors: consoleErrors.slice(0, 30),
      pageErrors,
      unhandledRejections: rejections.slice(0, 20),
      mseErrors,
      noConsoleErrors: consoleErrors.length === 0,
      noUnhandledRejections: rejections.length === 0,
      noMseExceptions: mseErrors.length === 0,
    },
    features: featureResults.map((f) => ({
      feature: f.feature,
      verdict: f.verdict,
      reason: f.triggerError ?? f.audio?.reason,
      checks: f.audio?.checks,
    })),
    overall:
      healthPass &&
      featureResults.every((f) => f.verdict === "PASS") &&
      consoleErrors.length === 0 &&
      rejections.length === 0 &&
      mseErrors.length === 0
        ? "PASS"
        : "FAIL",
  };

  writeFileSync(join(OUT_DIR, "report.json"), JSON.stringify({ ...report, detail: featureResults }, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.overall === "PASS" ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
