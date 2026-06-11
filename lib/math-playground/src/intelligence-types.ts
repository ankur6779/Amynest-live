import type { AdaptivityTier, PlaygroundActivityId, SkillBreakdown, SkillTrend } from "./types";

/** Phase 6 — AI worksheet & school readiness intelligence layer. */

export type WorksheetLevel = 1 | 2 | 3 | 4;

export type WorksheetCategory =
  | "counting"
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "patterns";

export type WorksheetProblemType =
  | "count_objects"
  | "circle_number"
  | "match_quantity"
  | "visual_addition"
  | "number_addition"
  | "missing_addend"
  | "cross_out_subtract"
  | "find_remaining"
  | "groups_multiply"
  | "array_multiply"
  | "repeated_addition"
  | "sharing_division"
  | "grouping_division"
  | "equal_distribution"
  | "complete_sequence"
  | "missing_pattern"
  | "continue_pattern";

export type SchoolReadinessBand = "early" | "developing" | "ready" | "highly_ready";

export type GapSeverity = "watch" | "focus" | "urgent";

export type RecommendationHorizon = "daily" | "weekly" | "monthly";

export interface WorksheetVisualSpec {
  objectKind: "apple" | "star" | "flower" | "block" | "toy" | "cookie";
  objectCount: number;
  groups?: number;
  perGroup?: number;
}

export interface WorksheetProblem {
  id: string;
  type: WorksheetProblemType;
  promptKey: string;
  promptParams: Record<string, string | number>;
  answer: number | string;
  choices?: number[];
  visual?: WorksheetVisualSpec;
}

export interface GeneratedWorksheet {
  id: string;
  childId: number;
  category: WorksheetCategory;
  level: WorksheetLevel;
  levelLabelKey: string;
  titleKey: string;
  difficultyLabelKey: string;
  focusSkills: (keyof SkillBreakdown)[];
  problems: WorksheetProblem[];
  problemCount: number;
  adaptivityTier: AdaptivityTier;
  generatedAt: number;
  seed: number;
}

export interface GeneratedWorksheetRecord {
  worksheet: GeneratedWorksheet;
  downloadedAt?: number;
}

export interface ReadinessDimension {
  key:
    | "counting"
    | "number_recognition"
    | "addition"
    | "problem_solving"
    | "pattern_recognition"
    | "attention_span"
    | "persistence";
  score: number;
  weight: number;
}

export interface SchoolReadinessSnapshot {
  score: number;
  band: SchoolReadinessBand;
  dimensions: ReadinessDimension[];
  sessionCount: number;
  generatedAt: number;
}

export interface LearningGap {
  skill: keyof SkillBreakdown;
  severity: GapSeverity;
  reasonKeys: string[];
  suggestedActivityId: PlaygroundActivityId;
  masteryScore: number;
}

export interface LearningGapSummary {
  gaps: LearningGap[];
  recommendedFocus: PlaygroundActivityId[];
  detectedAt: number;
  sessionCount: number;
}

export interface ParentLearningReport {
  id: string;
  generatedAt: number;
  sessionsIncluded: number;
  strengths: (keyof SkillBreakdown)[];
  areasToImprove: (keyof SkillBreakdown)[];
  schoolReadiness: SchoolReadinessSnapshot;
  confidenceTrend: SkillTrend;
  recommendedActivities: PlaygroundActivityId[];
  estimatedSkillAgeYears: number;
  childAgeYears: number;
  summaryKey: string;
}

export interface RecommendationItem {
  horizon: RecommendationHorizon;
  titleKey: string;
  activityId?: PlaygroundActivityId;
  skillFocus?: keyof SkillBreakdown;
  priority: "primary" | "secondary";
}

export interface RecommendationBundle {
  generatedAt: number;
  items: RecommendationItem[];
}

export interface ProgressForecastSnapshot {
  generatedAt: number;
  currentReadiness: number;
  forecast30: number;
  forecast60: number;
  forecast90: number;
  practiceSessionsPerWeek: number;
  assumptionsKey: string;
}

export type TeacherSkillStatus = "mastered" | "emerging" | "needs_support";

export interface TeacherSkillRow {
  skill: keyof SkillBreakdown;
  status: TeacherSkillStatus;
  masteryScore: number;
  trend: SkillTrend;
}

export interface TeacherReportSummary {
  id: string;
  generatedAt: number;
  childDisplayName: string;
  childAgeYears: number;
  schoolReadinessScore: number;
  schoolReadinessBand: SchoolReadinessBand;
  skillsMastered: TeacherSkillRow[];
  skillsEmerging: TeacherSkillRow[];
  skillsNeedingSupport: TeacherSkillRow[];
  assessmentHistory: { date: string; readinessScore: number; sessionCount: number }[];
  notesKey: string;
}

export interface PlaygroundIntelligenceState {
  schoolReadiness?: SchoolReadinessSnapshot;
  learningGaps?: LearningGapSummary;
  generatedWorksheets?: GeneratedWorksheetRecord[];
  parentReports?: ParentLearningReport[];
  forecastHistory?: ProgressForecastSnapshot[];
  lastRecommendationBundle?: RecommendationBundle;
  lastTeacherReport?: TeacherReportSummary;
  sessionsSinceLastReport?: number;
}

export const PARENT_REPORT_SESSION_INTERVAL = 10;

export const WORKSHEET_LEVEL_LABEL_KEYS: Record<WorksheetLevel, string> = {
  1: "worksheet_level_beginner",
  2: "worksheet_level_developing",
  3: "worksheet_level_confident",
  4: "worksheet_level_advanced",
};

export function schoolReadinessBandFromScore(score: number): SchoolReadinessBand {
  if (score >= 80) return "highly_ready";
  if (score >= 60) return "ready";
  if (score >= 40) return "developing";
  return "early";
}
