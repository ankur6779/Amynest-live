import { formatReliabilityReport, runLearningChaosSuite } from "./run.js";

const report = runLearningChaosSuite();
console.log(formatReliabilityReport(report));
console.log(`\nJSON score: ${report.reliabilityScore}`);
if (report.reliabilityScore < 70) {
  process.exitCode = 1;
}
