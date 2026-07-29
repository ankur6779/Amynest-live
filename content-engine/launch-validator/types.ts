/**
 * Production Launch Validator types.
 * Final quality gate before YouTube upload — evidence from the final MP4 only.
 */

import type { ContentPackage } from "../types/content-package.js";
import type {
  PublishMetadata,
  SchedulePlan,
  ThumbnailResolution,
} from "../types/published-video.js";
import type { RenderPackage } from "../types/render-package.js";
import type { StoryboardPackage } from "../types/storyboard.js";
import type {
  GateStatus,
  QualityCertificationReport,
} from "./media-evidence/types.js";

export const LAUNCH_VALIDATOR_VERSION = "2.0.0";

/** Relative to the content-engine package root. */
export const LAUNCH_VALIDATION_REPORT_PATH =
  "docs/operations/LAUNCH_VALIDATION_REPORT.md";

export type LaunchCategory =
  | "story"
  | "visual"
  | "audio"
  | "brand"
  | "feature"
  | "platform"
  | "accessibility"
  | "policy"
  | "technical"
  | "business"
  | "evidence";

export type LaunchCheckSeverity = "critical" | "major" | "minor";

export type LaunchRecommendation =
  | "auto_approve"
  | "manual_review"
  | "reject";

export interface LaunchCheck {
  id: string;
  category: LaunchCategory;
  /** True only for PASS. FAIL and INCONCLUSIVE are not ok. */
  ok: boolean;
  /** Evidence status — preferred over boolean ok. Normalized to PASS/FAIL if omitted. */
  status?: GateStatus;
  severity: LaunchCheckSeverity;
  code: string;
  message: string;
  suggestion?: string;
  confidence?: number;
  evidenceSummary?: string;
}

export interface LaunchScoreBreakdown {
  story: number;
  visual: number;
  audio: number;
  brand: number;
  featureAccuracy: number;
  accessibility: number;
  technical: number;
  campaign: number;
  publishingReadiness: number;
  evidence: number;
  overall: number;
}

export interface LaunchValidationInput {
  content: ContentPackage;
  render: RenderPackage;
  metadata: PublishMetadata;
  thumbnail: ThumbnailResolution;
  schedule: SchedulePlan;
  storyboard?: StoryboardPackage;
  publishedTopicIds?: string[];
  repoRoot?: string;
  asOfDate?: string;
  /** Directory for QUALITY_REPORT.json + frame dumps. */
  evidenceWorkDir?: string;
}

export interface LaunchValidationReport {
  version: typeof LAUNCH_VALIDATOR_VERSION;
  generatedAt: string;
  ok: boolean;
  pass: boolean;
  recommendation: LaunchRecommendation;
  scores: LaunchScoreBreakdown;
  checks: LaunchCheck[];
  reasons: string[];
  improvements: string[];
  contentTopicId: string;
  renderPackageId: string;
  title: string;
  reportPath?: string;
  qualityReportPath?: string;
  /** Full evidence certification — source of truth. */
  certification: QualityCertificationReport;
}
