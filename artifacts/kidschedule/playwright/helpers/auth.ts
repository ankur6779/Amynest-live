import type { Page } from "@playwright/test";

const DEFAULT_EMAIL = process.env.STRESS_TEST_EMAIL ?? "";
const DEFAULT_PASSWORD = process.env.STRESS_TEST_PASSWORD ?? "";

export function stressCredentials(): { email: string; password: string } {
  if (!DEFAULT_EMAIL || !DEFAULT_PASSWORD) {
    throw new Error(
      "Set STRESS_TEST_EMAIL and STRESS_TEST_PASSWORD env vars for stress tests.",
    );
  }
  return { email: DEFAULT_EMAIL, password: DEFAULT_PASSWORD };
}

export async function signInWithEmail(page: Page): Promise<void> {
  const { email, password } = stressCredentials();
  await page.goto("/sign-in", { waitUntil: "networkidle", timeout: 90_000 });

  const emailInput = page.locator('input[type="email"]');
  if (!(await emailInput.isVisible({ timeout: 15_000 }).catch(() => false))) {
    const signInLink = page.getByRole("link", { name: /sign in/i }).first();
    if (await signInLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await signInLink.click();
    } else {
      await page.goto("/login", { waitUntil: "networkidle", timeout: 90_000 });
    }
    await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  }

  await emailInput.fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(
    (url) => !url.pathname.includes("/sign-in") && !url.pathname.includes("/login"),
    { timeout: 90_000 },
  );
  await page.waitForFunction(
    () => (window as Window & { __amynestAppCoreReady?: boolean }).__amynestAppCoreReady === true,
    { timeout: 45_000 },
  ).catch(() => {
    /* App may be ready without marker on slow networks */
  });
}
