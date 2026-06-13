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

async function assertLibrary(): Promise<void> {
  const results = await runPhonicsLibraryChecks();
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

function runRouteGate(): void {
  console.log("[check:phonics-release-gate] Running route permanent-fix gate…\n");
  const result = spawnSync("pnpm", ["--filter", "@workspace/scripts", "run", "check-phonics-route-gate"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — route gate failed.\n");
    process.exit(result.status ?? 1);
  }
}

function runInteractionGate(): void {
  console.log("[check:phonics-release-gate] Running interaction gate…\n");
  const result = spawnSync("pnpm", ["--filter", "@workspace/scripts", "run", "check-phonics-interaction-gate"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — interaction gate failed.\n");
    process.exit(result.status ?? 1);
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
      "src/lib/phonics-bundled-manifest.test.ts",
      "src/lib/phonics-item-guards.test.ts",
      "src/lib/phonics-journey-habit.test.ts",
      "src/lib/phonics-journey-adaptive.test.ts",
      "src/lib/static-audio-guard.test.ts",
      "src/lib/phonics-circuit-breaker.test.ts",
      "src/lib/phonics-safe-audio.test.ts",
      "src/lib/phonics-player.test.ts",
      "src/lib/phonics-audio-engine.test.ts",
    ],
    { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, PHONICS_LIBRARY_SKIP_CHECK: "0" } },
  );
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — phonics smoke tests failed.\n");
    process.exit(result.status ?? 1);
  }
  console.log("\n[check:phonics-release-gate] PASS — release gate clear.\n");
}

function runAudioCertification(): void {
  console.log("[check:phonics-release-gate] Running audio certification…\n");
  const result = spawnSync("pnpm", ["--filter", "@workspace/scripts", "run", "check-phonics-audio-certification"], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — audio certification failed.\n");
    process.exit(result.status ?? 1);
  }
}

async function runAudioCoverageCertify(): Promise<void> {
  console.log("[check:phonics-release-gate] Running full audio coverage certify…\n");
  const result = spawnSync(
    "pnpm",
    ["phonics:audio:certify"],
    { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, PHONICS_AUDIO_SKIP_CERTIFY: "0" } },
  );
  if (result.status !== 0) {
    console.error("\n[check:phonics-release-gate] FAIL — phonics audio coverage certify failed.\n");
    process.exit(result.status ?? 1);
  }
}

void (async () => {
  await assertLibrary();
  await runAudioCoverageCertify();
  runAudioCertification();
  runRouteGate();
  runInteractionGate();
  runSmokeTests();
})();
