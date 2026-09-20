/**
 * Amy FAB — responsive viewport containment.
 * Run: pnpm --filter @workspace/kidschedule test:e2e:amy-fab
 */
import { test, expect, type Page } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

const VIEWPORTS = [
  { width: 320, height: 568, label: "iphone-se" },
  { width: 360, height: 640, label: "android-narrow" },
  { width: 375, height: 667, label: "iphone-8" },
  { width: 390, height: 844, label: "iphone-12" },
  { width: 393, height: 852, label: "pixel" },
  { width: 412, height: 915, label: "android-common" },
  { width: 430, height: 932, label: "iphone-plus" },
  { width: 480, height: 1040, label: "phablet" },
  { width: 600, height: 960, label: "small-tablet" },
  { width: 768, height: 1024, label: "ipad-portrait" },
  { width: 820, height: 1180, label: "ipad-air" },
  { width: 375, height: 667, label: "iphone-8-dup" },
] as const;

const UNUSUAL = [
  { width: 320, height: 320, label: "square-short" },
  { width: 667, height: 375, label: "landscape-iphone" },
  { width: 844, height: 390, label: "landscape-iphone-12" },
  { width: 1024, height: 768, label: "landscape-ipad" },
  { width: 390, height: 624, label: "fold-cover-10-16" },
  { width: 768, height: 576, label: "fold-main-4-3" },
] as const;

const FOLDABLE_ANDROID = [
  { width: 412, height: 659, label: "fold-cover-css" },
  { width: 840, height: 630, label: "fold-main-css" },
  { width: 1248, height: 1972, label: "fold8-cover-display" },
  { width: 1848, height: 2448, label: "fold8-main-display" },
] as const;

type Box = { x: number; y: number; width: number; height: number };

function right(box: Box) {
  return box.x + box.width;
}

function bottom(box: Box) {
  return box.y + box.height;
}

async function openChrome(page: Page, androidShell = false) {
  await page.goto("/playwright-living-chrome.html", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.evaluate((shell) => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe", "has-tabbar");
    if (shell) {
      document.documentElement.classList.add("amynest-android-shell");
    } else {
      document.documentElement.classList.remove("amynest-android-shell");
    }
  }, androidShell);
  await page.waitForSelector('[data-testid="amy-fab-floating"]', {
    state: "visible",
    timeout: 30_000,
  });
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const fab = document.querySelector<HTMLElement>("[data-testid='amy-fab-floating']");
    const label = document.querySelector<HTMLElement>("[data-testid='amy-fab-label']");
    const nav = document.querySelector<HTMLElement>("[data-testid='mobile-tab-bar']");
    const hit = document.querySelector<HTMLElement>(".amy-fab-hit");
    const fabBox = fab?.getBoundingClientRect();
    const labelBox = label?.getBoundingClientRect();
    const navBox = nav?.getBoundingClientRect();
    const hitBox = hit?.getBoundingClientRect();
    const cs = fab ? getComputedStyle(fab) : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      fabDisplay: cs?.display ?? "",
      fab: fabBox
        ? { x: fabBox.x, y: fabBox.y, width: fabBox.width, height: fabBox.height }
        : null,
      label: labelBox
        ? { x: labelBox.x, y: labelBox.y, width: labelBox.width, height: labelBox.height }
        : null,
      hit: hitBox
        ? { x: hitBox.x, y: hitBox.y, width: hitBox.width, height: hitBox.height }
        : null,
      nav: navBox
        ? { x: navBox.x, y: navBox.y, width: navBox.width, height: navBox.height }
        : null,
      labelClipped:
        !!label &&
        (label.scrollWidth > label.clientWidth + 1 ||
          label.scrollHeight > label.clientHeight + 1),
    };
  });
}

function assertInsideViewport(
  box: Box,
  viewport: { width: number; height: number },
  label: string,
) {
  expect(box.x, `${label} x`).toBeGreaterThanOrEqual(-0.5);
  expect(box.y, `${label} y`).toBeGreaterThanOrEqual(-0.5);
  expect(right(box), `${label} right`).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(bottom(box), `${label} bottom`).toBeLessThanOrEqual(viewport.height + 0.5);
}

