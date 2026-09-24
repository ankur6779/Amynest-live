/**
 * Remaining automatable gap closure: Health Lab live practice, real coloring
 * fixture, real Art & Craft video fixture, remaining 85vh sheets.
 *
 * Run: pnpm --filter @workspace/kidschedule test:e2e:foldable-gap-closure
 */
import { test, expect, type Page, type Route } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ARTIFACTS = "/opt/cursor/artifacts";
const COLORING_PNG = "/illustrations/creativity/coloring-books-hero.png";
const VIDEO_MP4 = "/promo/get-app/demo-15s.mp4";
const DANCE_MP3 = "/health-lab-audio/crystal-garden-dance.mp3";

type Vp = { width: number; height: number; label: string };

const PRACTICE_VPS: Vp[] = [
  { width: 360, height: 640, label: "360x640" },
  { width: 390, height: 844, label: "390x844" },
  { width: 1248, height: 1972, label: "fold_cover" },
  { width: 1848, height: 2448, label: "fold_unfolded" },
  { width: 1024, height: 768, label: "4_3" },
  { width: 844, height: 390, label: "landscape_844x390" },
];

const MEDIA_VPS: Vp[] = [
  { width: 360, height: 640, label: "360x640" },
  { width: 1024, height: 768, label: "4_3" },
  { width: 1848, height: 2448, label: "fold_unfolded" },
  { width: 844, height: 390, label: "landscape_844x390" },
];

const SHEET_VPS: Vp[] = [
  { width: 320, height: 568, label: "320x568" },
  { width: 360, height: 640, label: "360x640" },
  { width: 390, height: 844, label: "390x844" },
  { width: 412, height: 915, label: "412x915" },
  { width: 844, height: 390, label: "landscape_844x390" },
  { width: 1024, height: 600, label: "short_1024x600" },
  { width: 1024, height: 768, label: "4_3" },
  { width: 1248, height: 1972, label: "fold_cover" },
  { width: 1848, height: 2448, label: "fold_unfolded" },
];

async function assertNoOverflow(page: Page, name: string) {
  const metrics = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(metrics.doc, `${name} document`).toBeLessThanOrEqual(metrics.client + 1);
  expect(metrics.body, `${name} body`).toBeLessThanOrEqual(metrics.client + 1);
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

async function mockHealthLabApi(page: Page) {
  let serverProfile: Record<string, unknown> | null = null;
  await page.route("**/api/health-lab/**", async (route: Route) => {
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
        body: JSON.stringify({
          ok: true,
          dashboard: { sessions: 0, streakDays: 0, level: 1, totalXp: 0 },
        }),
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

async function mockRealMediaApis(page: Page) {
  await page.route("**/api/**", async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (method === "GET" && url.includes("/api/coloring/list")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          files: [
            {
              id: "cb1",
              name: "Forest animals",
              thumbnailUrl: COLORING_PNG,
              previewUrl: COLORING_PNG,
              downloaded: false,
            },
          ],
          pagination: { page: 0, pageSize: 4, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
          dailyQuota: { limit: 3, used: 0, remaining: 3 },
        }),
      });
      return;
    }
    if (method === "GET" && url.includes("/api/reels/videos")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          videos: [
            {
              id: "reel1",
              name: "Paper flower.mp4",
              mimeType: "video/mp4",
              streamUrl: VIDEO_MP4,
            },
          ],
          total: 1,
          offset: 0,
          nextOffset: null,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, isPremium: true, plan: "yearly", status: "active" }),
    });
  });
}

