/**
 * Weekly pre-seed for learning load-more pools + server-side TTS warm.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server seed:learning-weekly
 *
 * Env:
 *   LEARNING_SEED_ITEMS_PER_KEY=14   (default: 14 ≈ 2/day for a week)
 *   LEARNING_SEED_SECTIONS=spelling,smart_math_tricks  (optional filter)
 *   LEARNING_SEED_DRY_RUN=true       (generate only, no DB/TTS writes)
 *   LEARNING_SEED_SKIP_TTS=true      (skip TTS warm)
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, "Amynest-backend-dykj.env"), override: true });

import { runWeeklyLearningContentSeed } from "../src/services/learningContentSeedService.js";

async function main() {
  console.log("=== Weekly Learning Content Seed ===\n");
  const stats = await runWeeklyLearningContentSeed();
  console.log(JSON.stringify(stats, null, 2));
  if (stats.keysFailed > 0 || stats.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
