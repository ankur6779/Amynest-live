/**
 * Care → Health & Wellness deep audit E2E.
 * Production living UI: Care room Health path → Health Lab quiet practices.
 */
import { test, expect, type Page, type Route } from "@playwright/test";

const ARTIFACTS = "/opt/cursor/artifacts";

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "412x915", width: 412, height: 915 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1440x900", width: 1440, height: 900 },
] as const;

const QUIET_PATHS = [
  {
    id: "breath-control",
    title: "Breath & focus",
    play: /Hold gently|Place your finger|Balloon/i,
  },
  {
    id: "flamingo-balance",
    title: "Balance",
    play: /Hold still|calibrat|Sky Island|Stay balanced|Simulation/i,
  },
  {
    id: "freeze-statue",
    title: "Stillness",
    play: /Hold still|calibrat|Dance|FREEZE|Simulation/i,
  },
  {
    id: "reaction-time",
    title: "Attention",
    play: /Wait|Tap now|GO|Rocket|countdown/i,
  },
  {
    id: "finger-stability",
    title: "Steady hands",
    play: /Touch the core|crystal|Power|Hold/i,
  },
] as const;

function mockHealthLabApi(page: Page) {
  let serverProfile: Record<string, unknown> | null = null;
  return Promise.all([
    page.route("**/api/**", async (route: Route) => {
      const req = route.request();
      const url = req.url();
      if (url.includes("/api/health-lab/")) {
        if (req.method() === "GET" && url.includes("/profile/")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, profile: serverProfile, clientUpdatedAt: Date.now() }),
          });
          return;
        }
        if (req.method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, profile: serverProfile, history: [], dashboard: {} }),
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
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }),
  ]);
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  const failed: string[] = [];
  const httpFailures: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const loc = msg.location();
    errors.push([msg.text(), loc.url].filter(Boolean).join(" "));
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (/favicon|fonts\.gstatic|googletagmanager/i.test(url)) return;
    failed.push(`${req.failure()?.errorText ?? "failed"} ${url}`);
  });
  page.on("response", (res) => {
    const url = res.url();
    if (res.status() < 400) return;
    if (/favicon|fonts\.gstatic|googletagmanager/i.test(url)) return;
    httpFailures.push(`${res.status()} ${url}`);
  });
  return { errors, failed, httpFailures };
}

function relevantErrors(errors: string[]) {
  return errors.filter(
    (text) =>
      !/favicon|Download the React DevTools|Failed to load resource.*experience\/|net::ERR_ABORTED|\/api\/(client-logs|logs)/i.test(
        text,
      ),
  );
}

