/**
 * Weekly Amy voice struggle review — run for product/teaching iteration.
 *
 *   pnpm --filter @workspace/scripts run review:amy-voice-weekly
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO_ROOT } from "../static-audio-paths.js";

const KIDSCHEDULE = join(REPO_ROOT, "artifacts/kidschedule");

console.log("Amy voice weekly struggle review\n");
console.log("Review cadence:");
console.log("  1. Inspect analytics.weeklyStruggleReview in client telemetry");
console.log("  2. Categorize top phrases: phonics | clarity | content");
console.log("  3. Queue static audio for phonics/clarity hits");
console.log("  4. Adjust teaching logic via cohort + experiment results\n");

const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "src/lib/amy-voice-struggle-insights.test.ts"],
  { cwd: KIDSCHEDULE, stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("\nWeekly review checks passed. Export live telemetry for production insights.");
