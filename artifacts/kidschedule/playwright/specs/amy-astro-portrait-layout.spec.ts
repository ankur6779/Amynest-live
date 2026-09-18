/**
 * Amy Astronomy portrait layout — DOM measurements, not screenshots alone.
 *
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.amy-astro-portrait.ts
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const VIEWPORTS = [
  { name: "mobile_390", width: 390, height: 844 },
  { name: "mobile_412", width: 412, height: 915 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "tablet_1024", width: 1024, height: 1366 },
  { name: "desktop_1440", width: 1440, height: 900 },
] as const;

const ARTIFACT_DIR = "/opt/cursor/artifacts";

type Box = { x: number; y: number; width: number; height: number; top: number; left: number; right: number; bottom: number };

function overlap(a: Box, b: Box): boolean {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

async function clientBox(locator: Locator): Promise<Box> {
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.top,
      left: r.left,
      right: r.right,
      bottom: r.bottom,
    };
  });
}

async function openAstronomy(page: Page, name = "Child 2") {
  await page.goto(`/playwright-amy-astro-visual.html?mode=layout&name=${encodeURIComponent(name)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByTestId("amy-astro-cosmic-portrait-card")).toBeVisible({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const img = document.querySelector(
      '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="hero"] img',
    ) as HTMLImageElement | null;
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });
}

test.describe("Amy Astronomy portrait layout", () => {
  for (const vp of VIEWPORTS) {
    test(`layout holds at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openAstronomy(page);

      const card = page.getByTestId("amy-astro-cosmic-portrait-card");
      const hero = page.locator(
        '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="hero"]',
      );
      const closing = page.locator(
        '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="closing"]',
      );
      const heroImg = hero.locator("img.amy-astro-portrait-illustration");
      const save = page.getByTestId("amy-astro-portrait-save-memory");
      const fab = page.getByTestId("mock-amy-fab");
      const tabbar = page.getByTestId("mock-tabbar");

      await expect(hero).toBeVisible();
      await expect(heroImg).toBeVisible();
      await expect(closing).toBeVisible();
      await expect(save).toBeVisible();

      const metrics = await heroImg.evaluate((img: HTMLImageElement) => {
        const frame = img.closest("[data-testid='amy-astro-cosmic-portrait']") as HTMLElement;
        const art = img.parentElement as HTMLElement;
        const ir = img.getBoundingClientRect();
        const ar = art.getBoundingClientRect();
        const fr = frame.getBoundingClientRect();
        const cs = getComputedStyle(img);
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: ir.width,
          renderedHeight: ir.height,
          artWidth: ar.width,
          artHeight: ar.height,
          frameWidth: fr.width,
          frameHeight: fr.height,
          objectFit: cs.objectFit,
          objectPosition: cs.objectPosition,
          overflow: getComputedStyle(art).overflow,
          viewportWidth: window.innerWidth,
        };
      });

      expect(metrics.naturalWidth).toBeGreaterThan(0);
      expect(metrics.naturalHeight).toBeGreaterThan(0);
      expect(metrics.objectFit).toBe("contain");
      expect(metrics.objectPosition === "center" || metrics.objectPosition === "50% 50%").toBe(true);
      expect(metrics.renderedWidth).toBeGreaterThan(vp.width < 640 ? 240 : 160);
      expect(metrics.renderedWidth / metrics.artWidth).toBeGreaterThan(0.92);
      expect(Math.abs(metrics.renderedWidth / metrics.renderedHeight - 1)).toBeLessThan(0.08);

      const heroBox = await clientBox(hero);
      const closingBox = await clientBox(closing);
      expect(closingBox.width).toBeLessThan(heroBox.width);
      expect(closingBox.width).toBeGreaterThan(148);
      if (vp.width < 640) {
        expect(closingBox.width).toBeLessThan(heroBox.width * 0.75);
      }

      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflowX).toBe(false);

      await save.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      const saveBox = await clientBox(save);
      const fabBox = await clientBox(fab);
      const tabBox = await clientBox(tabbar);
      expect(overlap(saveBox, fabBox)).toBe(false);
      expect(overlap(saveBox, tabBox)).toBe(false);
      expect(fabBox.width).toBeGreaterThan(40);
      expect(saveBox.width).toBeGreaterThan(40);
      expect(saveBox.height).toBeGreaterThanOrEqual(44);

      mkdirSync(ARTIFACT_DIR, { recursive: true });
      if (vp.name === "mobile_390") {
        await hero.evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: `${ARTIFACT_DIR}/amy_astronomy_hero_mobile_390.png`,
        });
      }
      await save.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
      if (vp.name === "mobile_390") {
        await page.screenshot({
          path: `${ARTIFACT_DIR}/amy_astronomy_cta_mobile_390.png`,
        });
      }
      await page.screenshot({
        path: `${ARTIFACT_DIR}/amy_astronomy_layout_${vp.name}.png`,
        fullPage: true,
      });
      writeFileSync(
        `${ARTIFACT_DIR}/amy_astronomy_metrics_${vp.name}.json`,
        JSON.stringify({ viewport: vp, metrics, heroBox, closingBox, saveBox, fabBox }, null, 2),
      );
    });
  }

  test("child switching updates Astronomy copy", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAstronomy(page, "Child 1");
    await expect(page.locator('h2[aria-label="Child 1"]')).toBeVisible();
    await page.getByTestId("amy-astro-switch-child-2").click();
    await expect(page.locator('h2[aria-label="Child 2"]')).toBeVisible();
    await expect(page.locator('h2[aria-label="Child 1"]')).toHaveCount(0);
    await expect(page.getByText(/I'll keep discovering new stars as Child 2 grows/i)).toBeVisible();
  });

  test("back navigation leaves Astronomy", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAstronomy(page);
    await page.getByTestId("birth-sky-back").click();
    await expect(page.getByTestId("amy-astro-layout-home")).toBeVisible();
    await expect(page.getByTestId("amy-astro-cosmic-portrait-card")).toHaveCount(0);
  });
});
