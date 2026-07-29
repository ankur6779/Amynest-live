/**
 * Evidence-based media certification types.
 * Final MP4 is the single source of truth — never trust metadata alone.
 */

export const MEDIA_EVIDENCE_VERSION = "2.0.0";

/** Certification status — INCONCLUSIVE always blocks publish. */
export type GateStatus = "PASS" | "FAIL" | "INCONCLUSIVE";

export type QualityGateId =
  | "story_quality"
  | "muted_story"
  | "audio"
  | "subtitles"
  | "end_card"
  | "brand_detection"
  | "cta_detection"
  | "character_consistency"
  | "visual_quality"
  | "motion_quality"
  | "text_readability"
  | "brand_mention"
  | "compliance"
  | "performance"
  | "metadata"
  | "evidence_integrity";

export interface Measurement {
  name: string;
  value: number | string | boolean | null;
  unit?: string;
  threshold?: number | string;
  confidence?: number;
}

export interface GateEvidence {
  measurements: Measurement[];
  frameNumbers?: number[];
  timestampsSec?: number[];
  screenshotPaths?: string[];
  ocrSamples?: string[];
  notes?: string[];
}

export interface QualityGateResult {
  id: QualityGateId;
  name: string;
  status: GateStatus;
  required: boolean;
  confidence: number;
  evidence: GateEvidence;
  failureReason?: string;
}

export interface AudioProbe {
  hasAudioStream: boolean;
  codec?: string;
  sampleRate?: number;
  channels?: number;
  meanVolumeDb: number | null;
  maxVolumeDb: number | null;
  silenceRatio: number | null;
  silentTrack: boolean;
  speechLikely: boolean;
  musicLikely: boolean;
  duckingLikely: boolean;
  probeError?: string;
}

export interface VisualProbe {
  width: number | null;
  height: number | null;
  durationSec: number | null;
  fps: number | null;
  codec?: string;
  blackSeconds: number | null;
  freezeSeconds: number | null;
  sceneChangeCount: number | null;
  frameCount: number | null;
  /** 0–255 average luma across sampled frames; null if unmeasured. */
  meanLuma: number | null;
  corrupt: boolean;
  probeError?: string;
}

export interface OcrFrameSample {
  timestampSec: number;
  frameNumber: number;
  path: string;
  text: string;
  region: "full" | "caption" | "endcard";
}

export interface OcrProbe {
  available: boolean;
  frames: OcrFrameSample[];
  fullText: string;
  captionText: string;
  endCardText: string;
  transcriptOverlap: number | null;
  subtitleCoverage: number | null;
  error?: string;
}

export interface CharacterProbe {
  samplesCompared: number;
  bestSimilarity: number | null;
  bestCharacterId: string | null;
  perCharacter: Record<string, number>;
  error?: string;
}

export interface TemplateMatchProbe {
  appIconSimilarity: number | null;
  endCardPurpleRatio: number | null;
  googlePlayTextDetected: boolean;
  appStoreTextDetected: boolean;
  ctaTextDetected: boolean;
  logoTextDetected: boolean;
  endCardDurationSec: number | null;
  error?: string;
}

export interface ComplianceProbe {
  placeholderDetected: boolean;
  todoDetected: boolean;
  debugOverlayDetected: boolean;
  stockWatermarkDetected: boolean;
  missingMedia: boolean;
  hits: string[];
}

/** Complete probe of the final MP4 — required before any PASS. */
export interface MediaEvidenceReport {
  version: typeof MEDIA_EVIDENCE_VERSION;
  generatedAt: string;
  videoPath: string;
  fileExists: boolean;
  fileSizeBytes: number;
  workDir: string;
  audio: AudioProbe;
  visual: VisualProbe;
  ocr: OcrProbe;
  character: CharacterProbe;
  template: TemplateMatchProbe;
  compliance: ComplianceProbe;
  probeComplete: boolean;
  probeErrors: string[];
}

export interface QualityCertificationReport {
  version: typeof MEDIA_EVIDENCE_VERSION;
  generatedAt: string;
  videoPath: string;
  certification: GateStatus;
  /** True only when every required gate is PASS. */
  ok: boolean;
  gates: QualityGateResult[];
  evidence: MediaEvidenceReport;
  blockedReasons: string[];
  qualityReportPath?: string;
}
