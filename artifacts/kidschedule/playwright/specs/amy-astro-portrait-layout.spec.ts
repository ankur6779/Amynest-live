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

async function collectPortraitRequests(page: Page) {
  const requests: { url: string; resourceType: string }[] = [];
  page.on("request", (req) => {
    if (/amy-astro-portrait/i.test(req.url())) {
      requests.push({ url: req.url(), resourceType: req.resourceType() });
    }
  });
  return requests;
}

async function assertClearsFab(page: Page, locator: Locator, fab: Locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
  const box = await clientBox(locator);
  const fabBox = await clientBox(fab);
  expect(overlap(box, fabBox)).toBe(false);
  return { box, fabBox };
}

test.describe("Amy Astronomy portrait layout", () => {
  for (const vp of VIEWPORTS) {
    test(`layout holds at ${vp.name}`, async ({ page }) => {
      const portraitRequests = await collectPortraitRequests(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openAstronomy(page);

      const hero = page.locator(
        '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="hero"]',
      );
      const closing = page.locator(
        '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="closing"]',
      );
      const heroImg = hero.locator("img.amy-astro-portrait-illustration");
      const save = page.getByTestId("amy-astro-portrait-save-memory");
      const ask = page.getByTestId("amy-astro-portrait-ask-amy");
      const cont = page.getByTestId("amy-astro-portrait-continue");
      const disclaimer = page.getByTestId("amy-astro-portrait-disclaimer");
      const tagline = page.getByTestId("amy-astro-portrait-tagline");
      const cluster = page.getByTestId("amy-astro-portrait-cta-cluster");
      const fab = page.getByTestId("mock-amy-fab");
      const tabbar = page.getByTestId("mock-tabbar");

      await expect(hero).toBeVisible();
      await expect(heroImg).toBeVisible();
      await expect(closing).toBeVisible();
      await expect(save).toBeVisible();
      await expect(disclaimer).toBeVisible();

      const metrics = await heroImg.evaluate((img: HTMLImageElement) => {
        const frame = img.closest("[data-testid='amy-astro-cosmic-portrait']") as HTMLElement;
        const art = img.closest(".amy-astro-portrait-frame__art") as HTMLElement;
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
          currentSrc: img.currentSrc,
          loading: img.loading,
          viewportWidth: window.innerWidth,
        };
      });

      const closingMetrics = await closing.locator("img.amy-astro-portrait-illustration").evaluate(
        (img: HTMLImageElement) => ({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedWidth: img.getBoundingClientRect().width,
          renderedHeight: img.getBoundingClientRect().height,
          currentSrc: img.currentSrc,
          loading: img.loading,
        }),
      );

      expect(metrics.naturalWidth).toBeGreaterThan(0);
      expect(metrics.naturalHeight).toBeGreaterThan(0);
      expect(metrics.currentSrc).toMatch(/amy-astro-portrait-(?:384|768)\.webp|amy-astro-portrait\.png/);
      expect(metrics.objectFit).toBe("contain");
      expect(metrics.objectPosition === "center" || metrics.objectPosition === "50% 50%").toBe(true);
      expect(metrics.renderedWidth).toBeGreaterThan(vp.width < 640 ? 240 : 160);
      expect(metrics.renderedWidth / metrics.artWidth).toBeGreaterThan(0.92);
      expect(Math.abs(metrics.renderedWidth / metrics.renderedHeight - 1)).toBeLessThan(0.08);
      expect(metrics.loading).toBe("eager");
      expect(closingMetrics.loading).toBe("lazy");

      const heroBox = await clientBox(hero);
      const closingBox = await clientBox(closing);
      expect(closingBox.width).toBeLessThan(heroBox.width);
      expect(closingBox.width).toBeGreaterThan(148);
      expect(Math.abs(closingBox.width - 192)).toBeLessThan(8);
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

      const clusterClass = await cluster.getAttribute("class");
      expect(clusterClass ?? "").toContain("amynest-fab-avoid");

      const disclaimerRead = await disclaimer.evaluate((el) => {
        const cs = getComputedStyle(el);
        return {
          text: (el.textContent ?? "").trim(),
          overflow: cs.overflow,
          textOverflow: cs.textOverflow,
          whiteSpace: cs.whiteSpace,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        };
      });
      expect(disclaimerRead.text).toBe("This is for awareness and reflection, not prediction.");
      expect(disclaimerRead.textOverflow).not.toBe("ellipsis");
      expect(disclaimerRead.whiteSpace).not.toBe("nowrap");
      expect(disclaimerRead.scrollWidth).toBeLessThanOrEqual(disclaimerRead.clientWidth + 1);

      if (vp.width <= 768) {
        await assertClearsFab(page, ask, fab);
        await assertClearsFab(page, cont, fab);
        await assertClearsFab(page, tagline, fab);
        const disclaimerClear = await assertClearsFab(page, disclaimer, fab);
        expect(disclaimerClear.box.width).toBeGreaterThan(40);
      }

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
        await disclaimer.evaluate((el) => el.scrollIntoView({ block: "center", inline: "nearest" }));
        await page.screenshot({
          path: `${ARTIFACT_DIR}/amy_astronomy_disclaimer_fab_390.png`,
        });
      }
      await page.screenshot({
        path: `${ARTIFACT_DIR}/amy_astronomy_layout_${vp.name}.png`,
        fullPage: true,
      });
      writeFileSync(
        `${ARTIFACT_DIR}/amy_astronomy_metrics_${vp.name}.json`,
        JSON.stringify(
          {
            viewport: vp,
            metrics,
            closingMetrics,
            heroBox,
            closingBox,
            saveBox,
            fabBox,
            portraitRequests,
          },
          null,
          2,
        ),
      );
    });
  }

  test("lossless WebP variants decode at file pixel size", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playwright-amy-astro-visual.html?mode=layout", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const probe = await page.evaluate(async () => {
      async function inspect(url: string) {
        const res = await fetch(url);
        const bytes = (await res.arrayBuffer()).byteLength;
        const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = () => reject(new Error(`decode failed ${url}`));
          img.src = url;
        });
        return { url, status: res.status, type: res.headers.get("content-type"), bytes, ...dims };
      }
      return {
        png: await inspect("/illustrations/amy-astro/amy-astro-portrait.png?v=20260727a"),
        webp384: await inspect("/illustrations/amy-astro/amy-astro-portrait-384.webp?v=20260918a"),
        webp768: await inspect("/illustrations/amy-astro/amy-astro-portrait-768.webp?v=20260918a"),
      };
    });
    expect(probe.png.status).toBe(200);
    expect(probe.png.bytes).toBe(609084);
    expect(probe.png.width).toBe(768);
    expect(probe.png.height).toBe(768);
    expect(probe.webp384.status).toBe(200);
    expect(probe.webp384.bytes).toBe(137508);
    expect(probe.webp384.width).toBe(384);
    expect(probe.webp384.height).toBe(384);
    expect(probe.webp768.status).toBe(200);
    expect(probe.webp768.bytes).toBe(462540);
    expect(probe.webp768.width).toBe(768);
    expect(probe.webp768.height).toBe(768);
    mkdirSync(ARTIFACT_DIR, { recursive: true });
    writeFileSync(`${ARTIFACT_DIR}/amy_astronomy_image_performance.json`, JSON.stringify(probe, null, 2));
  });

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

