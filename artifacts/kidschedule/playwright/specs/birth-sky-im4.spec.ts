/**
 * Birth Sky IM-4 smoke — AI sheet absent when flag off.
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-4", () => {
  test("flag off: Ask Amy sheet not present", async ({ page }) => {
    await page.goto("/birth-sky/app/reflect");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-ai-sheet")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-ask-amy")).toHaveCount(0);
  });
});
