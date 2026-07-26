import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { profileIntelligencePipeline } from "./performance.js";

const report = profileIntelligencePipeline(20);
console.log(JSON.stringify(report, null, 2));
console.log(
  report.passed
    ? `PASS p95=${report.p95TotalMs}ms <= ${report.sloMs}ms`
    : `FAIL p95=${report.p95TotalMs}ms > ${report.sloMs}ms`,
);

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(
  join(here, "..", "reports", "performance-latest.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

if (!report.passed) process.exit(1);
