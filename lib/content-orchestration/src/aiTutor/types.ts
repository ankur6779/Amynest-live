import type { DifficultyLevel, ModuleId } from "../types.js";
import type { SessionPlanItem } from "../types-v2.js";

export type TeachingMode = "explain" | "ask" | "encourage" | "correct";

export type ConversationRole = "amy" | "child";

export type ConversationTurn = {
  role: ConversationRole;
  text: string;
  timestamp: number;
  mode?: TeachingMode;
};

export type SessionGoal = {
  skillTarget: string;
  completionTarget: number;
  engagementTarget: number;
};

export type SessionGoalProgress = {
  skillProgress: number;
  completions: number;
  engagementScore: number;
};

export type TutorMemory = {
  mistakesHistory: string[];
  strengths: string[];
  weakAreas: string[];
};

export type TutorState = {
  childId: string;
  currentTopic: string;
  currentSkillLevel: number;
  conversationHistory: ConversationTurn[];
  teachingMode: TeachingMode;
  sessionGoal: SessionGoal;
  goalProgress: SessionGoalProgress;
  memory: TutorMemory;
  cycleCount: number;
  lastCycleAt: number;
  contentItem?: SessionPlanItem;
};

export type TutorResponsePayload = {
  message: string;
  voiceUrl?: string;
  mode: TeachingMode;
  nextExpectedResponse: "listen" | "answer" | "repeat" | "continue";
  slowMode?: boolean;
};

export type TutorApiPayload = {
  tutor: TutorResponsePayload;
};

export type ChildAnswerEvaluation = {
  correct: boolean;
  partial: boolean;
  confidence: number;
};

export type VoiceSettings = {
  speed: number;
  childFriendly: boolean;
  slowMode: boolean;
  repeatMode: boolean;
};

export const TUTOR_SAFETY = {
  maxWordsPerTurn: 28,
  maxAudioSeconds: 10,
  minCycleMs: 10_000,
  maxCycleMs: 20_000,
} as const;

export type TopicContext = {
  moduleId: ModuleId;
  topic: string;
  skillLevel: number;
  difficulty: DifficultyLevel;
};
