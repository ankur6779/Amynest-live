/**
 * Full-app stress: login, rapid navigation, menu spam, API-heavy pages.
 *
 * Run:
 *   STRESS_TEST_EMAIL=... STRESS_TEST_PASSWORD=... \
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   pnpm --filter @workspace/kidschedule run test:stress
 */
import { test, expect } from "@playwright/test";
import { signInWithEmail, stressCredentials } from "../helpers/auth";

const ROUTES = [
  "/dashboard",
  "/routines",
  "/routines/generate",
  "/amy-coach",
  "/parenting-hub",
  "/children",
  "/progress",
  "/insights",
  "/behavior",
  "/assistant",
  "/games",
  "/recipes",
  "/nutrition",
  "/parent-profile",
  "/environment",
  "/life-skills",
  "/study",
];

const NAV_CYCLES = Number(process.env.STRESS_NAV_CYCLES ?? "60");

test.describe("AmyNest full-app stress", () => {
  test.beforeAll(() => {
    stressCredentials();
  });

  test("survives login + 60 navigations + rapid UI clicks", async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await signInWithEmail(page);

    for (let i = 0; i < NAV_CYCLES; i++) {
      const route = ROUTES[Math.floor(Math.random() * ROUTES.length)]!;
      try {
        await page.goto(route, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
        await page.waitForTimeout(600);
      } catch (e) {
        pageErrors.push(`NAV FAIL ${route}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Burger menu spam (mobile viewport)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const menuBtn = page.getByTestId("button-mobile-menu");
    if (await menuBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 15; i++) {
        try {
          await menuBtn.click({ timeout: 2000 });
          await page.waitForTimeout(150);
        } catch (e) {
          pageErrors.push(`MENU CLICK: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Dashboard generate CTA spam
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const genBtn = page.getByTestId("dashboard-generate-routine-btn");
    if (await genBtn.isVisible().catch(() => false)) {
      for (let i = 0; i < 8; i++) {
        try {
          await genBtn.click({ timeout: 2000 });
          await page.waitForTimeout(200);
        } catch {
          /* may navigate away */
        }
      }
    }

    const fatalVisible = await page
      .getByRole("alert")
      .filter({ hasText: /Something went wrong|Reload AmyNest/i })
      .isVisible()
      .catch(() => false);

    const crashLog = await page.evaluate(() => {
      const w = window as Window & { __amynestCrashLog?: Array<{ message: string }> };
      return w.__amynestCrashLog?.map((c) => c.message) ?? [];
    });

    const criticalPageErrors = pageErrors.filter(
      (m) => !m.includes("ResizeObserver") && !m.includes("Non-Error"),
    );

    expect(fatalVisible, "Fatal fallback UI visible").toBe(false);
    expect(
      criticalPageErrors.length,
      `Page errors:\n${criticalPageErrors.join("\n")}`,
    ).toBeLessThan(3);
    expect(
      crashLog.length,
      `Crash log:\n${crashLog.join("\n")}`,
    ).toBeLessThan(5);

    if (consoleErrors.length > 0) {
      console.info("[stress] console errors (sample):", consoleErrors.slice(0, 10));
    }
  });
});
