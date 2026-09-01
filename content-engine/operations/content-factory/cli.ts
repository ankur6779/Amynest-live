/**
 * CLI: content-factory dry-run | tick
 *
 *   node --import tsx/esm ./operations/content-factory/cli.ts dry-run
 *   node --import tsx/esm ./operations/content-factory/cli.ts tick
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAmyNestEnvFiles } from "../env/load-env.js";
import {
  formatDryRunConsole,
  runContentFactory,
  runFactoryDryValidation,
} from "./runner.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(CE_ROOT, "..");

async function main(): Promise<void> {
  loadAmyNestEnvFiles(REPO_ROOT);
  const [cmd] = process.argv.slice(2);
  const command = cmd || "dry-run";

  if (command === "dry-run") {
    // Force dry: never live spend from this command
    process.env.AMYNEST_CONTENT_FACTORY_DRY_RUN = "1";
    delete process.env.AMYNEST_CONTENT_FACTORY_LIVE;
    const report = runFactoryDryValidation({ dryRun: true });
    console.log(formatDryRunConsole(report));
    const docsDir = join(CE_ROOT, "docs/operations");
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, "CONTENT_FACTORY_DRY_RUN.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    process.exit(report.overall === "PASS" ? 0 : 1);
  }

  if (command === "tick") {
    // Scheduled wake-up: dry unless LIVE=1
    const result = await runContentFactory({
      dryRun: process.env.AMYNEST_CONTENT_FACTORY_LIVE !== "1",
      allowLiveSpend: process.env.AMYNEST_CONTENT_FACTORY_LIVE === "1",
    });
    console.log(result.message);
    if (result.report) console.log(formatDryRunConsole(result.report));
    process.exit(
      result.mode === "dry-run"
        ? result.report?.overall === "PASS"
          ? 0
          : 1
        : result.record?.status === "FAILED"
          ? 1
          : 0,
    );
  }

  console.error(`Unknown command: ${command}. Use dry-run | tick`);
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
