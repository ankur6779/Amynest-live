/**
 * RC2 — 20-minute soak + six-game performance matrix.
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installTimerProbes, measureGamePerf } from "../helpers/game-perf-metrics";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.resolve(__dirname, "../../../../audit");
const SOAK_MS = Number(process.env.RC2_SOAK_MS ?? 20 * 60 * 1000);
const SAMPLE_EVERY_MS = Number(process.env.RC2_SOAK_SAMPLE_MS ?? 2 * 60 * 1000);

function mockHealthLabApi(page: Page) {
  let serverProfile: Record<string, unknown> | null = null;
  return page.route("**/api/health-lab/**", async (route: Route) => {
    const req = route.request();
    if (req.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now(), dashboard: {}, history: [] }),
      });
      return;
    }
    if (req.method() === "POST") {
      const body = (req.postDataJSON() ?? {}) as Record<string, unknown>;
      if (body.profile) serverProfile = body.profile as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    await route.continue();
  });
}

async function gotoLab(page: Page) {
  await page.goto("/playwright-health-lab.html?childId=42&childName=Riya");
  await page.waitForSelector("text=Amy Health Lab", { timeout: 30_000 });
}

async function ensureHome(page: Page) {
  if (await page.getByText("Today's Adventures").isVisible().catch(() => false)) return;
  await gotoLab(page);
}

async function openAdventure(page: Page, title: string) {
  await ensureHome(page);
  await page.getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
  const ready = page.getByRole("button", { name: /I'm Ready!/i });
  if (await ready.isVisible().catch(() => false)) await ready.click();
}

async function readRuntimeState(page: Page) {
  return page.evaluate(() => {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const timers = (window as Window & { __ghTimers?: { timeouts: number; intervals: number; raf: number } })
      .__ghTimers;
    return {
      hostCount: document.querySelectorAll("[data-health-lab-immersive-host]").length,
      immersiveClass: document.documentElement.classList.contains("health-lab-immersive"),
      bodyOverflow: document.body.style.overflow,
      heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      activeTimeouts: timers?.timeouts ?? null,
      activeIntervals: timers?.intervals ?? null,
      activeRaf: timers?.raf ?? null,
    };
  });
}

async function invokeAppBack(page: Page) {
  return page.evaluate(async () => {
    const { invokePageBackHandler } = await import("../../src/lib/page-back-handler.ts");
    return invokePageBackHandler();
  });
}

function setupConsole(page: Page) {
  const logs = { errors: [] as string[], warnings: [] as string[] };
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") logs.errors.push(text);
    if (msg.type() === "warning") logs.warnings.push(text);
  });
  page.on("pageerror", (err) => logs.errors.push(err.message));
  return logs;
}

const ignorableError = (e: string) =>
  e.includes("Voice features") ||
  e.includes("AudioContext encountered an error") ||
  /startup-funnel|CORS policy|net::ERR_|amynest-dev\.onrender|Failed to load resource/i.test(e);

test.describe("RC2 blockers", () => {
  test("Escape closes motion prep and restores home", async ({ page }) => {
    await mockHealthLabApi(page);
    await gotoLab(page);
    await page.getByRole("button", { name: /Sky Island Survival/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Today's Adventures")).toBeVisible({ timeout: 10_000 });
    const state = await readRuntimeState(page);
    expect(state.hostCount).toBe(0);
    expect(state.immersiveClass).toBe(false);
  });

  test("six-game performance matrix", async ({ page }) => {
    test.setTimeout(300_000);
    await mockHealthLabApi(page);
    await installTimerProbes(page);
    await gotoLab(page);

    const matrix: Record<string, unknown>[] = [];

    async function profile(label: string, setup: () => Promise<void>) {
      await setup();
      await page.waitForTimeout(600);
      const perf = await measureGamePerf(page, 4000);
      matrix.push({
        game: label,
        avgFps: Math.round(perf.estimatedFps),
        worstFps: Math.round(1000 / Math.max(perf.p95FrameMs, 1)),
        jsHeapMb: Math.round(perf.heapUsed / 1048576),
        longTasksOver50ms: perf.longTasksOver50,
        droppedFramesOver33ms: perf.droppedFramesOver33ms,
        activeTimeouts: perf.activeTimeoutEstimate,
        activeIntervals: perf.activeIntervalEstimate,
        batteryAndroid: "N/A — requires physical Android WebView harness",
        cpu: "N/A — requires device profiler",
      });
    }

    await profile("home-idle", async () => gotoLab(page));
    await profile("breath-control", async () => {
      await openAdventure(page, "Balloon Journey Adventure");
      await page.getByRole("button", { name: /Start Journey/i }).click();
      await page.getByLabel("Hold to inflate balloon").click({ force: true });
    });
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await ensureHome(page);

    await profile("reaction-time", async () => {
      await openAdventure(page, "Rocket Launch Academy");
      await page.getByRole("button", { name: /Launch Mission/i }).click();
    });
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await ensureHome(page);

    await profile("finger-stability", async () => {
      await openAdventure(page, "Crystal Core Reactor");
      await page.getByRole("button", { name: /Power Up Reactor/i }).click();
      await page.getByRole("button", { name: "Touch to Start" }).click();
    });
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await ensureHome(page);

    await profile("flamingo-balance", async () => {
      await openAdventure(page, "Sky Island Survival");
      await page.getByRole("button", { name: /Start Survival/i }).click();
      await page.getByRole("heading", { name: "HOLD DEVICE STILL" }).waitFor({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3500);
    });
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await ensureHome(page);

    await profile("freeze-statue", async () => {
      await openAdventure(page, "Crystal Garden Challenge");
      await page.getByRole("button", { name: /Start Dancing/i }).click();
      await page.getByRole("heading", { name: "HOLD DEVICE STILL" }).waitFor({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3500);
    });
    await page.getByRole("button", { name: /^Exit$/i }).first().click();
    await ensureHome(page);

    await profile("calmness-meter", async () => {
      await ensureHome(page);
      const grownUps = page.getByRole("button", { name: /For grown-ups/i });
      if (await grownUps.isVisible().catch(() => false)) await grownUps.click();
      await page.getByText("Amy Wellness Report").click();
      await page.getByRole("button", { name: /Open Dashboard|View Report/i }).click();
    });

    fs.mkdirSync(AUDIT, { recursive: true });
    fs.writeFileSync(
      path.join(AUDIT, "health-lab-rc2-perf.json"),
      JSON.stringify({ generatedAt: new Date().toISOString(), sampleMs: 4000, games: matrix }, null, 2),
    );
    expect(matrix.length).toBe(7);
  });

  test("20-minute continuous gameplay soak", async ({ page }) => {
    test.setTimeout(SOAK_MS + 120_000);
    await mockHealthLabApi(page);
    await installTimerProbes(page);
    const logs = setupConsole(page);
    await page.addInitScript(() => localStorage.removeItem("amynest_health_lab_v2_42"));
    await gotoLab(page);

    const samples: Record<string, unknown>[] = [];
    const start = Date.now();
    let cycle = 0;
    let lastSample = start;
    let initialHeap = 0;

    while (Date.now() - start < SOAK_MS) {
      cycle += 1;
      await ensureHome(page);
      await page.getByRole("button", { name: /Balloon Journey Adventure/i }).click();
      await page.getByRole("button", { name: /Start Journey/i }).click();
      await page.getByLabel("Hold to inflate balloon").click({ force: true });
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: /^Exit$/i }).first().click();
      await ensureHome(page);

      const now = Date.now();
      if (now - lastSample >= SAMPLE_EVERY_MS || now - start >= SOAK_MS - 1000) {
        const state = await readRuntimeState(page);
        if (samples.length === 0 && state.heapMb != null) initialHeap = state.heapMb;
        samples.push({ elapsedMin: Math.round((now - start) / 60000), cycle, ...state });
        lastSample = now;
      }
    }

    await ensureHome(page);
    const final = await readRuntimeState(page);
    await invokeAppBack(page);
    const afterBack = await readRuntimeState(page);
    const heapGrowthMb = initialHeap > 0 && final.heapMb != null ? final.heapMb - initialHeap : null;

    const report = {
      generatedAt: new Date().toISOString(),
      soakMs: SOAK_MS,
      cycles: cycle,
      samples,
      final,
      afterBack,
      heapGrowthMb,
      console: logs,
      pass: {
        noHostLeak: final.hostCount === 0 && afterBack.hostCount === 0,
        scrollRestored: afterBack.bodyOverflow !== "hidden",
        heapGrowthUnder10Mb: heapGrowthMb == null || heapGrowthMb < 10,
        noHealthLabConsoleErrors: logs.errors.filter((e) => !ignorableError(e)).length === 0,
        noWarnings: logs.warnings.length === 0,
      },
    };

    fs.mkdirSync(AUDIT, { recursive: true });
    fs.writeFileSync(path.join(AUDIT, "health-lab-rc2-soak.json"), JSON.stringify(report, null, 2));

    expect(report.pass.noHostLeak).toBe(true);
    expect(report.pass.scrollRestored).toBe(true);
    expect(report.pass.noHealthLabConsoleErrors).toBe(true);
    expect(report.pass.heapGrowthUnder10Mb).toBe(true);
  });
});
