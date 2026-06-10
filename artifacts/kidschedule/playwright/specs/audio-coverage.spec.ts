/**
 * Post-deploy audio coverage — all major playback surfaces.
 *
 * Run (production):
 *   PLAYWRIGHT_BASE_URL=https://www.amynest.in \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   pnpm --filter @workspace/kidschedule exec playwright test \
 *     --config playwright.config.audio-coverage.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { dismissCountryPromptIfVisible, signInWithEmail } from "../helpers/auth";
import { AUDIO_COVERAGE_FEATURES } from "../helpers/audio-coverage";
import { verifyAudioPlayback } from "../helpers/audio-playback";

const OUT_DIR = join(process.cwd(), "playwright", "audio-coverage-artifacts");
const REPORT_PATH = join(OUT_DIR, "report.json");

type FeatureResult = {
  feature: string;
  id: string;
  verdict: "PASS" | "FAIL";
  triggerError: string | null;
  audioReason: string;
  checks: Record<string, unknown>;
  screenshot?: string;
};

function writeReport(detail: FeatureResult[]): void {
  const report = {
    validatedAt: new Date().toISOString(),
    features: detail.map((r) => ({
      feature: r.feature,
      verdict: r.verdict,
      reason: r.triggerError ?? r.audioReason,
      checks: r.checks,
      screenshot: r.screenshot,
    })),
    overall: detail.length > 0 && detail.every((r) => r.verdict === "PASS") ? "PASS" : "FAIL",
    detail,
  };
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

test.describe("Audio coverage", () => {
  test.beforeAll(() => {
    mkdirSync(OUT_DIR, { recursive: true });
  });

  test("all features", async ({ page }) => {
    const detail: FeatureResult[] = [];

    await signInWithEmail(page);
    await dismissCountryPromptIfVisible(page);

    for (const feature of AUDIO_COVERAGE_FEATURES) {
      let triggerError: string | null = null;
      try {
        await feature.trigger(page);
      } catch (e) {
        triggerError = e instanceof Error ? e.message : String(e);
      }

      const audio = await verifyAudioPlayback(page);
      const pass = !triggerError && audio.ok;

      const screenshotPath = join(OUT_DIR, `${feature.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

      detail.push({
        feature: feature.label,
        id: feature.id,
        verdict: pass ? "PASS" : "FAIL",
        triggerError,
        audioReason: audio.reason,
        checks: audio.checks as Record<string, unknown>,
        screenshot: screenshotPath,
      });
      writeReport(detail);

      expect.soft(triggerError, `${feature.label} navigation`).toBeNull();
      expect.soft(audio.ok, `${feature.label}: ${audio.reason} ${JSON.stringify(audio.checks)}`).toBe(true);
    }
  });
});
