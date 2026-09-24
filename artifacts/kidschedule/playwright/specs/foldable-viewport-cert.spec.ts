/**
 * Foldable + unusual viewport certification.
 * Viewport-driven only — device names are labels, never app logic.
 *
 * Run: pnpm --filter @workspace/kidschedule test:e2e:foldable-cert
 */
import { test, expect, type Page } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

const PHONES = [
  { width: 320, height: 568, label: "320x568" },
  { width: 360, height: 640, label: "360x640" },
  { width: 375, height: 667, label: "375x667" },
  { width: 390, height: 844, label: "390x844" },
  { width: 393, height: 852, label: "393x852" },
  { width: 412, height: 915, label: "412x915" },
  { width: 430, height: 932, label: "430x932" },
  { width: 480, height: 1040, label: "480x1040" },
] as const;

const TABLETS = [
  { width: 600, height: 960, label: "600x960" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 820, height: 1180, label: "820x1180" },
  { width: 1024, height: 1366, label: "1024x1366", androidShell: true },
] as const;

const FOLDABLES = [
  { width: 390, height: 624, label: "cover_10_16", androidShell: true },
  { width: 412, height: 659, label: "duo_outer_5_4", androidShell: true },
  { width: 768, height: 576, label: "main_4_3", androidShell: true },
  { width: 840, height: 630, label: "duo_inner_7_6", androidShell: true },
  { width: 1248, height: 1972, label: "fold_cover_display", androidShell: true },
  { width: 1848, height: 2448, label: "fold_main_display", androidShell: true },
] as const;

const LANDSCAPE = [
  { width: 667, height: 375, label: "landscape_phone" },
  { width: 844, height: 390, label: "landscape_iphone" },
  { width: 1024, height: 768, label: "landscape_tablet", androidShell: true },
] as const;

type Vp = { width: number; height: number; label: string; androidShell?: boolean };

async function prepare(page: Page, androidShell: boolean) {
  await page.evaluate((shell) => {
    document.documentElement.classList.add("amynest-living-universe");
    document.body.classList.add("amynest-living-universe", "has-tabbar");
    if (shell) document.documentElement.classList.add("amynest-android-shell");
    else document.documentElement.classList.remove("amynest-android-shell");
  }, androidShell);
}

async function assertNoHorizontalOverflow(page: Page, name: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(metrics.scrollWidth, `${name} overflow`).toBeLessThanOrEqual(
    metrics.clientWidth + 1,
  );
}

function assertInside(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  name: string,
) {
  expect(box.x, `${name} x`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${name} y`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${name} right`).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height, `${name} bottom`).toBeLessThanOrEqual(viewport.height + 1);
}

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return (
    a.x < b.x + b.width - 2 &&
    a.x + a.width > b.x + 2 &&
    a.y < b.y + b.height - 2 &&
    a.y + a.height > b.y + 2
  );
}

async function assertChrome(page: Page, name: string) {
  const tabBar = page.getByTestId("mobile-tab-bar");
  await expect(tabBar).toBeVisible();
  const fab = page.getByTestId("amy-fab-floating");
  await expect(fab).toBeVisible();
  const label = page.getByTestId("amy-fab-label");
  await expect(label).toBeVisible();

  const viewport = page.viewportSize()!;
  const fabBox = await fab.boundingBox();
  const labelBox = await label.boundingBox();
  const navBox = await tabBar.boundingBox();
  expect(fabBox).toBeTruthy();
  expect(labelBox).toBeTruthy();
  expect(navBox).toBeTruthy();
  assertInside(fabBox!, viewport, `${name} fab`);
  assertInside(labelBox!, viewport, `${name} label`);
  expect(fabBox!.y + fabBox!.height, `${name} fab above nav`).toBeLessThanOrEqual(
    navBox!.y + 1,
  );
  expect(viewport.width - (fabBox!.x + fabBox!.width), `${name} fab gutter`).toBeGreaterThanOrEqual(
    8,
  );

  const navLinks = tabBar.locator("a");
  const count = await navLinks.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < count; i += 1) {
    const box = await navLinks.nth(i).boundingBox();
    expect(box, `${name} nav ${i}`).toBeTruthy();
    expect(box!.width).toBeGreaterThan(20);
    expect(box!.height).toBeGreaterThan(20);
  }
}

