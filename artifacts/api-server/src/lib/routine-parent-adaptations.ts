/**
 * Build parent-safe adaptation strings before explainability formatting.
 */
import {
  formatParentRoutineExplanation,
  type ParentExplanationContext,
} from "@workspace/explainability";
import type { DifficultyAdjustment } from "./routine-adaptive-difficulty.js";
import type { FixedActivitiesDebug } from "./routine-fixed-activities.js";
import type { SpecialEventDebug } from "./routine-special-event.js";
import { finalizeFixedActivitiesSummary } from "./routine-fixed-activities.js";

export function parentFriendlyDifficultyLines(
  adjustments: DifficultyAdjustment[],
): string[] {
  return adjustments
    .map((a) => {
      if (a.reason?.trim()) return a.reason.trim();
      if (a.direction === "decrease" || a.direction === "lighten") {
        return `Shortened "${a.activity}" to match recent energy levels.`;
      }
      if (a.direction === "increase") {
        return `Extended "${a.activity}" slightly — it has been going well.`;
      }
      return null;
    })
    .filter((s): s is string => !!s);
}

export function parentFriendlySpecialEventLines(se: SpecialEventDebug): string[] {
  if (!se.eventDetected || !se.eventActivity) return [];
  const lines: string[] = [];
  if (se.eventTime) {
    lines.push(
      `Special plan "${se.eventActivity}" at ${se.eventTime} was scheduled first — the rest of the day fits around it.`,
    );
  } else {
    lines.push(
      `Special plan "${se.eventActivity}" was woven into today's schedule.`,
    );
  }
  return lines;
}

export function parentFriendlyFixedActivityLines(
  debug: FixedActivitiesDebug,
  childName?: string | null,
): string[] {
  if (!debug.fixedActivitiesApplied) return [];
  finalizeFixedActivitiesSummary(debug, childName ?? undefined);
  const lines: string[] = [];
  if (debug.summaryMessage?.trim()) {
    lines.push(debug.summaryMessage.trim());
  }
  for (const adj of debug.adjustmentsMade) {
    if (adj.trim()) lines.push(adj.trim());
  }
  for (const shift of debug.shiftsApplied) {
    const detail = `${shift.activity}: ${shift.reason}`.trim();
    if (detail.length > 10) lines.push(detail);
  }
  return lines;
}

export function mergeParentRoutineAdaptations(
  rawLines: readonly string[],
  ctx: ParentExplanationContext,
): string[] {
  return formatParentRoutineExplanation(rawLines, ctx).bullets;
}
