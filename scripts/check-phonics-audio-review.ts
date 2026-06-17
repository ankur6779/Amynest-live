/**
 * Phase 8 certification gate — mandatory human audio review.
 *
 * BLOCKS ElevenLabs regeneration until a human reviewer has approved every
 * phoneme category in scripts/phonics-audio-review-approval.json. Exit 1 on any
 * pending/rejected/missing category or version mismatch.
 *
 *   pnpm --filter @workspace/scripts run check-phonics-audio-review
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PHONICS_CURRICULUM_VERSION,
  PHONICS_PHONEME_VERSION,
  PHONICS_REVIEW_CATEGORIES,
  validateAudioReviewApproval,
  type AudioReviewApproval,
} from "@workspace/phonics-sounds";

const here = dirname(fileURLToPath(import.meta.url));
const approvalPath = join(here, "phonics-audio-review-approval.json");

console.log("── Phonics human audio review gate ──");
console.log(`Approval file : ${approvalPath}`);
console.log(`Expected ver  : curriculum=${PHONICS_CURRICULUM_VERSION} phoneme=${PHONICS_PHONEME_VERSION}`);
console.log(`Categories    : ${PHONICS_REVIEW_CATEGORIES.join(", ")}`);

let approval: Partial<AudioReviewApproval> | undefined;
try {
  approval = JSON.parse(readFileSync(approvalPath, "utf8")) as AudioReviewApproval;
} catch (err) {
  console.error(`\n✖ FAIL — cannot read approval file: ${(err as Error).message}`);
  process.exit(1);
}

const issues = validateAudioReviewApproval(approval, {
  curriculumVersion: PHONICS_CURRICULUM_VERSION,
  phonemeVersion: PHONICS_PHONEME_VERSION,
});

if (issues.length > 0) {
  console.error(`\n✖ NO-GO — ${issues.length} unmet review requirement(s):`);
  for (const i of issues) console.error(`  • ${i.category}: ${i.problem}`);
  console.error("\nRegeneration is BLOCKED until every category is human-approved.");
  process.exit(1);
}

console.log(`\n✔ GO — all ${PHONICS_REVIEW_CATEGORIES.length} categories approved by "${approval?.reviewer}" at ${approval?.reviewedAt}.`);
