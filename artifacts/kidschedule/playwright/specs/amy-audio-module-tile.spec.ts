/**
 * Amy Audio module tile — visible, clickable, routes to /audio-lessons.
 */
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

const VIEWPORTS = [
  { name: "mobile_390", width: 390, height: 844 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1024", width: 1024, height: 768 },
  { name: "desktop_1440", width: 1440, height: 900 },
] as const;

test.describe("Amy Audio first-class module tile", () => {
  for (const vp of VIEWPORTS) {
    test(`renders a prominent module card at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-amy-audio-module-tile.html", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });

      const tile = page.getByTestId("amy-audio-lessons-card");
      await expect(tile).toBeVisible({ timeout: 20_000 });
      await expect(tile).toHaveAttribute("aria-label", /Amy Audio Lessons/i);
      await expect(page.getByText("Amy Audio Lessons")).toBeVisible();
      await expect(
        page.getByText(/Hands full\? Listen to age-curated parenting lessons/i),
      ).toBeVisible();
      await expect(page.getByText("Explore audio →")).toBeVisible();
      await expect(page.getByText("Listen later — quiet audio lessons")).toHaveCount(0);

      const box = await tile.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThan(280);
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflowX).toBe(false);

      mkdirSync("/opt/cursor/artifacts", { recursive: true });
      await page.screenshot({
        path: `/opt/cursor/artifacts/amy_audio_module_tile_${vp.name}.png`,
        fullPage: true,
      });
    });
  }

  test("clicking the tile opens the existing Audio Lessons path", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playwright-amy-audio-module-tile.html", {
      waitUntil: "domcontentloaded",
    });
    const tile = page.getByTestId("amy-audio-lessons-card");
    await expect(tile).toBeVisible();
    await tile.click();
    await expect(page.getByTestId("amy-audio-tile-href")).toHaveText("/audio-lessons");
    const href = await page.evaluate(() => {
      return (window as Window & { __amyAudioTileHref?: string }).__amyAudioTileHref;
    });
    expect(href).toBe("/audio-lessons");
  });
});
