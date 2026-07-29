/**
 * Production Launch Validator — evidence-based certification before upload.
 * Final MP4 is the single source of truth. Metadata alone can never PASS.
 */

import { validateBusiness } from "./checks/business.js";
import { validateFeatures } from "./checks/feature.js";
import { validatePlatform } from "./checks/platform.js";
import { validatePolicy } from "./checks/policy.js";
import { validateTechnicalFromEvidence } from "./checks/technical.js";
import {
  certifyFinalMedia,
  gateStatusToOk,
  writeQualityReportJson,
} from "./media-evidence/index.js";
import type { QualityGateId, QualityGateResult } from "./media-evidence/types.js";
import { recommendationForScore, scoreLaunchChecks } from "./score.js";
import type {
  LaunchCheck,
  LaunchValidationInput,
  LaunchValidationReport,
} from "./types.js";
import { LAUNCH_VALIDATOR_VERSION } from "./types.js";

const GATE_CATEGORY: Record<
  QualityGateId,
  LaunchCheck["category"]
> = {
  story_quality: "story",
  muted_story: "story",
  audio: "audio",
  subtitles: "accessibility",
  end_card: "brand",
  brand_detection: "brand",
  cta_detection: "brand",
  character_consistency: "visual",
  visual_quality: "visual",
  motion_quality: "visual",
  text_readability: "accessibility",
  brand_mention: "story",
  compliance: "policy",
  performance: "technical",
  metadata: "business",
  evidence_integrity: "evidence",
};

/**
 * Run the full production launch audit against the rendered MP4.
 * Does not upload — caller must reject when report.ok is false.
 */
export function validateLaunch(
  input: LaunchValidationInput,
): LaunchValidationReport {
  const workDir =
    input.evidenceWorkDir ??
    input.render.renderMetadata.outputDirectory ??
    undefined;

  const certification = certifyFinalMedia({
    videoPath: input.render.videoPath,
    content: input.content,
    render: input.render,
    metadata: input.metadata,
    workDir: workDir
      ? `${workDir.replace(/\/$/, "")}/evidence`
      : undefined,
  });

  let qualityReportPath: string | undefined;
  if (input.render.renderMetadata.outputDirectory) {
    const written = writeQualityReportJson({
      report: certification,
      outputDirectory: input.render.renderMetadata.outputDirectory,
    });
    qualityReportPath = written.path;
    certification.qualityReportPath = written.path;
  }

  const evidenceChecks = certification.gates.map((g) =>
    qualityGateToLaunchCheck(g),
  );

  // Secondary package/policy checks — cannot override media failure.
  const packageChecks: LaunchCheck[] = [
    ...validateTechnicalFromEvidence(input, certification),
    ...validateFeatures(input).map(ensureStatus),
    ...validatePlatform(input).map(ensureStatus),
    ...validatePolicy(input).map(ensureStatus),
    ...validateBusiness(input).map(ensureStatus),
  ];

  const checks: LaunchCheck[] = [...evidenceChecks, ...packageChecks];
  const scores = scoreLaunchChecks(checks);

  const criticalFailures = checks.filter(
    (c) => !c.ok && c.severity === "critical",
  ).length;
  const inconclusiveCount = checks.filter(
    (c) => c.status === "INCONCLUSIVE",
  ).length;

  // Evidence certification is absolute — never ship on metadata alone.
  let recommendation = recommendationForScore(
    scores.overall,
    criticalFailures,
  );
  if (!certification.ok || certification.certification !== "PASS") {
    recommendation = "reject";
  }
  if (inconclusiveCount > 0) {
    recommendation = "reject";
  }

  const failed = checks.filter((c) => !c.ok);
  const reasons = [
    ...certification.blockedReasons,
    ...failed
      .filter((c) => !certification.blockedReasons.some((r) => r.startsWith(c.id)))
      .map((c) => `${c.code}: ${c.message} (${c.category}/${c.severity}/${c.status})`),
  ];
  const improvements = failed
    .map((c) => c.suggestion)
    .filter((s): s is string => Boolean(s));

  const pass = recommendation !== "reject" && certification.ok;

  return {
    version: LAUNCH_VALIDATOR_VERSION,
    generatedAt: new Date().toISOString(),
    ok: pass,
    pass,
    recommendation,
    scores,
    checks,
    reasons: unique(reasons),
    improvements: unique(improvements),
    contentTopicId: input.content.topic.id,
    renderPackageId: input.render.id,
    title: input.content.title,
    qualityReportPath,
    certification,
  };
}

function qualityGateToLaunchCheck(g: QualityGateResult): LaunchCheck {
  const ok = gateStatusToOk(g.status);
  const summary = g.evidence.measurements
    .slice(0, 6)
    .map((m) => `${m.name}=${String(m.value)}`)
    .join("; ");
  return {
    id: `evidence.${g.id}`,
    category: GATE_CATEGORY[g.id] ?? "evidence",
    ok,
    status: g.status,
    severity: "critical",
    code: g.status === "PASS" ? `GATE_${g.id.toUpperCase()}` : g.id.toUpperCase(),
    message:
      g.status === "PASS"
        ? `${g.name} — evidence PASS`
        : `${g.name} — ${g.status}${g.failureReason ? `: ${g.failureReason}` : ""}`,
    suggestion:
      g.status === "PASS"
        ? undefined
        : "Fix the final MP4 (not metadata) and re-run evidence certification.",
    confidence: g.confidence,
    evidenceSummary: summary,
  };
}

function ensureStatus(check: Omit<LaunchCheck, "status"> & { status?: LaunchCheck["status"]; ok: boolean }): LaunchCheck {
  const status = check.status ?? (check.ok ? "PASS" : "FAIL");
  return {
    ...check,
    status,
    ok: status === "PASS",
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
