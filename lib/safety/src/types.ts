export type AgeBand = "infant" | "toddler" | "preschool" | "school" | "tween";

export type SafetyCategory =
  | "sleep_safety"
  | "screen_time"
  | "activity_intensity"
  | "nutrition_balance"
  | "supervision"
  | "outdoor_exposure";

export type SafetySeverity = "info" | "warning" | "critical";

export interface SafetyRule {
  id: string;
  category: SafetyCategory;
  appliesTo: AgeBand[];
  description: string;
  severity: SafetySeverity;
}

export interface RoutineActivityInput {
  id: string;
  title: string;
  startMinutes: number;
  durationMinutes: number;
  category: string;
  intensity?: "low" | "moderate" | "high";
  supervisionRequired?: boolean;
}

export interface SafetyValidationInput {
  ageBand: AgeBand;
  ageMonths: number;
  activities: RoutineActivityInput[];
  totalScreenMinutes?: number;
  totalSleepMinutes?: number;
  totalOutdoorMinutes?: number;
  caregiverPresent?: boolean;
}

export interface SafetyViolation {
  ruleId: string;
  category: SafetyCategory;
  severity: SafetySeverity;
  message: string;
  affectedActivityIds: string[];
}

export interface SafetyAdjustment {
  activityId?: string;
  type: "shorten" | "shift" | "remove" | "add" | "replace";
  reason: string;
  suggestion: string;
}

export interface SafetyValidationResult {
  isValid: boolean;
  safetyScore: number; // 0-100
  violations: SafetyViolation[];
  adjustments: SafetyAdjustment[];
  appliedRuleIds: string[];
}