async function assertFabGeometry(page: Page, name: string) {
  const metrics = await measure(page);
  expect(metrics.fab, `${name} fab box`).toBeTruthy();
  expect(metrics.label, `${name} label box`).toBeTruthy();
  expect(metrics.nav, `${name} nav box`).toBeTruthy();
  const fab = metrics.fab!;
  const label = metrics.label!;
  const nav = metrics.nav!;
  const hit = metrics.hit;

  assertInsideViewport(fab, metrics.viewport, `${name} fab`);
  assertInsideViewport(label, metrics.viewport, `${name} label`);
  if (hit) {
    assertInsideViewport(hit, metrics.viewport, `${name} hit`);
    expect(hit.width, `${name} touch width`).toBeGreaterThanOrEqual(44);
    expect(hit.height, `${name} touch height`).toBeGreaterThanOrEqual(44);
  }

  expect(metrics.labelClipped, `${name} label clipped`).toBe(false);
  expect(metrics.overflowX, `${name} horizontal overflow`).toBe(false);
  expect(fab.x, `${name} left gutter`).toBeGreaterThanOrEqual(8);
  expect(metrics.viewport.width - right(fab), `${name} right gutter`).toBeGreaterThanOrEqual(8);
  expect(bottom(fab), `${name} above tab bar`).toBeLessThanOrEqual(nav.y + 1);
  expect(right(label), `${name} label inside fab`).toBeLessThanOrEqual(right(fab) + 1);
  expect(label.x, `${name} label left`).toBeGreaterThanOrEqual(fab.x - 1);

  const link = page.getByRole("link", { name: "Ask Amy AI" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/assistant");
  await expect(page.getByTestId("mobile-tab-bar")).toBeVisible();
}

test.describe("Amy FAB responsive containment", () => {
  for (const vp of VIEWPORTS) {
    if (vp.label === "iphone-8-dup") continue;
    test(`${vp.label} ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openChrome(page);
      await assertFabGeometry(page, vp.label);
    });
  }

  for (const vp of UNUSUAL) {
    test(`unusual ${vp.label} ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const androidShell = vp.width >= 1024;
      await openChrome(page, androidShell);
      await assertFabGeometry(page, vp.label);
    });
  }

  for (const vp of FOLDABLE_ANDROID) {
    test(`android-shell ${vp.label} ${vp.width}x${vp.height}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await openChrome(page, true);
      await assertFabGeometry(page, vp.label);
    });
  }

  test("safe-area inset keeps the cluster inside the padded viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `
        :root {
          --sat: 47px;
          --sab: 34px;
        }
        html {
          padding: 47px 24px 34px 16px;
        }
      `;
      document.documentElement.appendChild(style);
    });
    await openChrome(page);
    await page.evaluate(() => {
      document.documentElement.style.setProperty("padding", "47px 24px 34px 16px");
    });
    const metrics = await measure(page);
    expect(metrics.fab).toBeTruthy();
    assertInsideViewport(metrics.fab!, metrics.viewport, "safe-area fab");
    assertInsideViewport(metrics.label!, metrics.viewport, "safe-area label");
  });

  test("tab bar items remain tappable beside the FAB", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openChrome(page);
    const tabBar = page.getByTestId("mobile-tab-bar");
    await expect(tabBar).toBeVisible();
    const links = tabBar.locator("a");
    await expect(links).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      const box = await links.nth(i).boundingBox();
      expect(box, `nav item ${i}`).toBeTruthy();
      expect(box!.width).toBeGreaterThan(24);
      expect(box!.height).toBeGreaterThan(24);
    }
    await page.screenshot({
      path: `${ARTIFACTS}/amy-fab-mobile-360.png`,
    });
  });

  test("representative foldable and tablet screenshots", async ({ page }) => {
    const shots = [
      { width: 320, height: 568, name: "amy-fab-320", shell: false },
      { width: 390, height: 844, name: "amy-fab-390", shell: false },
      { width: 768, height: 1024, name: "amy-fab-768-tablet", shell: false },
      { width: 844, height: 390, name: "amy-fab-landscape", shell: false },
      { width: 840, height: 630, name: "amy-fab-fold-main-4-3", shell: true },
      { width: 1248, height: 1972, name: "amy-fab-fold-cover", shell: true },
    ] as const;
    for (const shot of shots) {
      await page.setViewportSize({ width: shot.width, height: shot.height });
      await openChrome(page, shot.shell);
      await assertFabGeometry(page, shot.name);
      await page.screenshot({ path: `${ARTIFACTS}/${shot.name}.png` });
    }
  });
});
