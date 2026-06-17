/**
 * Phase 9 — ElevenLabs regeneration GO / NO-GO aggregator.
 *
 * Single command that verifies EVERY precondition before the (paid, irreversible)
 * regeneration runbook may start:
 *   1. canonical phoneme registry valid
 *   2. provider/voice/model metadata canonical
 *   3. cache versioning wired (SW + IndexedDB)
 *   4. mastery-driven prewarm integration present
 *   5. human audio review approved
 * Exit 1 on any NO-GO.
 *
 *   pnpm --filter @workspace/scripts run check-phonics-regeneration-readiness
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PHONICS_AUDIO_PROVIDER,
  PHONICS_CANONICAL_MODEL_ID,
  PHONICS_CANONICAL_VOICE_ID,
  PHONICS_CURRICULUM_VERSION,
  PHONICS_PHONEME_VERSION,
  validateAudioReviewApproval,
  validatePhonemeRegistry,
  type AudioReviewApproval,
} from "@workspace/phonics-sounds";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function fileIncludes(relPath: string, needles: string[]): boolean {
  try {
    const text = readFileSync(join(repoRoot, relPath), "utf8");
    return needles.every((n) => text.includes(n));
  } catch {
    return false;
  }
}

// 1. Phoneme registry
const registryIssues = validatePhonemeRegistry();
checks.push({
  name: "Canonical phoneme registry",
  ok: registryIssues.length === 0,
  detail: registryIssues.length === 0 ? "no collisions" : `${registryIssues.length} issue(s)`,
});

// 2. Provider metadata canonical
const providerOk =
  PHONICS_AUDIO_PROVIDER === "elevenlabs" &&
  PHONICS_CANONICAL_VOICE_ID.length > 0 &&
  PHONICS_CANONICAL_MODEL_ID.length > 0;
checks.push({
  name: "Provider/voice/model canonical",
  ok: providerOk,
  detail: `${PHONICS_AUDIO_PROVIDER} / ${PHONICS_CANONICAL_VOICE_ID} / ${PHONICS_CANONICAL_MODEL_ID}`,
});

// 3. Cache versioning wired (service worker + IndexedDB)
const swVersioned = fileIncludes("artifacts/kidschedule/vite.config.ts", ["AUDIO_CACHE_VERSION"]);
const idbVersioned = fileIncludes("artifacts/kidschedule/src/lib/local-tts-cache.ts", [
  "AUDIO_ASSET_VERSION",
  "reconcileLocalAudioCacheVersion",
]);
checks.push({
  name: "Audio cache versioning (SW + IndexedDB)",
  ok: swVersioned && idbVersioned,
  detail: `sw=${swVersioned} idb=${idbVersioned}`,
});

// 4. Mastery-driven prewarm integration
const predictionModule = fileIncludes("artifacts/kidschedule/src/lib/phonics-v3/learning-path.ts", [
  "buildLearningPathPrediction",
  "buildSessionAssetBundle",
]);
const prewarmWired = fileIncludes("artifacts/kidschedule/src/lib/phonics-predictive-prewarm.ts", [
  "buildLearningPathPrediction",
  "resolvePrewarmBudget",
]);
const hubWired = fileIncludes("artifacts/kidschedule/src/pages/parenting-hub.tsx", [
  "schedulePhonicsPredictivePrewarm",
  "childId: numericChildId",
]);
checks.push({
  name: "Mastery-driven prewarm integration",
  ok: predictionModule && prewarmWired && hubWired,
  detail: `prediction=${predictionModule} prewarm=${prewarmWired} hub=${hubWired}`,
});

// 5. Human audio review approved
let reviewApproval: Partial<AudioReviewApproval> | undefined;
try {
  reviewApproval = JSON.parse(
    readFileSync(join(here, "phonics-audio-review-approval.json"), "utf8"),
  ) as AudioReviewApproval;
} catch {
  reviewApproval = undefined;
}
const reviewIssues = validateAudioReviewApproval(reviewApproval, {
  curriculumVersion: PHONICS_CURRICULUM_VERSION,
  phonemeVersion: PHONICS_PHONEME_VERSION,
});
checks.push({
  name: "Human audio review approved",
  ok: reviewIssues.length === 0,
  detail: reviewIssues.length === 0 ? `by ${reviewApproval?.reviewer}` : `${reviewIssues.length} unmet`,
});

console.log("── Phonics regeneration readiness (GO/NO-GO) ──\n");
for (const c of checks) {
  console.log(`  ${c.ok ? "✔" : "✖"} ${c.name} — ${c.detail}`);
}

const blocking = checks.filter((c) => !c.ok);
if (blocking.length > 0) {
  console.error(`\n✖ NO-GO — ${blocking.length} blocking check(s). Do NOT start regeneration.`);
  process.exit(1);
}

console.log("\n✔ GO — all preconditions met. Regeneration runbook may proceed.");
