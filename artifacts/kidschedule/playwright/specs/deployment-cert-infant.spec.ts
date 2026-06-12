import { test } from "@playwright/test";
import { signInWithEmail, dismissCountryPromptIfVisible } from "../helpers/auth";
import { verifyAudioPlayback } from "../helpers/audio-playback";
import { AUDIO_COVERAGE_FEATURES } from "../helpers/audio-coverage";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "..", "..", "audit", "deployment-cert-infant.json");
const SS = join(process.cwd(), "..", "..", "audit", "screenshots", "deployment-cert");
const IDS = new Set(["infant_story", "infant_poem"]);

test("deployment cert infant playback", async ({ page }) => {
  mkdirSync(SS, { recursive: true });
  await signInWithEmail(page);
  await dismissCountryPromptIfVisible(page);

  const results = [];
  for (const feature of AUDIO_COVERAGE_FEATURES.filter((f) => IDS.has(f.id))) {
    let triggerError: string | null = null;
    try {
      await feature.trigger(page);
    } catch (e) {
      triggerError = e instanceof Error ? e.message : String(e);
    }
    const audio = await verifyAudioPlayback(page);
    await page.screenshot({ path: join(SS, `${feature.id}.png`), fullPage: true });
    results.push({
      id: feature.id,
      label: feature.label,
      triggerError,
      playback: audio,
      pass: !triggerError && audio.ok,
    });
  }

  // Lullaby: reuse infant hub sleep module lullabies tab
  let lullaby = { pass: false, triggerError: null as string | null, playback: null as unknown };
  try {
    await page.goto("/parenting-hub#tile-infant-hub", { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(2000);
    const infantBtn = page.getByRole("button").filter({ hasText: /Audit-Infant|0-12|Infant/i }).first();
    if (await infantBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await infantBtn.click({ timeout: 8000 });
      await page.waitForTimeout(1000);
    }
    const lullTab = page.getByRole("tab", { name: /^lullabies$/i });
    if (await lullTab.isVisible({ timeout: 8000 }).catch(() => false)) {
      await lullTab.click({ timeout: 8000 });
      await page.waitForTimeout(800);
      const tile = page.locator('[data-testid^="sleep-track-tile-"]').first();
      await tile.click({ timeout: 12000 });
      await page.waitForTimeout(1500);
      const playBtn = page.getByTestId("sleep-track-fullscreen-player").locator("button.h-16.w-16");
      if (await playBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await playBtn.click({ timeout: 8000 });
        await page.waitForTimeout(1500);
      }
      const audio = await verifyAudioPlayback(page);
      lullaby = { pass: audio.ok, triggerError: null, playback: audio };
      await page.screenshot({ path: join(SS, "infant_lullaby.png"), fullPage: true });
    } else {
      lullaby.triggerError = "lullabies_tab_not_visible";
    }
  } catch (e) {
    lullaby.triggerError = e instanceof Error ? e.message : String(e);
  }
  results.push({ id: "infant_lullaby", label: "Infant Lullaby", ...lullaby });

  writeFileSync(OUT, JSON.stringify({ validatedAt: new Date().toISOString(), results }, null, 2));
});