async function gotoCare(page: Page, child = 2, extraQuery = "") {
  const suffix = extraQuery ? `&${extraQuery.replace(/^\?/, "").replace(/^&/, "")}` : "";
  await page.goto(`/playwright-care-health-wellness.html?child=${child}${suffix}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(page.getByTestId("care-wellness-fixture")).toBeVisible({ timeout: 30_000 });
}

async function assertCrystalGardenDanceAsset(page: Page) {
  const audio = await page.request.get("/health-lab-audio/crystal-garden-dance.mp3");
  expect(audio.status(), "Crystal Garden dance MP3 must be served by Vite public/").toBe(200);
  expect(audio.headers()["content-type"] ?? "").toMatch(/audio\/mpeg/i);
  const body = await audio.body();
  expect(body.byteLength).toBeGreaterThan(4_000);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function lastPathClearsTabbar(page: Page) {
  const last = page.getByTestId("health-lab-quiet-finger-stability");
  const exit = page.getByTestId("health-lab-exit-home");
  const tab = page.getByTestId("mobile-tab-bar");
  if (!(await tab.isVisible().catch(() => false))) return;
  await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    root.scrollTo({ top: root.scrollHeight, behavior: "instant" });
  });
  await last.evaluate((el) => el.scrollIntoView({ block: "end", inline: "nearest" }));
  const pathBox = await last.boundingBox();
  const tabBox = await tab.boundingBox();
  expect(pathBox).toBeTruthy();
  expect(tabBox).toBeTruthy();
  expect((pathBox?.y ?? 0) + (pathBox?.height ?? 0)).toBeLessThanOrEqual((tabBox?.y ?? 0) + 2);
  await exit.evaluate((el) => el.scrollIntoView({ block: "end", inline: "nearest" }));
  const exitBox = await exit.boundingBox();
  expect(exitBox).toBeTruthy();
  expect((exitBox?.y ?? 0) + (exitBox?.height ?? 0)).toBeLessThanOrEqual((tabBox?.y ?? 0) + 2);
}

async function enterHealth(page: Page) {
  await page.getByTestId("care-quiet-health-lab").click();
}

async function dismissMotionPrep(page: Page) {
  const ready = page.getByRole("button", { name: /I'm ready|I'm Ready/i });
  if (await ready.isVisible().catch(() => false)) {
    await ready.click();
  }
}

async function startPractice(page: Page) {
  const start = page.getByTestId("health-lab-practice-start");
  await expect(start).toBeVisible({ timeout: 10_000 });
  await expect(start).toHaveText(/Begin gently/i);
  await start.click();
}

async function exitPractice(page: Page) {
  const exit = page.getByTestId("health-lab-practice-exit");
  if (await exit.isVisible().catch(() => false)) {
    await exit.click();
    return;
  }
  const labeled = page.getByRole("button", { name: /Exit|Return to Care/i }).first();
  if (await labeled.isVisible().catch(() => false)) {
    await labeled.click();
    return;
  }
  await page.keyboard.press("Escape");
}

test.describe("Care → Health & Wellness", () => {
  test.beforeEach(async ({ page }) => {
    await mockHealthLabApi(page);
  });

  test("Care advertises Health and every quiet practice launches", async ({ page }) => {
    const { errors, failed, httpFailures } = collectErrors(page);
    await gotoCare(page, 2);
    await expect(page.getByTestId("care-wellness-fixture")).toHaveAttribute("data-entitlement", "allow");
    await assertCrystalGardenDanceAsset(page);
    await expect(page.getByTestId("care-living-stream")).toBeVisible();
    await expect(page.getByTestId("care-quiet-health-lab")).toBeVisible();
    await expect(page.getByTestId("care-quiet-nutrition")).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({
      path: `${ARTIFACTS}/care_health_wellness_care_listing_390.png`,
      fullPage: true,
    });

    await enterHealth(page);
    await expect(page.getByTestId("health-lab-living")).toBeVisible();
    await expect(page.getByTestId("health-lab-recommend")).toBeVisible();
    await expect(page.getByTestId("health-lab-quiet-paths")).toBeVisible();

    for (const path of QUIET_PATHS) {
      const card = page.getByTestId(`health-lab-quiet-${path.id}`);
      await expect(card).toBeVisible();
      await expect(card).toContainText(path.title);
      await card.click();
      await dismissMotionPrep(page);
      await expect(page.getByText(/Today's care practice|Get ready/i).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator("[data-health-lab-immersive-host]")).toBeVisible();
      await expect(page.getByTestId(`health-lab-game-stage-${path.id}`)).toBeVisible();
      await expect(page.getByTestId("mobile-tab-bar")).toBeHidden();
      await expect(page.getByTestId("health-lab-practice-start")).toBeVisible();
      await page.screenshot({
        path: `${ARTIFACTS}/care_health_wellness_${path.id}_briefing.png`,
        fullPage: false,
      });
      await startPractice(page);
      await expect(page.getByTestId("health-lab-practice-start")).toHaveCount(0);
      await expect(page.getByText(path.play).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByTestId("mobile-tab-bar")).toBeHidden();
      await page.screenshot({
        path: `${ARTIFACTS}/care_health_wellness_${path.id}_play.png`,
        fullPage: false,
      });
      await exitPractice(page);
      await expect(page.getByTestId("health-lab-living")).toBeVisible({ timeout: 10_000 });
    }

    await page.getByTestId("health-lab-quiet-breath-control").click();
    await expect(page.getByText(/Today's care practice|Balloon Journey/i).first()).toBeVisible();
    await exitPractice(page);
    await expect(page.getByTestId("health-lab-living")).toBeVisible();

    expect(relevantErrors(errors), errors.join("\n")).toEqual([]);
    expect(
      failed.filter((f) => /health-lab|api\//i.test(f)),
      failed.join("\n"),
    ).toEqual([]);
    expect(
      httpFailures.filter((f) => /health-lab|health-lab-audio|api\//i.test(f)),
      httpFailures.join("\n"),
    ).toEqual([]);
  });

  test("denied entitlement keeps Care Health visible but does not launch practices", async ({ page }) => {
    const { errors, failed, httpFailures } = collectErrors(page);
    await gotoCare(page, 2, "entitlement=deny");
    await expect(page.getByTestId("care-wellness-fixture")).toHaveAttribute(
      "data-entitlement",
      "deny",
    );
    await expect(page.getByTestId("care-quiet-health-lab")).toBeVisible();
    await enterHealth(page);
    await expect(page.getByTestId("health-lab-static-free-preview")).toBeVisible();
    await expect(page.getByTestId("health-lab-living")).toHaveCount(0);
    await expect(page.getByTestId("health-lab-quiet-breath-control")).toHaveCount(0);
    await expect(page.getByTestId("health-lab-practice-start")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /continue/i })).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACTS}/care_health_wellness_entitlement_denied.png`,
      fullPage: true,
    });
    expect(relevantErrors(errors), errors.join("\n")).toEqual([]);
    expect(
      failed.filter((f) => /health-lab|api\//i.test(f)),
      failed.join("\n"),
    ).toEqual([]);
    expect(
      httpFailures.filter((f) => /health-lab|health-lab-audio|api\//i.test(f)),
      httpFailures.join("\n"),
    ).toEqual([]);
  });

  test("child profiles change Care Health eligibility", async ({ page }) => {
    await gotoCare(page, 1);
    await expect(page.getByTestId("care-quiet-health-lab")).toBeVisible();
    await enterHealth(page);
    await expect(page.getByTestId("health-lab-preview-living")).toBeVisible();
    await page.getByRole("button", { name: /^Care$/ }).click();

    await page.getByTestId("care-wellness-child-3").click();
    await expect(page.getByTestId("care-wellness-fixture")).toHaveAttribute("data-child-id", "3");
    await enterHealth(page);
    await expect(page.getByTestId("health-lab-living")).toBeVisible();
    await expect(page.getByTestId("health-lab-quiet-breath-control")).toBeVisible();
    await page.getByTestId("health-lab-back-care").click();

    await page.getByTestId("care-wellness-child-4").click();
    await expect(page.getByTestId("care-quiet-nutrition")).toBeVisible();
    await expect(page.getByTestId("care-quiet-health-lab")).toHaveCount(0);
  });

  test("recommend launches a real practice", async ({ page }) => {
    await gotoCare(page, 2);
    await enterHealth(page);
    await page.getByTestId("health-lab-recommend").click();
    await dismissMotionPrep(page);
    await expect(
      page.getByText(/Today's care practice|Mission Briefing|Get ready/i).first(),
    ).toBeVisible();
    await exitPractice(page);
    await expect(page.getByTestId("health-lab-living")).toBeVisible();
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`Care and Health Lab stay usable at ${vp.name}`, async ({ page }) => {
      const { errors, failed, httpFailures } = collectErrors(page);
      await mockHealthLabApi(page);
      await gotoCare(page, 3);
      await assertNoHorizontalOverflow(page);
      const health = page.getByTestId("care-quiet-health-lab");
      await health.scrollIntoViewIfNeeded();
      await expect(health).toBeVisible();
      await enterHealth(page);
      await expect(page.getByTestId("health-lab-living")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      if (vp.width < 1024) {
        await lastPathClearsTabbar(page);
      }
      await page.getByTestId("health-lab-quiet-reaction-time").click();
      await expect(page.getByText(/Rocket Launch|Today's care practice/i).first()).toBeVisible();
      if (vp.width < 1024) {
        await expect(page.getByTestId("mobile-tab-bar")).toBeHidden();
      }
      await exitPractice(page);
      await page.screenshot({
        path: `${ARTIFACTS}/care_health_wellness_${vp.name}.png`,
        fullPage: true,
      });
      expect(relevantErrors(errors), errors.join("\n")).toEqual([]);
      expect(
        [...failed, ...httpFailures].filter((f) => /health-lab|health-lab-audio|api\//i.test(f)),
        [...failed, ...httpFailures].join("\n"),
      ).toEqual([]);
    });
  });
}
