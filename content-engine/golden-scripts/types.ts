export type GoldenCategory =
  | "Learning"
  | "Speech"
  | "Health"
  | "Games"
  | "Astro"
  | "Routine Technology"
  | "Amy Coach"
  | "Audio Lessons"
  | "Parent Tips"
  | "Premium Features";

export type GoldenCharacter = "Amy AI" | "Amy Girl" | "Amy Boy";

export type GoldenEmotion =
  | "Hope"
  | "Confidence"
  | "Learning"
  | "Family Bonding"
  | "Routine"
  | "Emotional Growth"
  | "Curiosity"
  | "Achievement";

export interface HookCandidate {
  text: string;
  retentionPredict: number;
  curiosity: number;
  clickbaitRisk: number;
}

export interface QualityBreakdown {
  hook: number;
  story: number;
  parentValue: number;
  educationalValue: number;
  brandConsistency: number;
  featureAccuracy: number;
  retentionPrediction: number;
  ctrPrediction: number;
  emotionalImpact: number;
  ctaStrength: number;
  /** Emotion-first Pixar craft: situation before product, hope before download. */
  storycraft: number;
  /** Muted Video Test: first 10s + last 5s readable without audio. */
  mutedVideo: number;
  overall: number;
}

export interface MutedVisualShot {
  window: string;
  show: string;
  readsAs: string;
}

export interface MutedVisualPlan {
  principle: "visual-story-first";
  first10SecondsMuted: MutedVisualShot[];
  last5SecondsMuted: MutedVisualShot[];
  silentStoryBeats: string[];
  showDontTell: string[];
  mutedTestSummary: {
    first10: string;
    last5: string;
  };
}

export interface GoldenScript {
  id: string;
  number: number;
  filename: string;
  category: GoldenCategory;
  title: string;
  topic: string;
  targetAge: string;
  targetParent: string;
  objective: string;
  featureId: string;
  featureName: string;
  featureSource: string;
  /** Real parenting cold-open — no product. */
  parentingSituation: string;
  /** Scroll-stop beat (0–3s). */
  firstThreeSeconds: string;
  hooks: HookCandidate[];
  selectedHook: HookCandidate;
  problem: string;
  whyParentsFaceIt: string;
  emotionBeat: string;
  /** First allowed product beat — only after emotion is earned. */
  productEntryBeat: string;
  amynestSolution: string;
  featureDemo: string;
  expectedChildOutcome: string;
  parentBenefit: string;
  /** Final 3 seconds — hope first. */
  hopeClose: string;
  cta: string;
  suggestedDuration: "15s" | "20s" | "30s";
  suggestedCharacters: GoldenCharacter[];
  suggestedCameraStyle: string;
  suggestedEmotion: GoldenEmotion;
  suggestedMusic: string;
  suggestedThumbnail: string;
  suggestedOpeningScene: string;
  suggestedEndingScene: string;
  /** Visual story first — must pass Muted Video Test. */
  mutedVisual: MutedVisualPlan;
  storyFlow: string[];
  quality: QualityBreakdown;
  rewritePasses: number;
}
