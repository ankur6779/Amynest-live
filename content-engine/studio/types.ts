/**
 * AmyNest AI Content Studio types.
 * Additive creative layer — does not redefine engine phases.
 */

export type StudioLanguage = "en" | "hi" | "hinglish";

export type StudioCategory =
  | "Learning"
  | "Speech"
  | "Health"
  | "Routine"
  | "Games"
  | "Astro"
  | "Amy Coach"
  | "Audio Lessons"
  | "Nutrition"
  | "Parent Tips"
  | "Brain Development"
  | "Emotional Intelligence"
  | "Reading"
  | "Writing"
  | "Math"
  | "Science"
  | "Memory"
  | "Focus"
  | "Motor Skills"
  | "Creativity"
  | "Weekend Activities"
  | "Family Time"
  | "School Preparation"
  | "Premium"
  | "Feature Updates"
  | "Milestones"
  | "Daily Parenting Tips";

export type StudioEmotion =
  | "confidence"
  | "pride"
  | "curiosity"
  | "hope"
  | "achievement"
  | "calm"
  | "bonding"
  | "routine-success";

export type StudioDifficulty = "beginner" | "intermediate" | "advanced";

export interface StudioTopicIdea {
  id: string;
  title: string;
  category: StudioCategory;
  featureId?: string;
  featureTitle?: string;
  difficulty: StudioDifficulty;
  audience: "parents" | "caregivers" | "families";
  targetAge: string;
  estimatedCtr: number;
  estimatedRetention: number;
  emotion: StudioEmotion;
  recommendedDuration: 15 | 20 | 30;
  keywords: string[];
  angle: string;
}

export interface RankedHook {
  text: string;
  score: number;
  retentionPredict: number;
  emotion: StudioEmotion;
}

export interface RankedCta {
  text: string;
  score: number;
  style: "soft" | "direct" | "benefit" | "play";
}

export interface StoryBeatPlan {
  hook: string;
  problem: string;
  whyItHappens: string;
  amynestSolution: string;
  featureDemo: string;
  parentBenefit: string;
  childBenefit: string;
  cta: string;
}

export interface PsychologyTriggers {
  primary: StudioEmotion;
  secondary: StudioEmotion[];
  forbidden: readonly string[];
  guidance: string;
}

export interface RetentionPlan {
  predictedRetention: number;
  dropOffRisks: string[];
  pacingNotes: string[];
  targetRetention: number;
}

export interface StudioQualityScores {
  hook: number;
  retention: number;
  ctr: number;
  brand: number;
  emotion: number;
  educationalValue: number;
  parentAppeal: number;
  childAppeal: number;
  overall: number;
}

export interface StudioQualityGate {
  ok: boolean;
  threshold: number;
  scores: StudioQualityScores;
  rewriteHint?: string;
}

export interface MotionPreset {
  id: string;
  label: string;
  camera: string;
  transition: string;
  glow?: boolean;
}

export interface MusicMoodProfile {
  mood: "happy" | "learning" | "adventure" | "relaxed" | "celebration" | "motivation";
  energy: number;
  trackHint: string;
}

export interface VoiceStyleProfile {
  language: StudioLanguage;
  tone: "warm" | "professional" | "encouraging";
  pace: "slow" | "moderate" | "brisk";
  guidance: string;
}

export interface StudioTemplate {
  id: string;
  label: string;
  category: StudioCategory;
  videoTemplateId: string;
  defaultEmotion: StudioEmotion;
  defaultDuration: 15 | 20 | 30;
  characterPreference: "amy-ai" | "amy-girl" | "amy-boy";
}

export interface StudioAnalyticsInsights {
  winningHooks: string[];
  winningTopics: string[];
  winningDurations: Array<15 | 20 | 30>;
  winningCtas: string[];
  winningPublishHours: number[];
}

export interface StudioCreativeBrief {
  topicIdea: StudioTopicIdea;
  selectedHook: RankedHook;
  hooks: RankedHook[];
  story: StoryBeatPlan;
  psychology: PsychologyTriggers;
  retention: RetentionPlan;
  selectedCta: RankedCta;
  ctas: RankedCta[];
  motion: MotionPreset[];
  music: MusicMoodProfile;
  voice: VoiceStyleProfile;
  template: StudioTemplate;
  qualityPreview: StudioQualityScores;
  systemPromptBlock: string;
}
