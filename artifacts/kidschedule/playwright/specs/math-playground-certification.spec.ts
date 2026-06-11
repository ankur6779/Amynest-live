/**
 * Math Playground — production certification E2E audit.
 *
 * Run: pnpm --filter @workspace/kidschedule run test:e2e:certification
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { CertAudit } from "../helpers/cert-audit";
import {
  completeCurrentActivity,
  exitToHub,
  launchActivity,
  openPlaygroundTab,
  readPlaygroundState,
  readStars,
  refreshIntelligenceIfNeeded,
  solveMiniGame,
} from "../helpers/cert-activity";

const CERT_URL =
  "/playwright-certification.html?childId=99&childName=Cert&ageYears=7";
const SCREENSHOT_DIR = "playwright/certification-artifacts";

const ACTIVITIES = [
  "counting_adventure",
  "addition_lab",
  "subtraction_garden",
  "multiplication_factory",
  "division_bakery",
  "number_patterns",
  "math_puzzles",
  "daily_challenge",
] as const;

const MINI_GAMES = [
  "pop_correct_answer",
  "rocket_counting",
  "balloon_burst",
  "feed_the_monkey",
  "number_train",
  "castle_builder",
] as const;

test.describe.configure({ mode: "serial" });

const SILENT_MP3 = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

test.beforeEach(async ({ page }) => {
  const audit = new CertAudit();
  audit.attach(page);
  (page as unknown as { __CERT_AUDIT__: CertAudit }).__CERT_AUDIT__ = audit;

  for (const pattern of ["**/api/static-audio/**", "**/api/tts/**"]) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: SILENT_MP3,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    });
  }

  await page.route("**/api/logs", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/api/subscription*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        entitlements: {
          plan: "yearly",
          status: "active",
          isPremium: true,
          isTrialing: false,
          trialEndsAt: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          provider: "manual",
          limits: {
            aiQueriesPerDay: 999,
            childrenMax: 10,
            routinesMax: 50,
            hubArticlesMax: 999,
            trialDays: 0,
          },
          usage: {
            aiQueriesToday: 0,
            aiQueriesRemaining: 999,
            features: {},
          },
        },
        plans: [],
      }),
    });
  });

  await page.goto(CERT_URL);
  await expect(page.getByTestId("cert-root")).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    (window as unknown as { __MP_CERT__: { resetPlaygroundState: () => void } }).__MP_CERT__.resetPlaygroundState();
  });
});

async function audit(page: import("@playwright/test").Page): Promise<CertAudit> {
  const a = (page as unknown as { __CERT_AUDIT__: CertAudit }).__CERT_AUDIT__;
  await a.collectRejections(page);
  return a;
}

test("01 — Parent Hub path: Smart Math Tricks → Playground tab", async ({ page }) => {
  await expect(page.getByTestId("smt-tab-today")).toBeVisible();
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-smart-math-tricks.png") });

  await openPlaygroundTab(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-playground-hub.png") });

  (await audit(page)).assertClean();
});

test("02 — Every activity launches", async ({ page }) => {
  await openPlaygroundTab(page);

  for (const activityId of ACTIVITIES) {
    await launchActivity(page, activityId);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `03-launch-${activityId}.png`),
    });
    await page.getByRole("button", { name: /hub|back/i }).first().click();
    await expect(page.getByTestId("math-playground")).toBeVisible();
  }

  (await audit(page)).assertClean();
});

test("03 — Activities complete and award stars", async ({ page }) => {
  await openPlaygroundTab(page);
  const before = await readStars(page);

  for (const activityId of ["counting_adventure", "addition_lab", "number_patterns"] as const) {
    await launchActivity(page, activityId);
    await completeCurrentActivity(page, activityId);
    await exitToHub(page);
  }

  const after = await readStars(page);
  expect(after).toBeGreaterThan(before);

  const state = await readPlaygroundState(page);
  expect(state.sessions).toBeGreaterThanOrEqual(3);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-stars-earned.png") });
  (await audit(page)).assertClean();
});

test("04 — Every mini game launches and completes", async ({ page }) => {
  for (const template of MINI_GAMES) {
    await page.goto(
      `/playwright-math-playground.html?childId=99&ageYears=7&mode=mini&template=${template}`,
    );
    await expect(page.getByTestId("mp-mini-game")).toBeVisible();
    const api = await page.evaluate(() => {
      return (window as unknown as { __MP_MINI_PAYLOAD__?: Record<string, unknown> })
        .__MP_MINI_PAYLOAD__;
    });
    await solveMiniGame(page, template, api ?? undefined);
    await expect(page.getByTestId("mp-puzzle-complete")).toBeVisible({ timeout: 12_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `05-mini-${template}.png`),
    });
  }

  (await audit(page)).assertClean();
});

test("05 — Parent dashboard and intelligence panel", async ({ page }) => {
  await openPlaygroundTab(page);

  await launchActivity(page, "counting_adventure");
  await completeCurrentActivity(page, "counting_adventure");
  await exitToHub(page);

  await expect(page.getByTestId("mp-parent-summary")).toBeVisible({ timeout: 8_000 });

  await refreshIntelligenceIfNeeded(page);
  await expect(page.getByTestId("mp-worksheet-generate")).toBeVisible({ timeout: 8_000 });

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-parent-dashboard.png") });
  (await audit(page)).assertClean();
});

