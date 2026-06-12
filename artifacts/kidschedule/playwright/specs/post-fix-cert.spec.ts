/**
 * Post-fix certification — Amy Coach, Conversation Coach, Story Hub, Rhymes, Phonics, Infant Lullaby.
 *
 * Run (local prod build):
 *   pnpm --filter @workspace/kidschedule build
 *   pnpm exec vite preview --host 127.0.0.1 --port 4173
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 \
 *   STRESS_TEST_EMAIL=demo@amynest.in STRESS_TEST_PASSWORD='AmyNest@2025' \
 *   pnpm exec playwright test playwright/specs/post-fix-cert.spec.ts \
 *     --config playwright.config.audio-coverage.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { signInWithEmail } from "../helpers/auth";
import { verifyAudioPlayback } from "../helpers/audio-playback";
import {
  triggerAmyCoach,
  triggerConversationCoach,
  triggerParentHubStory,
  triggerRhymes,
  triggerPhonics,
  triggerInfantLullaby,
} from "../helpers/audio-coverage";

const OUT = join(process.cwd(), "..", "..", "audit", "post-fix-certification.json");

const CERT_FEATURES = [
  { id: "amy_coach", label: "Amy Coach", trigger: triggerAmyCoach },
  { id: "conversation_coach", label: "Conversation Coach", trigger: triggerConversationCoach },
  { id: "parent_hub_story", label: "Story Hub", trigger: triggerParentHubStory },
  { id: "rhymes", label: "Rhymes", trigger: triggerRhymes },
  { id: "phonics", label: "Phonics", trigger: triggerPhonics },
  { id: "infant_lullaby", label: "Infant Lullaby", trigger: triggerInfantLullaby },
] as const;

test.describe("Post-fix certification", () => {
  test("six launch surfaces", async ({ page }) => {
    test.setTimeout(600_000);
    mkdirSync(join(process.cwd(), "..", "..", "audit"), { recursive: true });

    await signInWithEmail(page);
    const results: Record<string, unknown>[] = [];

    for (const feature of CERT_FEATURES) {
      let triggerError: string | null = null;
      try {
        await feature.trigger(page);
      } catch (e) {
        triggerError = e instanceof Error ? e.message : String(e);
      }
      const audio = await verifyAudioPlayback(page);
      const pass = !triggerError && audio.ok;
      results.push({
        id: feature.id,
        label: feature.label,
        verdict: pass ? "PASS" : "FAIL",
        triggerError,
        audioReason: audio.reason,
        checks: audio.checks,
      });
      writeFileSync(
        OUT,
        JSON.stringify(
          {
            validatedAt: new Date().toISOString(),
            baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in",
            passed: results.filter((r) => r.verdict === "PASS").length,
            total: CERT_FEATURES.length,
            audioCoveragePct: Math.round(
              (results.filter((r) => r.verdict === "PASS").length / CERT_FEATURES.length) * 100,
            ),
            results,
          },
          null,
          2,
        ),
      );
      expect.soft(pass, `${feature.label}: ${triggerError ?? audio.reason}`).toBe(true);
    }

    const passed = results.filter((r) => r.verdict === "PASS").length;
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          validatedAt: new Date().toISOString(),
          baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "https://www.amynest.in",
          passed,
          total: results.length,
          audioCoveragePct: Math.round((passed / results.length) * 100),
          results,
        },
        null,
        2,
      ),
    );
  });
});
