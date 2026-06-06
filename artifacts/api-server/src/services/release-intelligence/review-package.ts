import type { ReleaseIntelligenceReport } from "./types.js";

export function buildReleaseReviewMarkdown(
  report: Omit<ReleaseIntelligenceReport, "markdown">,
): string {
  const lines: string[] = [
    `# Release Intelligence Review: ${report.version}`,
    "",
    `> Generated: ${report.generatedAt}`,
    `> Base: \`${report.baseRef}\` → Head: \`${report.headRef}\``,
    "> **Read-only analysis** — engineers make all deploy decisions.",
    "",
    "## Verdict",
    "",
    `**${report.verdict}** — Release Risk Score: **${report.releaseRiskScore}/100**`,
    "",
  ];

  if (report.recommendedBlockers.length > 0) {
    lines.push("### Recommended Blockers", "");
    for (const b of report.recommendedBlockers) lines.push(`- ⛔ ${b}`);
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("### Warnings", "");
    for (const w of report.warnings) lines.push(`- ⚠️ ${w}`);
    lines.push("");
  }

  lines.push("## Modified Files", "");
  if (report.changedFiles.length === 0) {
    lines.push("_No file changes detected._", "");
  } else {
    lines.push("| File | Risk | Score | Δ lines | Fingerprints |", "|------|------|-------|---------|--------------|");
    for (const f of report.changedFiles.slice(0, 25)) {
      lines.push(
        `| \`${f.path}\` | ${f.riskLevel} | ${f.riskScore} | +${f.insertions}/-${f.deletions} | ${f.impactedFingerprints.join(", ") || "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Impacted Fingerprints", "");
  if (report.impactedFingerprints.length === 0) {
    lines.push("_No mapped fingerprints impacted._", "");
  } else {
    for (const fp of report.impactedFingerprints) {
      lines.push(`### ${fp.readableFingerprint} [${fp.severity}]`);
      lines.push(`- Regression: ${fp.regressionStatus}`);
      lines.push(`- Tests exist: ${fp.testsExist ? "yes" : "no"}`);
      if (fp.testsExecuted) {
        lines.push(`- Tests passed: ${fp.testsPassed ? "yes" : "no"}`);
      }
      lines.push(`- Tests: ${fp.tests.map((t) => `\`${t}\``).join(", ") || "none"}`);
      lines.push("");
    }
  }

  lines.push("## Regression Coverage", "");
  const rc = report.regressionCoverage;
  lines.push(
    `- Impacted: ${rc.impactedFingerprints} | Covered: ${rc.covered} | Pending: ${rc.pending} | Missing: ${rc.missing}`,
  );
  lines.push(`- Tests executed: ${rc.testsExecuted} | Passed: ${rc.testsPassed}`);
  if (rc.gaps.length) {
    lines.push("", "**Gaps:**");
    for (const g of rc.gaps) lines.push(`- ${g}`);
  }
  lines.push("");

  lines.push("## Route Risk Heatmap", "");
  lines.push("| Route | P0 incidents | Crashes | Users | Risk | Modified |");
  lines.push("|-------|--------------|---------|-------|------|----------|");
  for (const r of report.routeHeatmap) {
    lines.push(
      `| ${r.route} | ${r.p0Incidents} | ${r.historicCrashes} | ${r.affectedUsers} | ${r.releaseRisk} | ${r.modifiedInRelease ? "yes" : "no"} |`,
    );
  }
  lines.push("");

  lines.push("## High-Risk Areas", "");
  for (const a of report.highRiskAreas) lines.push(`- ${a}`);
  lines.push("");

  lines.push("## Required Manual Testing", "");
  for (const t of report.requiredManualTesting) lines.push(`- [ ] ${t}`);
  lines.push("");

  return lines.join("\n");
}
