/**
 * Evidence-based certification — final MP4 is the only source of truth.
 * Always probes the rendered file. No signal bypass. No fail-open.
 */

import type { ContentPackage } from "../../types/content-package.js";
import type { PublishMetadata } from "../../types/published-video.js";
import type { RenderPackage } from "../../types/render-package.js";
import { evaluateEvidenceGates } from "./gates.js";
import { probeMediaEvidence } from "./probe.js";
import type {
  GateStatus,
  QualityCertificationReport,
  QualityGateResult,
} from "./types.js";
import { MEDIA_EVIDENCE_VERSION } from "./types.js";

export interface CertifyMediaInput {
  videoPath: string;
  content: ContentPackage;
  render: RenderPackage;
  metadata: PublishMetadata;
  /** Optional work dir for frame dumps; defaults to temp. */
  workDir?: string;
}

export function certifyFinalMedia(
  input: CertifyMediaInput,
): QualityCertificationReport {
  const evidence = probeMediaEvidence({
    videoPath: input.videoPath,
    transcript: `${input.content.voiceScript}\n${input.content.story}\n${input.content.hook}`,
    captions: input.content.captions,
    workDir: input.workDir,
  });

  const gates = evaluateEvidenceGates({
    evidence,
    content: input.content,
    render: input.render,
    metadata: input.metadata,
  });

  const certification = summarizeCertification(gates);
  const blockedReasons = gates
    .filter((g) => g.required && g.status !== "PASS")
    .map(
      (g) =>
        `${g.id}:${g.status}${g.failureReason ? ` — ${g.failureReason}` : ""}`,
    );

  return {
    version: MEDIA_EVIDENCE_VERSION,
    generatedAt: new Date().toISOString(),
    videoPath: input.videoPath,
    certification,
    ok: certification === "PASS",
    gates,
    evidence,
    blockedReasons,
  };
}

export function summarizeCertification(gates: QualityGateResult[]): GateStatus {
  const required = gates.filter((g) => g.required);
  if (required.length === 0) return "INCONCLUSIVE";
  if (required.some((g) => g.status === "INCONCLUSIVE")) return "INCONCLUSIVE";
  if (required.some((g) => g.status === "FAIL")) return "FAIL";
  if (required.every((g) => g.status === "PASS")) return "PASS";
  return "INCONCLUSIVE";
}

/** Convert evidence gate → boolean ok. INCONCLUSIVE is not ok. */
export function gateStatusToOk(status: GateStatus): boolean {
  return status === "PASS";
}
