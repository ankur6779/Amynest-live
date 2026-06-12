import { test } from "@playwright/test";
import { signInWithEmail } from "../helpers/auth";
import { verifyAudioPlayback } from "../helpers/audio-playback";
import { primeUserGesture, openParentingHubTile } from "../helpers/hub-navigation";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function triggerPhonics(page: import("@playwright/test").Page) {
  await page.goto("/phonics", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForTimeout(2_000);
  await primeUserGesture(page);
  const toddler = page.getByRole("button", { name: /Audit-Toddler/i });
  if (await toddler.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await toddler.click({ timeout: 8_000 });
    await page.waitForTimeout(800);
  }
  const cta = page.getByTestId("phonics-primary-cta");
  if (await cta.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await cta.click({ timeout: 10_000 });
    await page.waitForTimeout(1_000);
  }
  const practice = page.getByTestId("phonics-practice-sounds");
  await practice.scrollIntoViewIfNeeded({ timeout: 45_000 });
  await practice.waitFor({ state: "visible", timeout: 45_000 });
  let playByTestId = page.locator('[data-testid^="audio-play-"]').first();
  if (!(await playByTestId.isVisible({ timeout: 8_000 }).catch(() => false))) {
    await openParentingHubTile(page, { group: "learning", tileId: "phonics" });
    await page.getByTestId("phonics-practice-sounds").scrollIntoViewIfNeeded({ timeout: 30_000 });
    playByTestId = page.locator('[data-testid^="audio-play-"]').first();
  }
  await playByTestId.waitFor({ state: "visible", timeout: 25_000 });
  await playByTestId.click({ timeout: 12_000 });
  await page.waitForTimeout(1_500);
}

test("phonics probe only", async ({ page }) => {
  await signInWithEmail(page);
  await triggerPhonics(page);
  const audio = await verifyAudioPlayback(page);
  const out = join(process.cwd(), "..", "..", "audit", "phonics-probe-result.json");
  writeFileSync(out, JSON.stringify({ audio, url: page.url() }, null, 2));
  mkdirSync(join(process.cwd(), "..", "..", "audit", "screenshots", "blocker-investigation"), { recursive: true });
  await page.screenshot({
    path: join(process.cwd(), "..", "..", "audit", "screenshots", "blocker-investigation", "phonics-signed-in.png"),
    fullPage: true,
  });
  console.log(JSON.stringify(audio, null, 2));
});
