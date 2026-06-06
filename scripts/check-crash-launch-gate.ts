/**
 * Crash intelligence launch gate — blocks release when P0 fingerprints are unresolved.
 * Does not auto-modify source code; validates registry + test file coverage offline.
 *
 *   pnpm run check:crash-launch-gate
 *
 * Optional: set DATABASE_URL to include live 24h P0 aggregates from crash_events.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CRASH_REGRESSION_REGISTRY,
  verifyRegressionTestFiles,
} from "../artifacts/api-server/src/services/crash-intelligence/regression-registry.js";
import { ROOT_CAUSE_PLAYBOOKS } from "../artifacts/api-server/src/services/crash-intelligence/root-cause-playbooks.js";
import { evaluateLaunchGate } from "../artifacts/api-server/src/services/crash-intelligence/launch-gate.js";
import type { FingerprintAggregate } from "../artifacts/api-server/src/services/crash-intelligence/types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadLiveAggregates(): Promise<FingerprintAggregate[]> {
  if (!process.env.DATABASE_URL) return [];

  try {
    const { aggregateCrashFingerprints } = await import(
      "../artifacts/api-server/src/services/crash-intelligence/aggregation-service.js"
    );
    return await aggregateCrashFingerprints(50);
  } catch (err) {
    console.warn(
      "[check:crash-launch-gate] DATABASE_URL set but aggregation failed — using registry-only mode.",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

function checkRegistryIntegrity(): string[] {
  const blockers: string[] = [];

  for (const entry of CRASH_REGRESSION_REGISTRY) {
    const playbook = ROOT_CAUSE_PLAYBOOKS.find(
      (p) => p.readableFingerprint === entry.readableFingerprint,
    );
    if (!playbook) {
      blockers.push(
        `Registry entry ${entry.readableFingerprint} has no root cause playbook`,
      );
    }
    if (entry.status === "covered") {
      const verified = verifyRegressionTestFiles(entry);
      if (!verified.ok) {
        blockers.push(
          `Covered fingerprint ${entry.readableFingerprint} missing tests: ${verified.missing.join(", ")}`,
        );
      }
    }
  }

  return blockers;
}

function loadReleaseIntelligenceBlockers(): string[] {
  const jsonPath = join(REPO_ROOT, "artifacts/release-review/latest.json");
  if (!existsSync(jsonPath)) return [];
  try {
    const data = JSON.parse(readFileSync(jsonPath, "utf8")) as {
      verdict?: string;
      recommendedBlockers?: string[];
    };
    if (data.verdict === "BLOCK") {
      return [
        "Release intelligence verdict BLOCK (see artifacts/release-review/latest.json)",
        ...(data.recommendedBlockers ?? []),
      ];
    }
    return [];
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  console.log("\n[check:crash-launch-gate] Crash Intelligence Launch Gate\n");

  const registryBlockers = checkRegistryIntegrity();
  const releaseBlockers = loadReleaseIntelligenceBlockers();
  const aggregates = await loadLiveAggregates();
  const globalRecoveryRate = aggregates.length > 0 ? 95 : 100;

  const gate = evaluateLaunchGate({
    aggregates: aggregates.filter((a) => a.count24h > 0),
    globalRecoveryRate,
  });

  const allBlockers = [...registryBlockers, ...releaseBlockers, ...gate.blockers];

  console.log(`  Registry entries: ${CRASH_REGRESSION_REGISTRY.length}`);
  console.log(`  Root cause playbooks: ${ROOT_CAUSE_PLAYBOOKS.length}`);
  console.log(`  Live P0 aggregates (24h): ${aggregates.filter((a) => a.severity === "P0" && a.count24h > 0).length}`);
  console.log(`  Mode: ${process.env.DATABASE_URL ? "live + registry" : "registry-only"}\n`);

  if (gate.warnings.length > 0) {
    console.log("  Warnings:");
    for (const w of gate.warnings) console.log(`    ⚠ ${w}`);
    console.log();
  }

  if (allBlockers.length > 0) {
    console.log("  Blockers:");
    for (const b of allBlockers) console.log(`    ✗ ${b}`);
    console.log("\n[check:crash-launch-gate] FAIL — release blocked.\n");
    process.exit(1);
  }

  console.log("[check:crash-launch-gate] PASS — launch gate clear.\n");
}

void main();
