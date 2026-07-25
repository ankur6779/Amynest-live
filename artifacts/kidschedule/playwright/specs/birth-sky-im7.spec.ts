/**
 * Birth Sky IM-7 smoke — release readiness probes (no deployment).
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-7", () => {
  test("kill switch: dashboard unavailable when flag off", async ({ page }) => {
    await page.goto("/birth-sky/app/sky");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-dashboard")).toHaveCount(0);
  });

  test("no marketplace / plugin store surfaces", async ({ page }) => {
    await page.goto("/birth-sky/marketplace");
    await page.waitForTimeout(300);
    await expect(page.getByText(/plugin store|marketplace/i)).toHaveCount(0);
  });
});
