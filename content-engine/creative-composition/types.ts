/**
 * Creative Composition Layer — continuous character performances for AmyNest Shorts.
 * Additive. Does not change WorkflowPhase architecture or validators.
 */

export const CREATIVE_COMPOSITION_VERSION = "2.0.0";

export type EnvironmentId =
  | "kitchen-table"
  | "child-bedroom"
  | "study-desk"
  | "living-room"
  | "playroom"
  | "magic-learning-world"
  | "cta-stage";

export type ShotRole =
  | "hook"
  | "amy-host"
  | "amy-girl-learn"
  | "amy-boy-celebrate"
  | "cta";

export type BrandCharacterId = "amy-ai" | "amy-girl" | "amy-boy";

export interface CompositionShotPlan {
  id: string;
  role: ShotRole;
  /** Veo-supported durations only. */
  durationSeconds: 4 | 6;
  environment: EnvironmentId;
  kind: "veo-performance" | "cta-overlay";
  caption: string;
  camera: "push-in" | "pan-right" | "pan-left" | "slow-zoom" | "orbit-soft";
  character: BrandCharacterId;
  performance: string;
  notes: string;
}

export interface CreativeCompositionPlan {
  version: typeof CREATIVE_COMPOSITION_VERSION;
  totalDurationSeconds: number;
  shots: CompositionShotPlan[];
  rulesApplied: string[];
}

export interface ComposedShotArtifact {
  plan: CompositionShotPlan;
  videoPath: string;
  keyframePath?: string;
  provider: "google-veo" | "cta-overlay";
  model?: string;
  detail: string;
  imageToVideo?: boolean;
}
