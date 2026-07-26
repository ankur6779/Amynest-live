/**
 * CLI: pnpm --filter @workspace/ai-evaluation run eval
 * Exit 1 if overall score < threshold or hard failures.
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runEvaluation } from "./engine.js";
import { formatReportText } from "./report.js";
import { DEFAULT_MIN_OVERALL_SCORE } from "./types.js";

const args = new Set(process.argv.slice(2));
const updateBaselines = args.has("--update-baselines");
const jsonOut = args.has("--json");
const thresholdArg = process.argv.find((a) => a.startsWith("--threshold="));
const threshold = thresholdArg
  ? Number(thresholdArg.split("=")[1])
  : Number(process.env.AI_EVAL_MIN_SCORE ?? DEFAULT_MIN_OVERALL_SCORE);

const report = runEvaluation({
  threshold: Number.isFinite(threshold) ? threshold : DEFAULT_MIN_OVERALL_SCORE,
  updateBaselines,
});

const text = formatReportText(report);
console.log(text);

// Always persist last report for CI artifacts / local inspection.
{
  const here = dirname(fileURLToPath(import.meta.url));
  const outPath = join(here, "..", "golden", "last-report.json");
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (jsonOut || process.env.AI_EVAL_WRITE_REPORT === "1") {
    console.log(`Wrote ${outPath}`);
  }
}

if (!report.passed) {
  console.error(`AI evaluation failed: ${report.summary}`);
  process.exit(1);
}

process.exit(0);
