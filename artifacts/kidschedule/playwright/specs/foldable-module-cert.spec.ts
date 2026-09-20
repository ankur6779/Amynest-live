/**
 * Foldable + unusual viewport module certification.
 * Viewport labels only — never application logic.
 *
 * Run: pnpm --filter @workspace/kidschedule test:e2e:foldable-modules
 */
import { test, expect, type Page, type Route } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

type Vp = { width: number; height: number; label: string; androidShell?: boolean };

const HOME_EXTRA: Vp[] = [
  { width: 1200, height: 900, label: "4_3_1200x900", androidShell: true },
  { width: 1366, height: 1024, label: "4_3_1366x1024", androidShell: true },
  { width: 1024, height: 600, label: "short_1024x600", androidShell: true },
  { width: 1280, height: 600, label: "short_1280x600", androidShell: true },
  { width: 1366, height: 768, label: "landscape_1366x768", androidShell: true },
  { width: 320, height: 320, label: "square_320" },
];

const MODULE_VPS: Vp[] = [
  { width: 320, height: 568, label: "320x568" },
  { width: 360, height: 640, label: "360x640" },
  { width: 390, height: 844, label: "390x844" },
  { width: 412, height: 915, label: "412x915" },
  { width: 1248, height: 1972, label: "fold_cover", androidShell: true },
  { width: 1848, height: 2448, label: "fold_unfolded", androidShell: true },
  { width: 1024, height: 768, label: "4_3", androidShell: true },
  { width: 844, height: 390, label: "landscape_844x390" },
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

async function mockHubApis(page: Page) {
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
              thumbnailUrl: PIXEL,
              previewUrl: "about:blank",
              downloaded: false,
            },
            {
              id: "cb2",
              name: "Ocean friends",
              thumbnailUrl: PIXEL,
              previewUrl: "about:blank",
              downloaded: false,
            },
          ],
          pagination: { page: 0, pageSize: 4, total: 2, totalPages: 1, hasNext: false, hasPrev: false },
          dailyQuota: { limit: 3, used: 0, remaining: 3 },
        }),
      });
      return;
    }
    if (method === "GET" && url.includes("/api/worksheets/list")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          worksheets: [
            {
              id: "ws1",
              name: "Letter tracing.pdf",
              mimeType: "application/pdf",
              fileType: "pdf",
              category: "literacy",
              previewUrl: PIXEL,
              downloaded: false,
            },
          ],
          total: 1,
          dailyQuota: { limit: 3, used: 0, remaining: 3 },
        }),
      });
      return;
    }
    if (method === "GET" && url.includes("/api/stories")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          activeChildId: 2,
          child: { id: 2, name: "Devan" },
          catalogSize: 1,
          rows: {
            continueWatching: [],
            recommended: [],
            trending: [],
            allStories: [
              {
                id: 11,
                driveFileId: "story-1",
                title: "The moon garden",
                category: "bedtime",
                thumbnailUrl: PIXEL,
                durationSec: 90,
                streamUrl: PIXEL,
              },
            ],
          },
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
            { id: "reel1", name: "Paper flower.mp4", mimeType: "video/mp4", streamUrl: PIXEL },
            { id: "reel2", name: "Clay animals.mp4", mimeType: "video/mp4", streamUrl: PIXEL },
          ],
          total: 2,
          offset: 0,
          nextOffset: null,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        isPremium: true,
        plan: "yearly",
        status: "active",
        profile: null,
        dashboard: { sessions: 0, streakDays: 0, level: 1, totalXp: 0 },
        history: [],
      }),
    });
  });
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

