/**
 * Health Lab certification capture script — screenshots, console, motion, FPS.
 * Run: npx playwright test playwright/specs/health-lab-certification-capture.spec.ts --config playwright.config.health-lab.ts
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../../../../audit/health-lab-certification-screenshots");
const CHILD_ID = 42;

function mockHealthLabApi(page: Page) {
  let serverProfile: Record<string, unknown> | null = null;
  return page.route("**/api/health-lab/**", async (route: Route) => {
    const req = route.request();
    const url = req.url();
    if (req.method() === "GET" && url.includes("/profile/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/dashboard/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, dashboard: { sessions: 0, streakDays: 0, level: 1, totalXp: 0 } }),
      });
      return;
    }
    if (req.method() === "GET" && url.includes("/history/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, history: serverProfile?.gameHistory ?? [] }),
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

async function setupConsole(page: Page) {
  const logs = { errors: [] as string[], warnings: [] as string[] };
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") logs.errors.push(text);
    if (msg.type() === "warning") logs.warnings.push(text);
  });
  page.on("pageerror", (err) => logs.errors.push(err.message));
  return logs;
}

async function sampleFps(page: Page, label: string, ms = 3000): Promise<{ label: string; fps: number; metrics: Record<string, number> }> {
  await page.evaluate(() => {
    (window as unknown as { __fpsFrames: number; __fpsStart: number }).__fpsFrames = 0;
    (window as unknown as { __fpsStart: number }).__fpsStart = performance.now();
    const tick = () => {
      (window as unknown as { __fpsFrames: number }).__fpsFrames++;
      (window as unknown as { __fpsRaf: number }).__fpsRaf = requestAnimationFrame(tick);
    };
    (window as unknown as { __fpsRaf: number }).__fpsRaf = requestAnimationFrame(tick);
  });
  await page.waitForTimeout(ms);
  const result = await page.evaluate((durationMs) => {
    cancelAnimationFrame((window as unknown as { __fpsRaf: number }).__fpsRaf);
    const frames = (window as unknown as { __fpsFrames: number }).__fpsFrames;
    const fps = Math.round((frames / durationMs) * 1000);
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      fps,
      jsHeapUsedMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : -1,
      jsHeapTotalMb: mem ? Math.round(mem.totalJSHeapSize / 1048576) : -1,
    };
  }, ms);
  return { label, fps: result.fps, metrics: result };
}

test.describe("Certification capture", () => {
  test("capture all screens + metrics", async ({ page }) => {
    test.setTimeout(180_000);
    await mockHealthLabApi(page);
    const logs = await setupConsole(page);

    await page.addInitScript(() => {
      localStorage.removeItem(`amynest_health_lab_v2_${42}`);
    });

    await page.goto(`/playwright-health-lab.html?childId=${CHILD_ID}&childName=Riya`);
    await page.waitForSelector("text=Amy Health Lab", { timeout: 30_000 });

    await page.screenshot({ path: path.join(OUT, "01-health-lab-home.png"), fullPage: true });

    async function openAdventure(title: string) {
      await page
        .getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) })
        .click();
      const ready = page.getByRole("button", { name: /I'm Ready!/i });
      if (await ready.isVisible().catch(() => false)) await ready.click();
    }

    // Balloon Journey
    await openAdventure("Balloon Journey Adventure");
    await page.screenshot({ path: path.join(OUT, "05-balloon-onboarding.png"), fullPage: true });
    await page.getByRole("button", { name: /Start Journey/i }).click();
    await expect(page.getByText("Hold time")).toBeVisible();
    await page.screenshot({ path: path.join(OUT, "05-balloon-journey-gameplay.png"), fullPage: true });
    const balloonFps = await sampleFps(page, "balloon");
    await page.getByRole("button", { name: "Exit" }).click();

    // Rocket Launch
    await openAdventure("Rocket Launch Academy");
    await page.screenshot({ path: path.join(OUT, "06-rocket-onboarding.png"), fullPage: true });
    await page.getByRole("button", { name: /Launch Mission/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "06-rocket-launch-gameplay.png"), fullPage: true });
    const rocketFps = await sampleFps(page, "rocket");
    await page.getByRole("button", { name: "Exit" }).click();

    // Crystal Garden
    await openAdventure("Crystal Garden Challenge");
    await page.screenshot({ path: path.join(OUT, "07-crystal-garden-onboarding.png"), fullPage: true });
    await page.getByRole("button", { name: /Start Dancing/i }).click();
    await expect(page.getByRole("heading", { name: "HOLD DEVICE STILL" })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, "07-crystal-garden-calibration.png"), fullPage: true });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(OUT, "07-crystal-garden-gameplay.png"), fullPage: true });
    await page.getByRole("button", { name: "Exit" }).click();

    // Crystal Core
    await openAdventure("Crystal Core Reactor");
    await page.screenshot({ path: path.join(OUT, "08-crystal-core-onboarding.png"), fullPage: true });
    await page.getByRole("button", { name: /Power Up Reactor/i }).click();
    await page.getByRole("button", { name: "Touch to Start" }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, "08-crystal-core-gameplay.png"), fullPage: true });
    await page.getByRole("button", { name: "Exit" }).click();

    // Sky Island + motion debug
    await openAdventure("Sky Island Survival");
    await page.screenshot({ path: path.join(OUT, "02-onboarding-sky-island.png"), fullPage: true });
    await page.getByRole("button", { name: /Start Survival/i }).click();
    await expect(page.getByRole("heading", { name: "HOLD DEVICE STILL" })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: path.join(OUT, "03-motion-calibration.png"), fullPage: true });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: path.join(OUT, "04-sky-island-gameplay.png"), fullPage: true });
    const skyFps = await sampleFps(page, "sky-island");

    const motionStill = await page.evaluate(() => {
      const el = document.body.innerText;
      const grab = (label: string) => {
        const m = el.match(new RegExp(`${label}\\s*([\\d.%a-z]+)`, "i"));
        return m?.[1] ?? "n/a";
      };
      return {
        tiltX: grab("Tilt X"),
        tiltY: grab("Tilt Y"),
        confidence: grab("Confidence"),
        tracking: grab("Tracking"),
        stability: grab("Stability"),
        mode: grab("Mode"),
      };
    });

    await page.waitForTimeout(12000);
    await page.screenshot({ path: path.join(OUT, "10-success-celebration.png"), fullPage: true });

    // Wellness dashboard (after at least one game)
    await page.getByRole("button", { name: "Home" }).click({ timeout: 5000 }).catch(() => {});
    await page.goto(`/playwright-health-lab.html?childId=${CHILD_ID}&childName=Riya`);
    await page.waitForSelector("text=Amy Health Lab");
    const grownUps = page.getByRole("button", { name: /For grown-ups/i });
    if (await grownUps.isVisible().catch(() => false)) await grownUps.click();
    await page.getByText("Amy Wellness Report").click();
    await page.screenshot({ path: path.join(OUT, "09-wellness-onboarding.png"), fullPage: true });
    await page.getByRole("button", { name: /Open Dashboard|View Report/i }).click();
    await page.screenshot({ path: path.join(OUT, "09-wellness-dashboard.png"), fullPage: true });

    const report = {
      timestamp: new Date().toISOString(),
      console: logs,
      fps: [skyFps, balloonFps, rocketFps],
      motionStill,
    };

    await page.evaluate((data) => {
      (window as unknown as { __certReport: unknown }).__certReport = data;
    }, report);

    const fs = await import("node:fs/promises");
    await fs.writeFile(
      path.resolve(__dirname, "../../../../audit/health-lab-certification-report.json"),
      JSON.stringify(report, null, 2),
    );

    const ignorable = (e: string) =>
      e.includes("Voice features") || e.includes("AudioContext encountered an error");
    expect(logs.errors.filter((e) => !ignorable(e))).toEqual([]);
  });
});
