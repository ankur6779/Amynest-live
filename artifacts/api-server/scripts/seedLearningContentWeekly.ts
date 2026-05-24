/**
 * Weekly pre-seed for learning load-more pools + server-side TTS warm.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server seed:learning-weekly
 */
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
config({ path: resolve(repoRoot, ".env") });
config({ path: resolve(repoRoot, "Amynest-backend-dykj.env"), override: true });

async function main() {
  const { runWeeklyLearningContentSeed } = await import(
    "../src/services/learningContentSeedService.js"
  );
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
