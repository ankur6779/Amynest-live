/**
 * Math Playground mini-game e2e — isolated fixture with VITE_MP_MINI_GAMES=1.
 *
 * Run:
 *   pnpm --filter @workspace/kidschedule run test:e2e:math-playground
 */
import { test, expect } from "@playwright/test";

test("Pop Correct Answer mini game completes end to end", async ({ page }) => {
  await page.goto(
    "/playwright-math-playground.html?childId=7&childName=Sam&ageYears=5&mode=mini",
  );

  await expect(page.getByTestId("mp-fixture-mini")).toBeVisible();
  await expect(page.getByTestId("mp-mini-game")).toBeVisible();

  const completeMarker = page.getByTestId("mp-puzzle-complete");
  const choices = page.locator('[data-testid^="mp-mini-choice-"]');
  const count = await choices.count();
  expect(count).toBeGreaterThan(0);

  let solved = false;
  for (let i = 0; i < count; i += 1) {
    await choices.nth(i).click({ force: true });
    try {
      await completeMarker.waitFor({ state: "visible", timeout: 3_000 });
      solved = true;
      break;
    } catch {
      /* try next choice */
    }
  }

  expect(solved).toBe(true);
  await expect(completeMarker).toContainText("complete:");
});

test("Math Playground hub opens math puzzles activity", async ({ page }) => {
  await page.goto(
    "/playwright-math-playground.html?childId=7&childName=Sam&ageYears=5&mode=hub",
  );

  await expect(page.getByTestId("math-playground")).toBeVisible();
  await page.getByTestId("mp-activity-math_puzzles").click();
  await expect(page.getByTestId("mp-session")).toBeVisible({ timeout: 10_000 });
});
