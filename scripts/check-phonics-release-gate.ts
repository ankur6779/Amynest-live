/**
 * Release gate — manifest integrity + phonics playback smoke tests.
 * No skip env honored here (deploy must fail if incomplete).
 *
 *   pnpm run check:phonics-release-gate
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runPhonicsLibraryChecks } from "./check-phonics-library.js";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function assertLibrary(): void {
  const results = runPhonicsLibraryChecks();
  console.log("\n[check:phonics-release-gate] LIBRARY + MANIFEST\n");
  for (const r of results) {
    const icon = r.ok ? "✔" : "✗";
    console.log(`  ${icon} [${r.id}] ${r.label}${r.detail ? `\n      ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n  ${results.length - failed}/${results.length} passed\n`);
  if (failed > 0) {
    console.error("[check:phonics-release-gate] FAIL — library/manifest not release-ready.\n");
    process.exit(1);
  }
}

function runSmokeTests(): void {
  console.log("[check:phonics-release-gate] Running phonics smoke tests…\n");
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/kidschedule",
      "exec",
      "vitest",
      "run",
      "src/lib/phonics-smoke.test.ts",
      "src/lib/phonics-manifest-validation.test.ts",
      "src/lib/static-audio-guard.test.ts",
      "src/lib/phonics-circuit-breaker.test.ts",
      "src/lib/phonics-safe-audio.test.ts",
      "src/lib/phonics-player.test.ts",
    ],
    { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, PHONICS_LIBRARY_SKIP_CHECK: "0" } },
  );
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — phonics smoke tests failed.\n");
    process.exit(result.status ?? 1);
  }
  console.log("\n[check:phonics-release-gate] PASS — release gate clear.\n");
}

assertLibrary();
runSmokeTests();
