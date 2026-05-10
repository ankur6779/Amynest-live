// ─────────────────────────────────────────────────────────────────────────────
// Module 4 — AI Safety Layer — Deterministic Validation Engine
//
// Pure functions only. No I/O. Trivially testable.
//   1. classifyAgeBand(months) → AgeBand
//   2. validateRoutine(input)  → SafetyValidationResult
//   3. computeSafetyScore(violations) → 0-100
// ─────────────────────────────────────────────────────────────────────────────

import rulesData from "./ageSafetyRules.json" with { type: "json" };
import type {
  AgeBand,
  SafetyValidationInput,
  SafetyValidationResult,
  SafetyViolation,
  SafetyAdjustment,
  SafetyCategory,
  SafetySeverity,
} from "./types.js";

interface RawRule {
  id: string;
  category: SafetyCategory;
  appliesTo: AgeBand[];
  description: string;
  severity: SafetySeverity;
  minSleepMinutes?: number;
  maxScreenMinutes?: number;
  blockedIntensity?: "low" | "moderate" | "high";
  maxHighIntensityBlockMinutes?: number;
  requiresCaregiver?: boolean;
  minOutdoorMinutes?: number;
  minMealCount?: number;
  maxActiveMinutes?: number;
}

const RULES: RawRule[] = (rulesData as { rules: RawRule[] }).rules;

export function classifyAgeBand(months: number): AgeBand {
  if (months < 18) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 132) return "school";
  return "tween";
}

const SEVERITY_PENALTY: Record<SafetySeverity, number> = {
  info: 5,
  warning: 15,
  critical: 35,
};

export function computeSafetyScore(violations: SafetyViolation[]): number {
  const total = violations.reduce(
    (sum, v) => sum + SEVERITY_PENALTY[v.severity],
    0,
  );
  return Math.max(0, Math.min(100, 100 - total));
}

function rulesForBand(band: AgeBand): RawRule[] {
  return RULES.filter((r) => r.appliesTo.includes(band));
}

export function validateRoutine(
  input: SafetyValidationInput,
): SafetyValidationResult {
  const band = input.ageBand;
  const applied = rulesForBand(band);
  const violations: SafetyViolation[] = [];
  const adjustments: SafetyAdjustment[] = [];

  for (const rule of applied) {
    // Sleep minimum
    if (
      rule.minSleepMinutes !== undefined &&
      (input.totalSleepMinutes ?? 0) < rule.minSleepMinutes
    ) {
      violations.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.description,
        affectedActivityIds: [],
      });
      adjustments.push({
        type: "add",
        reason: `Sleep below ${rule.minSleepMinutes}min recommended for ${band}`,
        suggestion: `Add an additional rest/sleep block of ~${rule.minSleepMinutes - (input.totalSleepMinutes ?? 0)} minutes.`,
      });
    }

    // Screen-time maximum
    if (
      rule.maxScreenMinutes !== undefined &&
      (input.totalScreenMinutes ?? 0) > rule.maxScreenMinutes
    ) {
      const screenActs = input.activities.filter((a) =>
        /screen|tv|tablet|video|youtube/i.test(a.category) ||
        /screen|tv|tablet|video|youtube/i.test(a.title),
      );
      violations.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.description,
        affectedActivityIds: screenActs.map((a) => a.id),
      });
      const overage = (input.totalScreenMinutes ?? 0) - rule.maxScreenMinutes;
      adjustments.push({
        type: "shorten",
        reason: `Screen time exceeds ${rule.maxScreenMinutes}min limit for ${band}`,
        suggestion: `Reduce screen activities by ${overage} minutes.`,
      });
    }

    // Blocked intensity
    if (rule.blockedIntensity) {
      const blocked = input.activities.filter(
        (a) => a.intensity === rule.blockedIntensity,
      );
      if (blocked.length > 0) {
        violations.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.description,
          affectedActivityIds: blocked.map((a) => a.id),
        });
        for (const a of blocked) {
          adjustments.push({
            activityId: a.id,
            type: "replace",
            reason: `${rule.blockedIntensity}-intensity not appropriate for ${band}`,
            suggestion: `Replace "${a.title}" with a low-intensity alternative.`,
          });
        }
      }
    }

    // Continuous high-intensity block too long
    if (rule.maxHighIntensityBlockMinutes !== undefined) {
      const longHigh = input.activities.filter(
        (a) =>
          a.intensity === "high" &&
          a.durationMinutes > (rule.maxHighIntensityBlockMinutes ?? 0),
      );
      if (longHigh.length > 0) {
        violations.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.description,
          affectedActivityIds: longHigh.map((a) => a.id),
        });
        for (const a of longHigh) {
          adjustments.push({
            activityId: a.id,
            type: "shorten",
            reason: `High-intensity block longer than ${rule.maxHighIntensityBlockMinutes}min`,
            suggestion: `Shorten "${a.title}" to ${rule.maxHighIntensityBlockMinutes} minutes or split into multiple blocks.`,
          });
        }
      }
    }

    // Caregiver supervision required
    if (rule.requiresCaregiver && input.caregiverPresent === false) {
      violations.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.description,
        affectedActivityIds: input.activities.map((a) => a.id),
      });
      adjustments.push({
        type: "add",
        reason: `Caregiver supervision required for ${band}`,
        suggestion: `Ensure a caregiver is present throughout the day.`,
      });
    }

    // Outdoor minimum
    if (
      rule.minOutdoorMinutes !== undefined &&
      (input.totalOutdoorMinutes ?? 0) < rule.minOutdoorMinutes
    ) {
      violations.push({
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity,
        message: rule.description,
        affectedActivityIds: [],
      });
      adjustments.push({
        type: "add",
        reason: `Below recommended outdoor exposure for ${band}`,
        suggestion: `Add at least ${rule.minOutdoorMinutes - (input.totalOutdoorMinutes ?? 0)} minutes of outdoor activity.`,
      });
    }

    // Meal count minimum
    if (rule.minMealCount !== undefined) {
      const meals = input.activities.filter((a) =>
        /meal|breakfast|lunch|dinner|snack|tiffin/i.test(a.category) ||
        /meal|breakfast|lunch|dinner|snack|tiffin/i.test(a.title),
      );
      if (meals.length < rule.minMealCount) {
        violations.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.description,
          affectedActivityIds: [],
        });
        adjustments.push({
          type: "add",
          reason: `Fewer than ${rule.minMealCount} meals scheduled`,
          suggestion: `Add ${rule.minMealCount - meals.length} more meal/snack block(s).`,
        });
      }
    }

    // Total active time cap
    if (rule.maxActiveMinutes !== undefined) {
      const active = input.activities
        .filter((a) => a.intensity === "moderate" || a.intensity === "high")
        .reduce((s, a) => s + a.durationMinutes, 0);
      if (active > rule.maxActiveMinutes) {
        violations.push({
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          message: rule.description,
          affectedActivityIds: input.activities
            .filter(
              (a) => a.intensity === "moderate" || a.intensity === "high",
            )
            .map((a) => a.id),
        });
        adjustments.push({
          type: "shorten",
          reason: `Total active time exceeds ${rule.maxActiveMinutes}min`,
          suggestion: `Reduce active blocks by ${active - rule.maxActiveMinutes} minutes.`,
        });
      }
    }
  }

  const safetyScore = computeSafetyScore(violations);
  const hasCritical = violations.some((v) => v.severity === "critical");
  return {
    isValid: !hasCritical,
    safetyScore,
    violations,
    adjustments,
    appliedRuleIds: applied.map((r) => r.id),
  };
}

export { RULES as SAFETY_RULES };
