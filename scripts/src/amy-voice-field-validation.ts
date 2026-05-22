/**
 * Amy voice field validation runner — CI gate + manual real-world checklist.
 *
 *   pnpm --filter @workspace/scripts run validate:amy-voice-field
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO_ROOT } from "../static-audio-paths.js";

const KIDSCHEDULE = join(REPO_ROOT, "artifacts/kidschedule");

const tests = [
  "src/lib/amy-voice-health.test.ts",
  "src/lib/amy-voice-golden.test.ts",
  "src/lib/amy-voice-field-validation.test.ts",
  "src/lib/amy-voice-cohorts.test.ts",
  "src/lib/amy-voice-experiments.test.ts",
  "src/lib/amy-voice-struggle-insights.test.ts",
  "src/lib/amy-voice-delivery-profile.test.ts",
  "src/lib/amy-voice-invariants.test.ts",
  "src/lib/amy-voice-governance.test.ts",
];

console.log("Amy voice field validation\n");
console.log("Success targets:");
console.log("  fallbackRate < 5%");
console.log("  avgReplayCount < 1.6");
console.log("  stable session duration (±35% baseline, sustained alerts only)\n");

const result = spawnSync("pnpm", ["exec", "vitest", "run", ...tests], {
  cwd: KIDSCHEDULE,
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\nManual real-world checklist:");
console.log("  1. Low-end device: open DEV build, run __amyVoiceValidation.run({ forceLowEndDevice: true })");
console.log("  2. Poor network: Chrome DevTools → Network → Slow 3G, replay lesson paragraphs");
console.log("  3. User patterns: observe analytics.topStrugglePhrases after a study/audio-lesson session");
console.log("  4. Alert noise: confirm health alerts only after 25+ speaks and 3 sustained evaluations\n");
console.log("Field validation passed.");
