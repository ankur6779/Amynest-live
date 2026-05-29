/**
 * Startup reliability — React must render under degraded dependencies.
 *
 * Run:
 *   pnpm --filter @workspace/kidschedule exec playwright test --config playwright.config.startup.ts
 */
import { test, expect } from "@playwright/test";

async function waitForReactRendered(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as Window & {
        __amynestStartupState?: { reactRendered?: boolean };
        __amynestDiag?: () => { phases?: string[] } | null;
      };
      if (w.__amynestStartupState?.reactRendered) return true;
      const d = w.__amynestDiag?.();
      return Boolean(d?.phases?.includes("react-rendered"));
    },
    { timeout: 45_000 },
  );
}

async function expectNoBootTimeout(page: import("@playwright/test").Page): Promise<void> {
  const crash = page.locator("#amynest-crash-overlay");
  await expect(crash).toHaveCount(0, { timeout: 2_000 });
  const text = page.getByText(/did not finish loading/i);
  await expect(text).toHaveCount(0, { timeout: 1_000 });
}

test.describe("startup reliability", () => {
  test("first install: React renders on /pricing", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
    const state = await page.evaluate(() => window.__amynestStartupState);
    expect(state?.reactRendered).toBe(true);
  });

  test("upgrade install: deploy version mismatch still renders before reload", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("amynest:deploy-version", "synthetic-version-a");
    });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("offline after first render: shell stays mounted without boot-timeout", async ({
    page,
    context,
  }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await context.setOffline(true);
    await expectNoBootTimeout(page);
    const state = await page.evaluate(() => window.__amynestStartupState?.reactRendered);
    expect(state).toBe(true);
  });

  test("slow 3G: reactRendered within watchdog window", async ({ page, context }) => {
    const slow = context.route("**/*", async (route) => {
      await new Promise((r) => setTimeout(r, 50));
      await route.continue();
    });
    void slow;
    await page.goto("/pricing", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("service worker registration failure does not block React", async ({ page }) => {
    await page.route("**/sw.js**", (route) => route.abort());
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("Firebase CDN blocked: shell still renders", async ({ page }) => {
    await page.route("**/*googleapis.com/**", (route) => route.abort());
    await page.route("**/*firebaseio.com/**", (route) => route.abort());
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("RevenueCat blocked: shell still renders", async ({ page }) => {
    await page.route("**/*revenuecat**", (route) => route.abort());
    await page.route("**/*api.revenue.cat/**", (route) => route.abort());
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("cache clear failure: React still renders", async ({ page }) => {
    await page.addInitScript(() => {
      const cachesApi = window.caches;
      if (!cachesApi) return;
      cachesApi.keys = () => Promise.reject(new Error("synthetic_cache_clear_failure"));
    });
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });

  test("delayed main chunk: progress extension avoids false boot-timeout", async ({
    page,
  }) => {
    let delayMain = true;
    await page.route("**/main*.tsx", async (route) => {
      if (delayMain) {
        delayMain = false;
        await new Promise((r) => setTimeout(r, 4_000));
      }
      await route.continue();
    });
    await page.goto("/pricing", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await waitForReactRendered(page);
    await expectNoBootTimeout(page);
  });
});
