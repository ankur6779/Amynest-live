/**
 * LAUNCH_VALIDATION_REPORT.md generator (+ evidence summary).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import type { LaunchValidationReport } from "./types.js";
import { LAUNCH_VALIDATION_REPORT_PATH } from "./types.js";

export function renderLaunchValidationMarkdown(
  report: LaunchValidationReport,
): string {
  const failed = report.checks.filter((c) => !c.ok);
  const cert = report.certification;
  const lines = [
    "# AmyNest Production Launch Validation Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Validator: v${report.version}`,
    "",
    "## Result",
    "",
    `- **Pass/Fail:** ${report.pass ? "PASS" : "FAIL"}`,
    `- **Evidence certification:** ${cert?.certification ?? "MISSING"}`,
    `- **Recommendation:** ${report.recommendation}`,
    `- **Overall Launch Score:** ${report.scores.overall}`,
    `- **Title:** ${report.title}`,
    `- **Topic:** ${report.contentTopicId}`,
    `- **Render package:** ${report.renderPackageId}`,
    `- **Final MP4:** ${cert?.videoPath ?? "n/a"}`,
    `- **QUALITY_REPORT.json:** ${report.qualityReportPath ?? cert?.qualityReportPath ?? "n/a"}`,
    "",
    "## Evidence rule",
    "",
    "- Final MP4 is the single source of truth.",
    "- Metadata alone can never PASS certification.",
    "- INCONCLUSIVE (missing evidence) blocks publish.",
    "- mediaSignals / hardcoded trust flags are removed.",
    "",
    "## Scores",
    "",
    "| Dimension | Score |",
    "|---|---:|",
    `| Story | ${report.scores.story} |`,
    `| Visual | ${report.scores.visual} |`,
    `| Audio | ${report.scores.audio} |`,
    `| Brand | ${report.scores.brand} |`,
    `| Feature Accuracy | ${report.scores.featureAccuracy} |`,
    `| Accessibility | ${report.scores.accessibility} |`,
    `| Technical | ${report.scores.technical} |`,
    `| Campaign | ${report.scores.campaign} |`,
    `| Publishing Readiness | ${report.scores.publishingReadiness} |`,
    `| Evidence | ${report.scores.evidence} |`,
    `| **Overall Launch Score** | **${report.scores.overall}** |`,
    "",
    "## Launch Rules",
    "",
    "- Evidence certification must be PASS",
    "- 95–100 → AUTO APPROVE (only if evidence PASS)",
    "- 90–94 → Manual review (still requires evidence PASS)",
    "- Below 90 / any INCONCLUSIVE / evidence FAIL → Reject",
    "",
    "## Blocked reasons",
    "",
  ];

  if (report.reasons.length === 0) {
    lines.push("- All critical launch checks passed.");
  } else {
    for (const reason of report.reasons) lines.push(`- ${reason}`);
  }

  lines.push("", "## Evidence gates", "");
  if (cert?.gates?.length) {
    for (const g of cert.gates) {
      const meas = g.evidence.measurements
        .slice(0, 4)
        .map((m) => `${m.name}=${String(m.value)}`)
        .join(", ");
      lines.push(
        `- [${g.status}] \`${g.id}\` conf=${g.confidence}${meas ? ` (${meas})` : ""}${g.failureReason ? ` — ${g.failureReason}` : ""}`,
      );
    }
  } else {
    lines.push("- _No evidence gates — certification incomplete._");
  }

  lines.push("", "## Improvement Suggestions", "");
  if (report.improvements.length === 0) {
    lines.push("- None — ready for upload.");
  } else {
    for (const tip of report.improvements) lines.push(`- ${tip}`);
  }

  lines.push("", "## Failed Checks", "");
  if (failed.length === 0) {
    lines.push("_No failed checks._");
  } else {
    for (const check of failed) {
      lines.push(
        `- **${check.code}** (${check.category}/${check.severity}/${check.status ?? "FAIL"}): ${check.message}`,
      );
    }
  }

  lines.push("", "## All Checks", "");
  for (const check of report.checks) {
    const mark =
      check.status === "PASS"
        ? "PASS"
        : check.status === "INCONCLUSIVE"
          ? "INCONCLUSIVE"
          : "FAIL";
    lines.push(
      `- [${mark}] \`${check.id}\` ${check.code}: ${check.message}`,
    );
  }

  lines.push(
    "",
    "## Publishing Recommendation",
    "",
    report.recommendation === "auto_approve"
      ? "AUTO APPROVE — upload may proceed."
      : report.recommendation === "manual_review"
        ? "MANUAL REVIEW RECOMMENDED — evidence PASS required; upload may proceed with caution."
        : "REJECT — do not upload. Fix final MP4 evidence failures and re-validate.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function writeLaunchValidationReport(input: {
  report: LaunchValidationReport;
  repoRoot?: string;
  outputDirectory?: string;
}): { markdown: string; path: string } {
  const markdown = renderLaunchValidationMarkdown(input.report);
  const primary = resolveLaunchReportPath(input.repoRoot);

  const paths = [primary];
  if (input.outputDirectory) {
    paths.push(join(input.outputDirectory, "LAUNCH_VALIDATION_REPORT.md"));
  }

  for (const path of paths) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, markdown, "utf8");
  }

  return { markdown, path: primary };
}

function resolveLaunchReportPath(repoRoot?: string): string {
  if (repoRoot) {
    return join(repoRoot, "content-engine", LAUNCH_VALIDATION_REPORT_PATH);
  }
  const cwd = process.cwd();
  if (cwd.endsWith(`${sep}content-engine`) || cwd.endsWith("/content-engine")) {
    return join(cwd, LAUNCH_VALIDATION_REPORT_PATH);
  }
  return join(cwd, "content-engine", LAUNCH_VALIDATION_REPORT_PATH);
}