test.describe("Health Lab live practice", () => {
  for (const vp of PRACTICE_VPS) {
    test(`crystal garden ${vp.label}`, async ({ page }) => {
      mkdirSync(ARTIFACTS, { recursive: true });
      await mockHealthLabApi(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-health-lab.html?childId=42&childName=Riya", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("health-lab-living")).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `health hub ${vp.label}`);

      await page.getByTestId("health-lab-quiet-freeze-statue").click();
      const danceLoaded = page.waitForResponse(
        (res) => res.url().includes("crystal-garden-dance.mp3") && res.ok(),
        { timeout: 20_000 },
      );
      const ready = page.getByRole("button", { name: /I'm Ready!|I'm ready/i });
      if (await ready.isVisible().catch(() => false)) {
        await ready.click();
      }

      const start = page.getByTestId("health-lab-practice-start");
      await expect(start).toBeVisible({ timeout: 15_000 });
      await start.scrollIntoViewIfNeeded();
      const startBox = await start.boundingBox();
      expect(startBox, `practice start ${vp.label}`).toBeTruthy();
      expect(startBox!.width).toBeGreaterThan(40);
      expect(startBox!.y + startBox!.height).toBeLessThanOrEqual(vp.height + 1);
      await assertNoOverflow(page, `health onboarding ${vp.label}`);
      await start.click();

      const calibration = page.getByTestId("health-lab-motion-calibration");
      await expect(calibration).toBeVisible({ timeout: 8_000 });
      await expect(page.getByRole("heading", { name: "HOLD DEVICE STILL" })).toBeVisible();
      const exit = page.getByTestId("health-lab-practice-exit").first();
      await expect(exit).toBeVisible();
      assertInside((await exit.boundingBox())!, vp, `calibration exit ${vp.label}`);
      await assertNoOverflow(page, `health calibration ${vp.label}`);

      await expect(page.getByTestId("health-lab-game-stage-freeze-statue")).toBeVisible({
        timeout: 8_000,
      });
      await page.waitForTimeout(3500);
      await expect(page.getByText(/Crystal rounds|Crystals|Hold completely still|Dance|freeze/i).first()).toBeVisible({
        timeout: 8_000,
      });

      const danceRes = await danceLoaded.catch(() => null);
      const dance = danceRes ?? (await page.request.get(DANCE_MP3));
      expect(dance.ok(), "crystal garden dance fixture").toBeTruthy();
      expect(dance.headers()["content-type"] ?? "").toMatch(/audio\/mpeg|audio\/mp3/i);
      test.info().annotations.push({
        type: "note",
        description:
          "Dance clip is a real local MP3. Real microphone/accelerometer freeze success is NOT AUTOMATABLE; desktop motion simulation is used for calibration + active UI only.",
      });

      const activeExit = page.getByTestId("health-lab-practice-exit").first();
      await expect(activeExit).toBeVisible();
      const exitBox = await activeExit.boundingBox();
      expect(exitBox).toBeTruthy();
      assertInside(exitBox!, vp, `active exit ${vp.label}`);

      const fab = page.getByTestId("amy-fab-floating");
      if (await fab.isVisible().catch(() => false)) {
        const fabBox = await fab.boundingBox();
        if (fabBox && exitBox) {
          expect(boxesOverlap(exitBox, fabBox), `${vp.label} FAB vs Exit`).toBe(false);
        }
      }
      const tab = page.getByTestId("mobile-tab-bar");
      if (await tab.isVisible().catch(() => false)) {
        const tabBox = await tab.boundingBox();
        if (tabBox && exitBox) {
          expect(boxesOverlap(exitBox, tabBox), `${vp.label} tab bar vs Exit`).toBe(false);
        }
      }

      await assertNoOverflow(page, `health active ${vp.label}`);
      if (vp.label === "360x640" || vp.label === "4_3") {
        await page.screenshot({ path: `${ARTIFACTS}/gap_health_practice_${vp.label}.png` });
      }

      await activeExit.click();
      await expect(page.getByTestId("health-lab-living")).toBeVisible({ timeout: 10_000 });
    });
  }
});

test.describe("Coloring real media fixture", () => {
  for (const vp of MEDIA_VPS) {
    test(`coloring ${vp.label}`, async ({ page }) => {
      await mockRealMediaApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const asset = await page.request.get(COLORING_PNG);
      expect(asset.ok()).toBeTruthy();
      expect(asset.headers()["content-type"] ?? "").toMatch(/image\/png/i);
      expect((await asset.body()).byteLength).toBeGreaterThan(1000);

      await page.goto("/playwright-hub-content.html?module=coloring", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("coloring-books-section")).toBeVisible({ timeout: 30_000 });
      await expect(page.getByTestId("coloring-card-cb1")).toBeVisible();

      const thumb = page.getByTestId("coloring-thumb-cb1");
      await expect(thumb).toBeVisible();
      await expect(thumb).toHaveJSProperty("complete", true);
      const thumbMeta = await thumb.evaluate((el) => {
        const img = el as HTMLImageElement;
        const style = getComputedStyle(img);
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          currentSrc: img.currentSrc,
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
        };
      });
      expect(thumbMeta.naturalWidth).toBeGreaterThan(1);
      expect(thumbMeta.naturalHeight).toBeGreaterThan(1);
      expect(thumbMeta.currentSrc).toContain("coloring-books-hero.png");
      expect(thumbMeta.objectFit).toBe("contain");
      expect(thumbMeta.objectPosition).toMatch(/center|50%\s+50%/);

      await assertNoOverflow(page, `coloring list ${vp.label}`);
      await page.getByTestId("coloring-preview-cb1").click();
      const dialog = page.getByTestId("coloring-preview-dialog");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
      const close = dialog.getByRole("button", { name: /close/i }).first();
      await expect(close).toBeVisible();
      assertInside((await close.boundingBox())!, vp, `coloring close ${vp.label}`);

      const frame = page.getByTestId("coloring-preview-frame");
      await expect(frame).toBeVisible();
      await expect(frame).toHaveAttribute("src", COLORING_PNG);
      await assertNoOverflow(page, `coloring preview ${vp.label}`);
      if (vp.label === "360x640") {
        await page.screenshot({ path: `${ARTIFACTS}/gap_coloring_real_360x640.png` });
      }
    });
  }
});

