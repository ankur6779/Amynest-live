/**
 * Capture AFTER screenshots for UX Stabilization Release.
 * Run: pnpm --filter @workspace/kidschedule exec playwright test -c playwright.config.ts specs/ux-stabilization-screenshots.spec.ts
 */
import { test } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 640 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
] as const;

const ROUTES = [
  { name: "dashboard", path: "/dashboard" },
  { name: "parenting-hub", path: "/parenting-hub" },
  { name: "routines", path: "/routines" },
  { name: "amy-coach", path: "/amy-coach" },
  { name: "sign-in", path: "/sign-in" },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`screenshot ${route.name}`, async ({ page }) => {
        await page.goto(route.path, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `playwright/artifacts/ux-stabilization/after/${viewport.name}-${route.name}.png`,
          fullPage: true,
        });
      });
    }
  });
}