test.describe("Home extra unusual viewports", () => {
  for (const vp of HOME_EXTRA) {
    test(`home ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-today-home-dashboard.html?panel=plan", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.evaluate((shell) => {
        document.documentElement.classList.add("amynest-living-universe");
        document.body.classList.add("amynest-living-universe", "has-tabbar");
        if (shell) document.documentElement.classList.add("amynest-android-shell");
      }, Boolean(vp.androidShell) || vp.width >= 1024);
      await page.waitForSelector('[data-testid="today-home-living-fixture"]', { timeout: 30_000 });
      await assertNoOverflow(page, vp.label);
      const begin = page.getByTestId("today-home-begin");
      await expect(begin).toBeVisible();
      const fab = page.getByTestId("amy-fab-floating");
      await expect(fab).toBeVisible();
      const beginBox = await begin.boundingBox();
      const fabBox = await fab.boundingBox();
      expect(beginBox).toBeTruthy();
      expect(fabBox).toBeTruthy();
      assertInside(fabBox!, { width: vp.width, height: vp.height }, `${vp.label} fab`);
      if (beginBox!.y < vp.height && beginBox!.y + beginBox!.height > 0) {
        expect(boxesOverlap(beginBox!, fabBox!), `${vp.label} CTA vs FAB`).toBe(false);
      }
    });
  }
});

test.describe("Gaming Hub viewport matrix", () => {
  const gameVps = MODULE_VPS.filter((vp) =>
    ["320x568", "360x640", "390x844", "fold_cover", "fold_unfolded", "4_3", "landscape_844x390"].includes(
      vp.label,
    ),
  );

  for (const vp of gameVps) {
    test(`maze ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-gaming-hub-certification.html?mode=maze-easy", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForSelector('[data-testid="gh-cert-maze"]', { timeout: 60_000 });
      await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 60_000 });
      await assertNoOverflow(page, `maze ${vp.label}`);
      const grid = page.getByTestId("maze-grid");
      const box = await grid.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(40);
      expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
      const close = page.getByRole("button", { name: /close|exit|back/i }).first();
      if (await close.isVisible().catch(() => false)) {
        const closeBox = await close.boundingBox();
        if (closeBox) assertInside(closeBox, { width: vp.width, height: vp.height }, `maze close ${vp.label}`);
      }
    });
  }

  test("target-tap arena fits container at 360 and 1024x768", async ({ page }) => {
    for (const vp of [
      { width: 360, height: 640 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto("/playwright-gaming-hub-certification.html?mode=target-tap", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForSelector('[data-testid="gh-cert-target-tap-root"]', { timeout: 30_000 });
      await assertNoOverflow(page, `target-tap ${vp.width}`);
      const root = page.getByTestId("gh-cert-target-tap-root");
      const box = await root.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
    }
  });

  test("color-fill dialog stays in 320 and 4:3", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/playwright-gaming-hub-certification.html?mode=color-fill", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForSelector('[data-testid="gh-cert-color-fill"]', { timeout: 30_000 });
    await assertNoOverflow(page, "color-fill 320");
    const cells = page.locator('[data-testid="color-fill-grid"] button');
    await expect(cells.first()).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(300);
    await assertNoOverflow(page, "color-fill 4:3");
  });
});

test.describe("Health Lab viewport matrix", () => {
  const vps = MODULE_VPS.filter((vp) =>
    ["360x640", "390x844", "412x915", "fold_cover", "fold_unfolded", "4_3", "landscape_844x390"].includes(
      vp.label,
    ),
  );
  for (const vp of vps) {
    test(`hub ${vp.label}`, async ({ page }) => {
      await mockHealthLabApi(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-health-lab.html?childId=42&childName=Riya", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(
        page.getByTestId("health-lab-living").or(page.getByText("Amy Health Lab")),
      ).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `health ${vp.label}`);
      const living = page.getByTestId("health-lab-living");
      await expect(living).toBeVisible();
      const paths = page.locator("[data-testid^='health-lab-quiet-']");
      const count = await paths.count();
      expect(count, `${vp.label} worlds must remain listed`).toBeGreaterThan(0);
      const exit = page.getByTestId("health-lab-exit-home").or(page.getByTestId("health-lab-back-care"));
      if (await exit.first().isVisible().catch(() => false)) {
        const box = await exit.first().boundingBox();
        if (box) assertInside(box, { width: vp.width, height: vp.height }, `health exit ${vp.label}`);
      }
    });
  }
});