test.describe("Art & Craft real video fixture", () => {
  for (const vp of MEDIA_VPS) {
    test(`reels ${vp.label}`, async ({ page }) => {
      await mockRealMediaApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      const asset = await page.request.get(VIDEO_MP4);
      expect(asset.ok()).toBeTruthy();
      expect(asset.headers()["content-type"] ?? "").toMatch(/video\/mp4/i);
      expect((await asset.body()).byteLength).toBeGreaterThan(1000);

      await page.goto("/playwright-hub-content.html?module=reels", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("art-craft-reels")).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `reels list ${vp.label}`);
      await page.getByTestId("art-craft-reel-card-reel1").click();

      const overlay = page.getByTestId("art-craft-reel-overlay");
      await expect(overlay).toBeVisible();
      const video = page.getByTestId("art-craft-reel-video");
      await expect(video).toBeVisible({ timeout: 15_000 });
      await expect(video).toHaveAttribute("src", VIDEO_MP4);

      await expect.poll(async () => {
        return video.evaluate((el) => (el as HTMLVideoElement).readyState);
      }, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);

      const meta = await video.evaluate((el) => {
        const v = el as HTMLVideoElement;
        return {
          src: v.currentSrc || v.src,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          duration: v.duration,
          readyState: v.readyState,
        };
      });
      expect(meta.src).toContain("demo-15s.mp4");
      expect(meta.videoWidth).toBeGreaterThan(1);
      expect(meta.videoHeight).toBeGreaterThan(1);
      expect(meta.duration).toBeGreaterThan(0);
      expect(meta.videoWidth / meta.videoHeight).toBeGreaterThan(0.3);

      const close = page.getByTestId("art-craft-reel-close");
      await expect(close).toBeVisible();
      assertInside((await close.boundingBox())!, vp, `reel close ${vp.label}`);
      await assertNoOverflow(page, `reels overlay ${vp.label}`);
      if (vp.label === "360x640") {
        await page.screenshot({ path: `${ARTIFACTS}/gap_video_real_360x640.png` });
      }
    });
  }
});

test.describe("Remaining 85vh sheets", () => {
  const sheets = [
    { id: "subscription", ready: "subscription-moment-sheet", close: "premium-moment-dismiss", action: "premium-moment-cta" },
    { id: "country", ready: "onboarding-country-modal", close: null, action: null },
    { id: "curriculum", ready: "curriculum-explorer-sheet", close: null, action: null },
    { id: "recipe", ready: "routine-recipe-dialog", close: null, action: null },
    { id: "task-check", ready: "routine-task-check-sheet", close: null, action: "routine-task-check-save" },
  ] as const;

  for (const sheet of sheets) {
    for (const vp of SHEET_VPS) {
      test(`${sheet.id} ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`/playwright-gap-closure-sheets.html?sheet=${sheet.id}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        const surface = page.getByTestId(sheet.ready);
        await expect(surface).toBeVisible({ timeout: 20_000 });
        const box = await surface.boundingBox();
        expect(box, `${sheet.id} ${vp.label} box`).toBeTruthy();
        expect(box!.height, `${sheet.id} ${vp.label} height`).toBeLessThanOrEqual(vp.height + 1);
        expect(box!.width, `${sheet.id} ${vp.label} width`).toBeLessThanOrEqual(vp.width + 1);
        expect(box!.y, `${sheet.id} ${vp.label} top`).toBeGreaterThanOrEqual(-1);

        const close = sheet.close
          ? page.getByTestId(sheet.close)
          : surface.getByRole("button", { name: /close|maybe later|dismiss/i }).first();
        if (await close.isVisible().catch(() => false)) {
          const closeBox = await close.boundingBox();
          if (closeBox) assertInside(closeBox, vp, `${sheet.id} close ${vp.label}`);
        }

        if (sheet.action) {
          const action = page.getByTestId(sheet.action);
          await expect(action).toBeVisible();
          const actionBox = await action.boundingBox();
          expect(actionBox).toBeTruthy();
          assertInside(actionBox!, vp, `${sheet.id} action ${vp.label}`);
        }

        await assertNoOverflow(page, `${sheet.id} ${vp.label}`);
      });
    }
  }
});
