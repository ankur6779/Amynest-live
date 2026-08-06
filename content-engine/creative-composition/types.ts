/**
 * Creative Composition Layer — continuous character performances for AmyNest Shorts.
 * Additive. Does not change WorkflowPhase architecture or validators.
 */

export const CREATIVE_COMPOSITION_VERSION = "2.1.0";

export type EnvironmentId =
  | "kitchen-table"
  | "child-bedroom"
  | "study-desk"
  | "living-room"
  | "playroom"
  | "magic-learning-world"
  | "cta-stage"
  // Content diversity scene library (script-selected)
  | "dining-table"
  | "homework-corner"
  | "reading-corner"
  | "library"
  | "school"
  | "school-bus"
  | "science-room"
  | "art-room"
  | "garden"
  | "park"
  | "park-bench"
  | "indoor-tent"
  | "bedroom-night"
  | "bedroom-morning"
  | "morning-breakfast"
  | "rainy-window"
  | "weekend-picnic"
  | "doctor-visit"
  | "birthday"
  | "festival"
  | "travel"
  | "grandparents"
  | "outdoor-learning"
  | "nature-walk"
  | "space-world"
  | "fantasy-learning-world"
  | "healthy-kitchen"
  | "music-room"
  | "story-castle"
  | "math-laboratory"
  | "astro-observatory"
  | "ocean-learning-world"
  | "fridge-magnet-wall"
  | "mirror-practice-nook"
  | "calendar-wall"
  | "balcony-night";

export type ShotRole =
  | "hook"
  | "amy-host"
  | "amy-girl-learn"
  | "amy-boy-celebrate"
  | "cta";

export type BrandCharacterId = "amy-ai" | "amy-girl" | "amy-boy";

/** Who owns the audible line for this beat (direction-only; TTS pipeline unchanged). */
export type SpeechMode = "speaking" | "listening" | "reacting";

export type CompositionCamera =
  | "push-in"
  | "pan-right"
  | "pan-left"
  | "slow-zoom"
  | "orbit-soft"
  | "tracking"
  | "over-shoulder"
  | "close-up"
  | "reaction"
  | "medium"
  | "wide"
  | "dolly"
  | "top-down"
  | "hand-close-up"
  | "child-pov"
  | "amy-pov"
  | "pull-out"
  | "low-angle"
  | "eye-level"
  | "walking-follow";

export interface CompositionShotPlan {
  id: string;
  role: ShotRole;
  /** Veo-supported durations only. */
  durationSeconds: 4 | 6;
  environment: EnvironmentId;
  kind: "veo-performance" | "cta-overlay";
  caption: string;
  camera: CompositionCamera;
  character: BrandCharacterId;
  performance: string;
  notes: string;
  /** Direction-only: lip ownership for this beat. */
  speechMode?: SpeechMode;
  /** Exact line the on-screen speaker should mouth (from caption/VO beat). */
  spokenLine?: string;
  /** Emotional acting target for the beat. */
  emotionBeat?: string;
  /** How characters relate / interact in-frame or to off-screen partners. */
  interaction?: string;
  /** Primary eye-line instruction. */
  eyeLine?: string;
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