test.describe("Speech Coach UI states", () => {
  const vps = MODULE_VPS.filter((vp) =>
    ["360x640", "390x844", "412x915", "landscape_844x390", "fold_cover", "fold_unfolded"].includes(
      vp.label,
    ),
  );
  for (const panel of ["setup", "denied", "recording", "result"] as const) {
    for (const vp of vps) {
      test(`${panel} ${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`/playwright-speech-coach.html?panel=${panel}`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        await page.waitForSelector('[data-testid="speech-coach-cert-fixture"]', { timeout: 30_000 });
        await assertNoOverflow(page, `speech ${panel} ${vp.label}`);
        if (panel === "setup") {
          await expect(page.getByTestId("pronounce-start-session")).toBeVisible();
        }
        if (panel === "denied") {
          await expect(page.getByText(/microphone|permission|settings/i).first()).toBeVisible();
        }
        if (panel === "recording") {
          await expect(page.getByTestId("pronounce-listening-indicator").or(page.getByTestId("pronounce-stop-btn")).first()).toBeVisible();
        }
        if (panel === "result") {
          await expect(page.getByTestId("pronounce-stt-result").or(page.getByTestId("pronounce-next-btn")).first()).toBeVisible();
        }
      });
    }
  }
});

test.describe("Ask Amy workspace", () => {
  const vps = MODULE_VPS.filter((vp) =>
    ["360x640", "390x844", "412x915", "landscape_844x390", "fold_cover", "fold_unfolded"].includes(
      vp.label,
    ),
  );
  for (const vp of vps) {
    test(`thread ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-amy-ai-workspace.html?panel=thread", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.waitForSelector('[data-testid="amy-ai-workspace"], [data-testid="amy-ai-fixture"]', {
        timeout: 30_000,
      });
      await assertNoOverflow(page, `ask-amy ${vp.label}`);
      const input = page.getByTestId("chat-thread-input");
      await expect(input).toBeVisible();
      const send = page.getByTestId("chat-thread-send");
      await expect(send).toBeVisible();
      const sendBox = await send.boundingBox();
      expect(sendBox).toBeTruthy();
      assertInside(sendBox!, { width: vp.width, height: vp.height }, `ask-amy send ${vp.label}`);
      await input.fill("A".repeat(280));
      await assertNoOverflow(page, `ask-amy long ${vp.label}`);
    });
  }

  test("reduced viewport height keeps composer in view", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playwright-amy-ai-workspace.html?panel=empty", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForSelector('[data-testid="chat-thread-input"]', { timeout: 30_000 });
    await page.setViewportSize({ width: 390, height: 420 });
    await page.waitForTimeout(200);
    const input = page.getByTestId("chat-thread-input");
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y + box!.height).toBeLessThanOrEqual(421);
  });
});

