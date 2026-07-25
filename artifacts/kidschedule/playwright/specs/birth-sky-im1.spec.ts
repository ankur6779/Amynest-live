/**
 * Birth Sky IM-1 smoke — flag-gated.
 * Enable with VITE_FF_BIRTH_SKY=1 against a running web+api stack.
 *
 * Full Create→Reveal E2E requires auth + DB tables (birth_profiles, sky_snapshots).
 * This smoke verifies kill-switch / unavailable when flag off (default CI).
 */
import { test, expect } from "@playwright/test";

test.describe("Birth Sky IM-1", () => {
  test("flag off: /birth-sky does not expose setup create CTA", async ({ page }) => {
    await page.goto("/birth-sky");
    // Unauthenticated apps redirect; when module loads with flag off, create CTA absent.
    await page.waitForTimeout(500);
    await expect(page.getByTestId("birth-sky-create")).toHaveCount(0);
  });
});