test.describe("Hub tile → Astronomy journey", () => {
  for (const vp of VIEWPORTS) {
    test(`hub cutout opens the portrait module at ${vp.name}`, async ({ page }) => {
      mkdirSync(ARTIFACT_DIR, { recursive: true });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(
        `/playwright-amy-astro-visual.html?mode=layout&from=hub&name=${encodeURIComponent("Child 2")}`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      const tile = page.getByTestId("amy-astro-hub-tile");
      await expect(tile).toBeVisible({ timeout: 20_000 });
      const hubImg = page.locator(".amy-astro-launch-card .hub-feature-tile__hero");
      await expect(hubImg).toBeVisible();
      const hubSrc = await hubImg.getAttribute("src");
      expect(hubSrc ?? "").toContain("amy-astro-hero.png");
      expect(hubSrc ?? "").not.toContain("amy-astro-portrait.png");

      if (vp.name === "mobile_390" || vp.name === "tablet_768" || vp.name === "desktop_1440") {
        await page.screenshot({
          path: `${ARTIFACT_DIR}/amy_astronomy_hub_tile_${vp.name}.png`,
        });
      }

      await tile.click();
      await expect(page.getByTestId("amy-astro-cosmic-portrait-card")).toBeVisible({ timeout: 20_000 });
      const moduleImg = page.locator(
        '[data-testid="amy-astro-cosmic-portrait"][data-portrait-presentation="hero"] img',
      );
      await expect(moduleImg).toBeVisible();
      const moduleSrc = await moduleImg.getAttribute("src");
      expect(moduleSrc ?? "").toContain("amy-astro-portrait.png");
      expect(moduleSrc ?? "").not.toContain("amy-astro-hero.png");

      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(overflowX).toBe(false);

      if (vp.name === "mobile_390") {
        await moduleImg.evaluate((el) => el.scrollIntoView({ block: "start" }));
        await page.screenshot({
          path: `${ARTIFACT_DIR}/amy_astronomy_hub_to_module_390.png`,
        });
      }
    });
  }
});
