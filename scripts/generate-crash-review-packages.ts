/**
 * Generate engineering review packages → artifacts/crash-review/<fingerprint>.md
 * Read-only — never modifies application source.
 *
 *   pnpm run crash:generate-review-packages
 *   DATABASE_URL=... pnpm run crash:generate-review-packages  # includes live aggregates
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  const { writeAllReviewPackages } = await import(
    "../artifacts/api-server/src/services/crash-intelligence/review-package.js"
  );
  const { listMappedFingerprints } = await import(
    "../artifacts/api-server/src/services/crash-intelligence/fix-candidate-engine.js"
  );

  console.log("\n[crash:generate-review-packages] Fix Candidate Engine\n");
  console.log(`  Mapped fingerprints: ${listMappedFingerprints().length}`);
  console.log(`  Mode: ${process.env.DATABASE_URL ? "live aggregates" : "playbook-only"}\n`);

  const paths = await writeAllReviewPackages({ minSeverity: "P1" });

  for (const p of paths) {
    console.log(`  ✔ ${p.replace(REPO_ROOT + "/", "")}`);
  }

  console.log(`\n[crash:generate-review-packages] Wrote ${paths.length} review packages.\n`);
}

void main();
