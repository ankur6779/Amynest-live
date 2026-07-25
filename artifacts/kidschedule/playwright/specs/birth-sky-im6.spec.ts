/**
 * Birth Sky IM-6 smoke — Lens Platform must not alter frozen four-tab Birth Sky UX.
 * No marketplace / remote plugins.
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-6", () => {
  test("flag off: lens settings/app surfaces still unavailable", async ({ page }) => {
    await page.goto("/birth-sky/app/sky");
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-dashboard")).toHaveCount(0);
    await expect(page.getByTestId("birth-sky-segment-nav")).toHaveCount(0);
  });

  test("no marketplace or remote plugin UI routes", async ({ page }) => {
    await page.goto("/birth-sky/marketplace");
    await page.waitForTimeout(400);
    await expect(page.getByText(/marketplace|plugin store|remote plugin/i)).toHaveCount(0);
  });
});
