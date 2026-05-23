export type SessionTime = "morning" | "afternoon" | "evening" | "night";

export type LessonCategory =
  | "sleep"
  | "behavior"
  | "nutrition"
  | "health"
  | "school"
  | "screens"
  | "social"
  | "development"
  | "general";

export type EmergencyType = "tantrum" | "sleep" | "crying";

export type QuickPlayAction = "continue" | "start";

export interface UserSignals {
  lastPlayedLessonId: string | null;
  lastPlayedAt: number | null;
  completionRate: number;
  preferredCategories: LessonCategory[];
  sessionTime: SessionTime;
  recentSkips: string[];
  completedLessonIds: string[];
  lastAgeGroup: string | null;
  resumeMap: Record<string, number>;
}

/** Raw inputs collected from client storage — no I/O in engines. */
export interface SignalInput {
  lastPlayedLessonId: string | null;
  lastPlayedAt: number | null;
  completedLessonIds: string[];
  lastAgeGroup: string | null;
  resumeMap: Record<string, number>;
  recentSkips: string[];
  /** Optional stable user key for daily pick; defaults to last lesson or age. */
  userKey?: string;
  nowMs?: number;
}

export interface LessonRef {
  id: string;
  tier: "quick" | "standard" | "deep";
  ageBucket: string;
}

export interface QuickPlayCard {
  lessonId: string;
  reason: string;
  action: QuickPlayAction;
}

export interface DailyPickCard {
  lessonId: string;
  reason: string;
  dateKey: string;
}

export interface AmyHomeState {
  quickPlay: QuickPlayCard | null;
  dailyPick: DailyPickCard | null;
}

export interface RecommendationOutput {
  lessonIds: string[];
  reason: string;
}

export interface EmergencyLessonResult {
  lessonId: string;
  reason: string;
}
