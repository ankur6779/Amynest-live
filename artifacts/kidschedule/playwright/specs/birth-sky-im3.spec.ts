/**
 * Birth Sky IM-3 smoke — Tradition/Reflect chrome absent when flag off.
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-3", () => {
  test("flag off: tradition and reflect segments not present", async ({ page }) => {
    await page.goto("/birth-sky/app/tradition");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-tradition-segment")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-reflect-segment")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-tradition-intro")).toHaveCount(0);
  });
});
