import { test, expect } from "@playwright/test";
import { dismissCountryPromptIfVisible } from "../helpers/auth";

const email =
  process.env.E2E_ONBOARDING_EMAIL ??
  process.env.STRESS_TEST_EMAIL ??
  "";
const password =
  process.env.E2E_ONBOARDING_PASSWORD ??
  process.env.STRESS_TEST_PASSWORD ??
  "";

const hasCredentials = Boolean(email && password);

async function waitForReactBoot(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const w = window as Window & {
        __amynestAppCoreReady?: boolean;
        __amynestStartupState?: { reactRendered?: boolean };
      };
      return w.__amynestAppCoreReady === true || w.__amynestStartupState?.reactRendered === true;
    },
    { timeout: 60_000 },
  );
}

test.describe("onboarding completion smoke", () => {
  test.skip(!hasCredentials, "Set E2E_ONBOARDING_EMAIL and E2E_ONBOARDING_PASSWORD");

  test("Sign Up → Login → Finish Setup → Dashboard", async ({ page }) => {
    await page.goto("/sign-up", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForReactBoot(page);

    const signUpEmail = page.locator('input[type="email"]').first();
    await signUpEmail.waitFor({ state: "visible", timeout: 30_000 });
    await signUpEmail.fill(email);
    await page.locator('input[type="password"]').first().fill(password);

    await page.locator('form button[type="submit"]').first().click();

    await page.waitForURL(
      (url) =>
        !url.pathname.includes("/sign-up") &&
        !url.pathname.includes("/sign-in") &&
        !url.pathname.includes("/login"),
      { timeout: 120_000 },
    );

    await dismissCountryPromptIfVisible(page);

    if (page.url().includes("/onboarding")) {
      const finishButton = page.getByRole("button", { name: /finish setup/i });
      if (await finishButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await finishButton.click();
        await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
      } else {
        await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
      }
    } else {
      await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    }

    expect(page.url()).toMatch(/\/dashboard/);
    await expect(page.locator("body")).not.toContainText(/Refreshing AmyNest/i);
  });
});

test.describe("app boot smoke (no credentials)", () => {
  test("pricing route renders React without crash overlay", async ({ page }) => {
    await page.goto("/pricing", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await waitForReactBoot(page);

    await expect(page.locator("#amynest-crash-overlay")).toHaveCount(0);
    await expect(page.getByText(/did not finish loading/i)).toHaveCount(0);

    const state = await page.evaluate(
      () =>
        (window as Window & { __amynestStartupState?: { reactRendered?: boolean } })
          .__amynestStartupState?.reactRendered,
    );
    expect(state).toBe(true);
  });
});
