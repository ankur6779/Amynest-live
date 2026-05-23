import type { ModuleId } from "../types.js";

export type PersonalityTraits = {
  curiosity: number;
  persistence: number;
  distractibility: number;
  challengeSeeking: number;
  rewardSensitivity: number;
};

export type LearningPace = "slow" | "medium" | "fast";

export type PersonalityLearningStyle = {
  prefersRepetition: boolean;
  prefersExploration: boolean;
  pace: LearningPace;
};

export type PersonalityProfile = {
  childId: string;
  traits: PersonalityTraits;
  learningStyle: PersonalityLearningStyle;
  version: number;
  lastUpdated: string;
};

export type PersonalitySnapshot = {
  curiosity: number;
  persistence: number;
  distractibility: number;
};

export type LearningPathMilestone = {
  id: string;
  goal: string;
  targetModule?: ModuleId;
  targetLevel?: number;
  completed: boolean;
  completedAt?: string;
};

export type LearningPath = {
  childId: string;
  goals: string[];
  currentTrack: ModuleId;
  milestones: LearningPathMilestone[];
  progressScore: number;
  version: number;
  lastUpdated: string;
};

export type LearningPathSummary = {
  currentGoal: string;
  progress: number;
};

export type PersonalityBehaviorBatch = {
  skips: number;
  rapidTaps: number;
  explorationSuccesses: number;
  retries: number;
  rewardEngagements: number;
  completions: number;
  sessionMinutes?: number;
};

export type PersonalityDriftResult = {
  drifted: boolean;
  magnitude: number;
  explorationBoost: number;
};

export type PersonalityProfileStore = {
  get(childId: string): Promise<PersonalityProfile | null>;
  upsert(profile: PersonalityProfile): Promise<PersonalityProfile>;
};

export type LearningPathStore = {
  get(childId: string): Promise<LearningPath | null>;
  upsert(path: LearningPath): Promise<LearningPath>;
};

export const DEFAULT_TRAIT_VALUES: PersonalityTraits = {
  curiosity: 0.5,
  persistence: 0.55,
  distractibility: 0.45,
  challengeSeeking: 0.5,
  rewardSensitivity: 0.5,
};