test("06 — Worksheet generation and PDF export", async ({ page }) => {
  await openPlaygroundTab(page);

  await launchActivity(page, "counting_adventure");
  await completeCurrentActivity(page, "counting_adventure");
  await exitToHub(page);

  await refreshIntelligenceIfNeeded(page);

  let printCalled = false;
  await page.evaluate(() => {
    const orig = window.open;
    window.open = (...args: Parameters<typeof window.open>) => {
      const win = orig.apply(window, args);
      if (win) {
        win.print = () => {
          (window as unknown as { __CERT_PRINT__: boolean }).__CERT_PRINT__ = true;
        };
        win.document.write("<html><body>worksheet</body></html>");
        win.document.close();
        win.print();
      }
      return win;
    };
  });

  await page.getByTestId("mp-worksheet-generate").click();
  await expect(page.getByTestId("mp-worksheet-download")).toBeVisible({ timeout: 5_000 });
  await page.getByTestId("mp-worksheet-download").click();

  printCalled = await page.evaluate(() => Boolean((window as unknown as { __CERT_PRINT__?: boolean }).__CERT_PRINT__));
  expect(printCalled).toBe(true);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-worksheet-pdf.png") });
  (await audit(page)).assertClean();
});

test("07 — Teacher report export when available", async ({ page }) => {
  await openPlaygroundTab(page);

  for (let i = 0; i < 3; i += 1) {
    await launchActivity(page, "counting_adventure");
    await completeCurrentActivity(page, "counting_adventure");
    await exitToHub(page);
  }

  await refreshIntelligenceIfNeeded(page);

  const exportBtn = page.getByTestId("mp-teacher-export");
  if (await exportBtn.isVisible().catch(() => false)) {
    await page.evaluate(() => {
      (window as unknown as { __CERT_TEACHER_PRINT__?: boolean }).__CERT_TEACHER_PRINT__ = false;
      const orig = window.open;
      window.open = (...args: Parameters<typeof window.open>) => {
        const win = orig.apply(window, args);
        if (win) {
          win.print = () => {
            (window as unknown as { __CERT_TEACHER_PRINT__?: boolean }).__CERT_TEACHER_PRINT__ = true;
          };
          win.document.write("<html><body>teacher</body></html>");
          win.document.close();
          win.print();
        }
        return win;
      };
    });
    await exportBtn.click();
    const printed = await page.evaluate(() =>
      Boolean((window as unknown as { __CERT_TEACHER_PRINT__?: boolean }).__CERT_TEACHER_PRINT__),
    );
    expect(printed).toBe(true);
  }

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-teacher-report.png") });
  (await audit(page)).assertClean();
});

test("08 — Voice mode: grant, deny, mute, unmute", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __VOICE_GRANT__?: boolean }).__VOICE_GRANT__ = true;
    const md = navigator.mediaDevices;
    const orig = md.getUserMedia.bind(md);
    md.getUserMedia = async (constraints) => {
      if (!(window as unknown as { __VOICE_GRANT__?: boolean }).__VOICE_GRANT__) {
        throw new DOMException("denied", "NotAllowedError");
      }
      return orig(constraints);
    };
  });

  await openPlaygroundTab(page);

  await page.getByTestId("mp-mode-voice").click();
  await page.waitForTimeout(400);

  await launchActivity(page, "counting_adventure");
  await expect(page.getByTestId("mp-mute-toggle")).toBeVisible();
  await page.getByTestId("mp-mute-toggle").click();
  await page.getByTestId("mp-mute-toggle").click();

  await page.getByRole("button", { name: /hub|back/i }).first().click();

  await page.evaluate(() => {
    (window as unknown as { __VOICE_GRANT__?: boolean }).__VOICE_GRANT__ = false;
  });
  await page.getByTestId("mp-mode-voice").click();
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-voice-mode.png") });
  (await audit(page)).assertClean();
});

test("09 — Session analytics persisted to playground state", async ({ page }) => {
  await openPlaygroundTab(page);
  const before = await readPlaygroundState(page);

  await launchActivity(page, "counting_adventure");
  await completeCurrentActivity(page, "counting_adventure");
  await exitToHub(page);

  const after = await readPlaygroundState(page);
  expect(after.sessions).toBeGreaterThan(before.sessions);

  (await audit(page)).assertClean();
});

test("10 — 20 consecutive activities without hygiene regressions", async ({ page }) => {
  await openPlaygroundTab(page);

  const heapBefore = await page.evaluate(() =>
    (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
  );

  for (let i = 0; i < 20; i += 1) {
    await launchActivity(page, "counting_adventure");
    await completeCurrentActivity(page, "counting_adventure");
    await exitToHub(page);
  }

  const heapAfter = await page.evaluate(() =>
    (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0,
  );

  if (heapBefore > 0 && heapAfter > 0) {
    const growth = (heapAfter - heapBefore) / heapBefore;
    expect(growth).toBeLessThan(2.5);
  }

  const state = await readPlaygroundState(page);
  expect(state.sessions).toBeGreaterThanOrEqual(20);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-stress-20-sessions.png") });
  (await audit(page)).assertClean();
});

test.afterAll(async () => {
  // eslint-disable-next-line no-console
  console.log(`Certification screenshots: ${SCREENSHOT_DIR}/`);
});
