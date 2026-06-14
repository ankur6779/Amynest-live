/**
 * Gaming Hub — Maze Escape & Color Fill production certification (browser).
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { CertAudit } from "../helpers/cert-audit";

const SCREENSHOT_DIR = "certification/output/ui-screenshots";
const BASE = "/playwright-gaming-hub-certification.html";

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  const audit = new CertAudit();
  audit.attach(page);
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
});

test("Maze Escape — Easy / Normal / Hard visual difficulty", async ({ page }) => {
  const gridWidths: Record<string, number> = {};

  for (const level of ["easy", "normal", "hard"] as const) {
    await page.goto(`${BASE}?mode=maze-${level}`);
    await page.waitForSelector('[data-testid="gh-cert-maze"]', { timeout: 30_000 });
    await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 15_000 });
    await page.waitForTimeout(500);
    const grid = page.locator('[data-testid="maze-grid"]');
    await expect(grid).toBeVisible();
    const box = await grid.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    gridWidths[level] = box!.width;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `maze-${level}-ui.png`),
      fullPage: false,
    });
  }

  expect(gridWidths.hard).toBeGreaterThan(gridWidths.easy);
  expect(gridWidths.normal).toBeGreaterThan(gridWidths.easy * 0.9);
});

test("Color Fill — wrong answer shows error modal", async ({ page }) => {
  await page.goto(`${BASE}?mode=color-fill`);
  await page.waitForSelector('[data-testid="gh-cert-color-fill"]', { timeout: 30_000 });

  const gridCells = page.locator('[data-testid="color-fill-grid"] button');
  await expect(gridCells).toHaveCount(16, { timeout: 10_000 });

  for (let i = 0; i < 16; i++) {
    await gridCells.nth(i).click();
  }

  const checkBtn = page.getByRole("button", { name: /Check!/i });
  await expect(checkBtn).toBeVisible();
  await checkBtn.click();

  await expect(page.getByText(/Not Quite Right/i)).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/%/)).toBeVisible();
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "color-fill-error-modal.png"),
    fullPage: false,
  });
});

test("Color Fill — correct pattern shows success modal", async ({ page }) => {
  await page.goto(`${BASE}?mode=color-fill`);
  await page.waitForSelector('[data-testid="gh-cert-color-fill"]');

  await page.getByRole("button", { name: /Show Pattern/i }).click();

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = page.locator(`[data-testid="color-fill-cell-${r}-${c}"]`);
      const title = await cell.getAttribute("title");
      const colorName = title?.replace("Target: ", "").split(" ")[0];
      if (!colorName) continue;
      await page.locator(`button[title^="${colorName}"]`).first().click();
      await cell.click();
    }
  }

  await page.getByRole("button", { name: /Check!/i }).click();
  await expect(page.getByText(/Great Job!/i)).toBeVisible({ timeout: 8000 });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, "color-fill-success-modal.png"),
    fullPage: false,
  });
});

test("Performance — animation frame rate during maze display", async ({ page }) => {
  await page.goto(`${BASE}?mode=maze-hard`);
  await page.waitForSelector('[data-testid="maze-grid"]');

  const mazePerf = await page.evaluate(async () => {
    const frames: number[] = [];
    await new Promise<void>((resolve) => {
      let count = 0;
      const tick = (t: number) => {
        frames.push(t);
        if (++count >= 30) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const deltas = frames.slice(1).map((t, i) => t - frames[i]);
    const avgFrameMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return { avgFrameMs, estimatedFps: 1000 / avgFrameMs, mem: (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0 };
  });

  expect(mazePerf.estimatedFps).toBeGreaterThan(30);
});
