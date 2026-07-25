/**
 * Birth Sky RC2 device/form-factor smoke — Pack 8 §1.5 kill switch + route gating.
 * Runs on Web / Pixel 5 / iPhone 13 / iPad Pro projects (see playwright.config.birth-sky-rc2.ts).
 */
import { test, expect } from "@playwright/test";

const MODULE_SURFACES = [
  "/birth-sky",
  "/birth-sky/welcome",
  "/birth-sky/app/sky",
  "/birth-sky/app/astronomy",
  "/birth-sky/app/tradition",
  "/birth-sky/app/reflect",
  "/birth-sky/settings",
  "/birth-sky/privacy",
  "/birth-sky/formation",
  "/birth-sky/reveal",
] as const;

test.describe("Birth Sky RC2 — kill switch & form-factor smoke", () => {
  test("startup: module surfaces unavailable when flag off", async ({ page }, testInfo) => {
    const t0 = Date.now();
    await page.goto("/birth-sky");
    await page.waitForLoadState("domcontentloaded");
    const startupMs = Date.now() - t0;
    testInfo.annotations.push({ type: "startup_ms", description: String(startupMs) });

    await expect(page.getByTestId("birth-sky-create")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-dashboard")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-settings")).toHaveCount(0);
  });

  for (const path of MODULE_SURFACES) {
    test(`flag off: ${path} does not expose Birth Sky chrome`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(400);
      await expect(page.getByTestId("birth-sky-dashboard")).toHaveCount(0);
      await expect(page.getByTestId("birth-sky-segment-nav")).toHaveCount(0);
      await expect(page.getByTestId("birth-sky-ai-sheet")).toHaveCount(0);
      await expect(page.getByTestId("birth-sky-ask-amy")).toHaveCount(0);
    });
  }

  test("lens marketplace inactive", async ({ page }) => {
    await page.goto("/birth-sky/marketplace");
    await page.waitForTimeout(300);
    await expect(page.getByText(/plugin store|marketplace/i)).toHaveCount(0);
  });

  test("reduced motion media query does not crash shell", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/birth-sky/app/sky");
    await page.waitForTimeout(300);
    await expect(page.getByTestId("birth-sky-dashboard")).toHaveCount(0);
  });
});
