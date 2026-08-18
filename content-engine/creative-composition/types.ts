/**
 * Creative Composition Layer — continuous character performances for AmyNest Shorts.
 * Additive. Does not change WorkflowPhase architecture or validators.
 */

export const CREATIVE_COMPOSITION_VERSION = "2.5.0";

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
  | "balcony-night"
  // Unique-short-film locations (script-matched)
  | "balcony"
  | "terrace"
  | "cafe"
  | "museum"
  | "science-center"
  | "playground"
  | "apartment-hallway"
  | "car-ride"
  | "book-store"
  | "festival-home";

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
  | "high-angle"
  | "handheld"
  | "eye-level"
  | "walking-follow"
  | "two-shot"
  | "profile";

export interface CompositionShotPlan {
  id: string;
  role: ShotRole;
  /** Veo-supported durations only (4 | 6). Rhythm varies across the Short. */
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
  /** ONE visual objective for this shot — never combine multiple. */
  shotObjective?: string;
  /** Physical action that must happen before any dialogue/mouthing. */
  actionBeforeDialogue?: string;
  /** Why the camera moves — must be motivated by action. */
  cameraMotivation?: string;
  /** Emotional state entering this shot (continuity from previous). */
  emotionFrom?: string;
  /** Emotional state leaving this shot (feeds the next). */
  emotionTo?: string;
  /** Whether AmyNest device/UI may appear in this beat (max 2 per Short). */
  allowAppUi?: boolean;
  /** Story-rhythm beat label (hook → … → CTA). */
  storyBeat?: string;
  /** How this shot continues the previous shot's blocking / camera / emotion. */
  continuityBridge?: string;
  /** Amy should be visually present / interacting in this beat (~70% of film). */
  amyOnScreen?: boolean;
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
  provider: "google-veo" | "kie-veo" | "kie-kling" | "cta-overlay";
  model?: string;
  detail: string;
  imageToVideo?: boolean;
}
