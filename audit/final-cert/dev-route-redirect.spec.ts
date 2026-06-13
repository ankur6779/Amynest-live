/**
 * Verify dev routes redirect client-side in production.
 */
import { test, expect } from "@playwright/test";

const DEV_ROUTES = [
  { path: "/debug-parity", expectPath: "/dashboard" },
  { path: "/dev/phonics-audio-preview", expectPath: "/dashboard" },
  { path: "/dev/rhymes-audio-ab", expectPath: "/dashboard" },
];

test.describe("Dev route redirect (production)", () => {
  for (const { path, expectPath } of DEV_ROUTES) {
    test(`${path} redirects to ${expectPath}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(3_000);
      const url = page.url();
      const stillOnDevSurface =
        url.includes("/debug-parity") ||
        url.includes("/dev/phonics-audio-preview") ||
        url.includes("/dev/rhymes-audio-ab");
      expect(stillOnDevSurface, `Dev surface still public: ${url}`).toBe(false);
      expect(url.includes("/dashboard") || url.includes("/sign-in"), url).toBe(true);
    });
  }

  test("/debug/learning requires auth (not public dev surface)", async ({ page }) => {
    await page.goto("/debug/learning", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(2_000);
    const url = page.url();
    const onSignIn = url.includes("/sign-in");
    const onDebug = url.includes("/debug/learning");
    expect(onSignIn || !onDebug, `Unauthenticated access to debug/learning: ${url}`).toBe(true);
  });
});