async function openTodayHome(page: Page, vp: Vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto("/playwright-today-home-dashboard.html?panel=plan", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await prepare(page, Boolean(vp.androidShell));
  await page.waitForSelector('[data-testid="today-home-living-fixture"]', {
    timeout: 30_000,
  });
}

async function openChrome(page: Page, vp: Vp) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto("/playwright-living-chrome.html", {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await prepare(page, Boolean(vp.androidShell) || vp.width >= 1024);
  await page.waitForSelector('[data-testid="amy-fab-floating"]', {
    timeout: 30_000,
  });
}

test.describe("Today Home foldable certification", () => {
  const matrix: Vp[] = [...PHONES, ...TABLETS, ...FOLDABLES, ...LANDSCAPE];

  for (const vp of matrix) {
    test(`home ${vp.label}`, async ({ page }) => {
      await openTodayHome(page, vp);
      await assertNoHorizontalOverflow(page, vp.label);
      await assertChrome(page, vp.label);
      await expect(page.getByTestId("today-home-shell")).toBeVisible();
      await expect(page.getByTestId("today-home-family")).toBeVisible();
      const begin = page.getByTestId("today-home-begin");
      await expect(begin).toBeVisible();
      await expect(begin).toHaveText(/Begin today/i);
      const beginBox = await begin.boundingBox();
      expect(beginBox).toBeTruthy();
      expect(beginBox!.height).toBeGreaterThanOrEqual(44);
      const fabBox = await page.getByTestId("amy-fab-floating").boundingBox();
      expect(fabBox).toBeTruthy();
      const beginInView =
        beginBox!.y < vp.height && beginBox!.y + beginBox!.height > 0;
      if (beginInView) {
        expect(
          boxesOverlap(beginBox!, fabBox!),
          `${vp.label} Begin today must not sit under the Amy FAB`,
        ).toBe(false);
      }
      const hero = page.locator(".th-hero-card");
      const heroBox = await hero.boundingBox();
      expect(heroBox).toBeTruthy();
      expect(heroBox!.width).toBeLessThanOrEqual(vp.width);
      if (vp.width >= 900) {
        expect(heroBox!.width).toBeLessThanOrEqual(720);
      }
    });
  }
});

test.describe("Global chrome foldable certification", () => {
  const matrix: Vp[] = [...PHONES, ...TABLETS, ...FOLDABLES, ...LANDSCAPE];

  for (const vp of matrix) {
    test(`chrome ${vp.label}`, async ({ page }) => {
      await openChrome(page, vp);
      await assertNoHorizontalOverflow(page, vp.label);
      await assertChrome(page, vp.label);
      const header = page.getByTestId("living-chrome-header");
      if (vp.width < 1024 || vp.androidShell) {
        await expect(header).toBeVisible();
        const box = await header.boundingBox();
        expect(box).toBeTruthy();
        assertInside(box!, page.viewportSize()!, `${vp.label} header`);
      }
    });
  }
});

test.describe("Visual regression captures", () => {
  const shots: Array<Vp & { file: string; home?: boolean }> = [
    { width: 360, height: 640, label: "narrow_android", file: "foldable_narrow_android_phone.png", home: true },
    { width: 390, height: 844, label: "iphone", file: "foldable_normal_iphone.png", home: true },
    { width: 412, height: 659, label: "fold_cover", file: "foldable_samsung_fold_cover.png", androidShell: true, home: true },
    { width: 840, height: 630, label: "fold_main", file: "foldable_samsung_fold_unfolded.png", androidShell: true, home: true },
    { width: 390, height: 624, label: "duo_outer", file: "foldable_iphone_duo_outer.png", androidShell: true, home: true },
    { width: 840, height: 630, label: "duo_inner", file: "foldable_iphone_duo_inner.png", androidShell: true, home: true },
    { width: 768, height: 1024, label: "tablet_portrait", file: "foldable_tablet_portrait.png", home: true },
    { width: 1024, height: 768, label: "tablet_landscape", file: "foldable_tablet_landscape.png", androidShell: true, home: true },
  ];

  for (const shot of shots) {
    test(`screenshot ${shot.label}`, async ({ page }) => {
      await openTodayHome(page, shot);
      await assertChrome(page, shot.label);
      await page.screenshot({ path: `${ARTIFACTS}/${shot.file}` });
    });
  }
});
