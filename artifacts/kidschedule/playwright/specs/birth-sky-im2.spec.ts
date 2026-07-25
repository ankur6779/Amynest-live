/**
 * Birth Sky IM-2 smoke — Dashboard chrome absent when flag off.
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-2", () => {
  test("flag off: dashboard hero not present", async ({ page }) => {
    await page.goto("/birth-sky/app/sky");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-dashboard-hero")).toHaveCount(0);
  });
});
