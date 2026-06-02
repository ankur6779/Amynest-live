/**
 * Admin diagnostics for Discovery Worlds manifests (local packages).
 * Run: pnpm exec tsx scripts/discovery-worlds-content-diagnostics.ts
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diagnoseWorldManifest,
  manifestDiagnosticsSummary,
  type WorldManifest,
} from "@workspace/world-engine";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const MANIFESTS: Array<{ label: string; path: string }> = [
  { label: "vehicles", path: "lib/vehicle-world/src/manifest.json" },
  { label: "nature", path: "lib/nature-sounds-world/src/manifest.json" },
  { label: "home", path: "lib/home-sounds-world/src/manifest.json" },
  { label: "instruments", path: "lib/instrument-world/src/manifest.json" },
];

let exitCode = 0;

for (const { label, path } of MANIFESTS) {
  const full = join(root, path);
  let manifest: WorldManifest;
  try {
    manifest = JSON.parse(readFileSync(full, "utf8")) as WorldManifest;
  } catch (e) {
    console.error(`[${label}] FAILED to read manifest: ${full}`, e);
    exitCode = 1;
    continue;
  }

  const issues = diagnoseWorldManifest(manifest);
  const summary = manifestDiagnosticsSummary(issues);
  console.log(`\n=== ${label} (${manifest.worldId}) ===`);
  console.log(`Items: ${manifest.items.length} | Errors: ${summary.errors} | Warnings: ${summary.warnings}`);
  for (const issue of issues) {
    console.log(`  [${issue.severity}] ${issue.code}: ${issue.message}`);
  }
  if (!summary.ok) exitCode = 1;
}

process.exit(exitCode);