test.describe("Audio lesson player sheet", () => {
  const vps = MODULE_VPS.filter((vp) =>
    ["360x640", "390x844", "fold_cover", "fold_unfolded", "4_3", "landscape_844x390"].includes(vp.label),
  );
  for (const vp of vps) {
    test(`sheet ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-audio-lesson-player.html", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      const sheet = page.getByTestId("audio-player-sheet");
      await expect(sheet).toBeVisible({ timeout: 20_000 });
      await assertNoOverflow(page, `audio ${vp.label}`);
      const play = sheet.getByTestId("amy-audio-sheet-play");
      await expect(play).toBeVisible();
      const playBox = await play.boundingBox();
      expect(playBox).toBeTruthy();
      assertInside(playBox!, { width: vp.width, height: vp.height }, `audio play ${vp.label}`);
      const close = sheet.getByRole("button", { name: /close|minimize|done/i }).first();
      if (await close.isVisible().catch(() => false)) {
        const closeBox = await close.boundingBox();
        if (closeBox) assertInside(closeBox, { width: vp.width, height: vp.height }, `audio close ${vp.label}`);
      }
    });
  }
});

test.describe("Hub content modules", () => {
  const contentVps = MODULE_VPS.filter((vp) =>
    ["360x640", "390x844", "fold_cover", "fold_unfolded", "4_3"].includes(vp.label),
  );

  for (const vp of contentVps) {
    test(`coloring ${vp.label}`, async ({ page }) => {
      await mockHubApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-hub-content.html?module=coloring", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("coloring-books-section")).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `coloring ${vp.label}`);
      await expect(page.getByTestId("coloring-card-cb1")).toBeVisible();
      await page.getByTestId("coloring-preview-cb1").click();
      const dialog = page.getByTestId("coloring-preview-dialog");
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(box!.width).toBeLessThanOrEqual(vp.width + 1);
    });
  }

  for (const vp of contentVps) {
    test(`worksheets ${vp.label}`, async ({ page }) => {
      await mockHubApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-hub-content.html?module=worksheets", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.locator(".ws-card").or(page.getByText(/Letter tracing/i))).toBeVisible({
        timeout: 30_000,
      });
      await assertNoOverflow(page, `worksheets ${vp.label}`);
      await expect(page.locator("[data-worksheet-id='ws1'], .ws-card").first()).toBeVisible();
    });
  }

  for (const vp of contentVps) {
    test(`stories ${vp.label}`, async ({ page }) => {
      await mockHubApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-hub-content.html?module=stories", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("story-hub")).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `stories ${vp.label}`);
      await expect(page.getByText(/moon garden/i)).toBeVisible();
    });
  }

  for (const vp of contentVps) {
    test(`reels ${vp.label}`, async ({ page }) => {
      await mockHubApis(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/playwright-hub-content.html?module=reels", {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await expect(page.getByTestId("art-craft-reels")).toBeVisible({ timeout: 30_000 });
      await assertNoOverflow(page, `reels ${vp.label}`);
      await expect(page.getByText(/Paper flower|Clay animals|tap any video/i).first()).toBeVisible();
    });
  }
});

test.describe("Orientation flip", () => {
  test("Home portrait → landscape → portrait", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playwright-today-home-dashboard.html?panel=plan", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForSelector('[data-testid="today-home-begin"]', { timeout: 30_000 });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(250);
    await assertNoOverflow(page, "home landscape flip");
    await expect(page.getByTestId("today-home-begin")).toBeVisible();
    await expect(page.getByTestId("amy-fab-floating")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    await assertNoOverflow(page, "home portrait restore");
    const fab = await page.getByTestId("amy-fab-floating").boundingBox();
    const begin = await page.getByTestId("today-home-begin").boundingBox();
    expect(fab).toBeTruthy();
    expect(begin).toBeTruthy();
    expect(boxesOverlap(begin!, fab!)).toBe(false);
  });

  test("Maze portrait → landscape → portrait", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/playwright-gaming-hub-certification.html?mode=maze-easy", {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 60_000 });
    const portrait = await page.getByTestId("maze-grid").boundingBox();
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    await assertNoOverflow(page, "maze landscape");
    const landscape = await page.getByTestId("maze-grid").boundingBox();
    expect(landscape).toBeTruthy();
    expect(landscape!.width).toBeLessThanOrEqual(844 + 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    const restored = await page.getByTestId("maze-grid").boundingBox();
    expect(restored).toBeTruthy();
    expect(Math.abs((restored!.width ?? 0) - (portrait?.width ?? 0))).toBeLessThan(80);
  });
});

test.describe("Visual captures", () => {
  test("module screenshot set", async ({ page }) => {
    const shots: Array<{ file: string; goto: string; ready: string; setup?: (p: Page) => Promise<void>; size: Vp }> = [
      {
        file: "module_home_360x640.png",
        goto: "/playwright-today-home-dashboard.html?panel=plan",
        ready: "today-home-living-fixture",
        size: { width: 360, height: 640, label: "h" },
      },
      {
        file: "module_home_390x844.png",
        goto: "/playwright-today-home-dashboard.html?panel=plan",
        ready: "today-home-living-fixture",
        size: { width: 390, height: 844, label: "h" },
      },
      {
        file: "module_home_1248x1972.png",
        goto: "/playwright-today-home-dashboard.html?panel=plan",
        ready: "today-home-living-fixture",
        size: { width: 1248, height: 1972, label: "h", androidShell: true },
      },
      {
        file: "module_home_1848x2448.png",
        goto: "/playwright-today-home-dashboard.html?panel=plan",
        ready: "today-home-living-fixture",
        size: { width: 1848, height: 2448, label: "h", androidShell: true },
      },
      {
        file: "module_home_1024x768.png",
        goto: "/playwright-today-home-dashboard.html?panel=plan",
        ready: "today-home-living-fixture",
        size: { width: 1024, height: 768, label: "h", androidShell: true },
      },
      {
        file: "module_gaming_hub_narrow.png",
        goto: "/playwright-gaming-hub-certification.html?mode=maze-easy",
        ready: "maze-grid",
        size: { width: 360, height: 640, label: "g" },
      },
      {
        file: "module_gaming_hub_4_3.png",
        goto: "/playwright-gaming-hub-certification.html?mode=maze-easy",
        ready: "maze-grid",
        size: { width: 1024, height: 768, label: "g" },
      },
      {
        file: "module_health_lab_narrow.png",
        goto: "/playwright-health-lab.html?childId=42&childName=Riya",
        ready: "health-lab-living",
        size: { width: 360, height: 640, label: "hl" },
        setup: mockHealthLabApi,
      },
      {
        file: "module_health_lab_unfolded.png",
        goto: "/playwright-health-lab.html?childId=42&childName=Riya",
        ready: "health-lab-living",
        size: { width: 1848, height: 2448, label: "hl" },
        setup: mockHealthLabApi,
      },
      {
        file: "module_speech_coach_narrow.png",
        goto: "/playwright-speech-coach.html?panel=setup",
        ready: "speech-coach-cert-fixture",
        size: { width: 360, height: 640, label: "s" },
      },
      {
        file: "module_ask_amy_narrow.png",
        goto: "/playwright-amy-ai-workspace.html?panel=thread",
        ready: "amy-ai-fixture",
        size: { width: 360, height: 640, label: "a" },
      },
      {
        file: "module_audio_lesson_narrow.png",
        goto: "/playwright-audio-lesson-player.html",
        ready: "audio-player-sheet",
        size: { width: 360, height: 640, label: "au" },
      },
      {
        file: "module_video_narrow.png",
        goto: "/playwright-hub-content.html?module=reels",
        ready: "art-craft-reels",
        size: { width: 360, height: 640, label: "v" },
        setup: mockHubApis,
      },
      {
        file: "module_printables.png",
        goto: "/playwright-hub-content.html?module=worksheets",
        ready: "hub-content-cert-fixture",
        size: { width: 390, height: 844, label: "p" },
        setup: mockHubApis,
      },
      {
        file: "module_coloring_books.png",
        goto: "/playwright-hub-content.html?module=coloring",
        ready: "coloring-books-section",
        size: { width: 390, height: 844, label: "c" },
        setup: mockHubApis,
      },
      {
        file: "module_curiosity_stories.png",
        goto: "/playwright-hub-content.html?module=stories",
        ready: "story-hub",
        size: { width: 390, height: 844, label: "st" },
        setup: mockHubApis,
      },
    ];

    for (const shot of shots) {
      await page.setViewportSize({ width: shot.size.width, height: shot.size.height });
      if (shot.setup) await shot.setup(page);
      await page.goto(shot.goto, { waitUntil: "domcontentloaded", timeout: 90_000 });
      if (shot.ready === "health-lab-living") {
        await expect(
          page.getByTestId("health-lab-living").or(page.getByText("Amy Health Lab")),
        ).toBeVisible({ timeout: 30_000 });
      } else if (shot.ready === "audio-player-sheet") {
        await expect(page.getByTestId("audio-player-sheet")).toBeVisible({ timeout: 20_000 });
      } else {
        await page.waitForSelector(`[data-testid="${shot.ready}"]`, { timeout: 30_000 });
      }
      if (shot.goto.includes("today-home")) {
        await page.evaluate((shell) => {
          document.documentElement.classList.add("amynest-living-universe");
          document.body.classList.add("amynest-living-universe", "has-tabbar");
          if (shell) document.documentElement.classList.add("amynest-android-shell");
        }, Boolean(shot.size.androidShell));
      }
      await page.screenshot({ path: `${ARTIFACTS}/${shot.file}` });
    }
  });
});
