/**
 * Birth Sky IM-5 smoke — settings/privacy routes gated by flag; no Lens Platform.
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-5", () => {
  test("flag off: settings route unavailable", async ({ page }) => {
    await page.goto("/birth-sky/settings");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-settings")).toHaveCount(0);
  });

  test("flag off: privacy route unavailable", async ({ page }) => {
    await page.goto("/birth-sky/privacy");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-privacy")).toHaveCount(0);
  });
});
