// ─────────────────────────────────────────────────────────────────────────
// Top-level orchestration entry point.
// `orchestrateHousehold` takes raw per-child draft routines + caregiver/
// resource context and produces a HouseholdRoutineState — the single object
// the API + UI consume.
// ─────────────────────────────────────────────────────────────────────────

import type { HandlerKey } from "@workspace/family-routine";
import type {
  ActivityPriorityWeights,
  ChildRoutineInput,
  ConflictItem,
  ConflictMatrix,
  HouseholdResource,
  HouseholdRoutineState,
  HouseholdTimelineSlot,
  OrchestrateOptions,
  Resolution,
} from "./types";
import { detectConflicts, indexItems } from "./detect";
import { applyResolutions, planResolutions } from "./resolve";
import { effectivePriority, resolveWeights } from "./priorities";
import { formatTime12, parseTime } from "./time";

export function orchestrateHousehold(opts: OrchestrateOptions): HouseholdRoutineState {
  const trace: HouseholdRoutineState["reasoningTrace"] = [];
  const weights = resolveWeights(opts.weights);

  // 1. Detect conflicts on the original (draft) routines.
  const conflicts = detectConflicts(
    opts.routines,
    opts.caregivers,
    weights,
    opts.resources,
    { mealSyncWindowMinutes: opts.mealSyncWindowMinutes },
  );
  trace.push({
    step: "detect_conflicts",
    detail: `Inspected ${opts.routines.length} routines across ${countItems(opts.routines)} items.`,
    inputCount: opts.routines.length,
    outputCount: conflicts.length,
  });

  // 2. Plan resolutions.
  const resolutions = planResolutions(conflicts, opts.routines, opts.caregivers, weights);
  trace.push({
    step: "plan_resolutions",
    detail: `Built ${resolutions.length} resolution proposals (${resolutions.filter((r) => r.strategy !== "no_action").length} actionable).`,
    inputCount: conflicts.length,
    outputCount: resolutions.length,
  });

  // 3. Apply (or skip in dry-run).
  const finalRoutines = opts.dryRun
    ? deepCopyRoutines(opts.routines)
    : applyResolutions(opts.routines, resolutions);
  trace.push({
    step: opts.dryRun ? "skip_apply_dry_run" : "apply_resolutions",
    detail: opts.dryRun
      ? "Dry run requested — finalRoutines mirror originalRoutines."
      : "Resolutions applied to a deep-copy of the routines.",
  });

  // 4. Recompute conflicts on the FINAL routines so timeline + summary
  //    reflect the post-resolution household state.
  const postResolutionConflicts = opts.dryRun
    ? conflicts
    : detectConflicts(
        finalRoutines,
        opts.caregivers,
        weights,
        opts.resources,
        { mealSyncWindowMinutes: opts.mealSyncWindowMinutes },
      );
  trace.push({
    step: "recompute_post_resolution_conflicts",
    detail: `${postResolutionConflicts.length} conflict(s) remain after resolutions.`,
    inputCount: conflicts.length,
    outputCount: postResolutionConflicts.length,
  });

  // 5. Build timeline + summary on the FINAL routines (post-resolution).
  const timeline = buildTimeline(finalRoutines, postResolutionConflicts, opts.bucketMinutes ?? 15);
  const summary = computeSummary(finalRoutines, conflicts, postResolutionConflicts, resolutions, weights);
  trace.push({
    step: "build_timeline_and_summary",
    detail: `Generated ${timeline.length} timeline slots; overall household score = ${summary.overallScore}/100.`,
  });

  return {
    date: opts.date,
    originalRoutines: deepCopyRoutines(opts.routines),
    finalRoutines,
    conflicts,
    postResolutionConflicts,
    resolutions,
    timeline,
    summary,
    reasoningTrace: trace,
  };
}

/** Build a sparse 15-minute (configurable) bucket conflict matrix.
 *  Used by the explainability layer (Module 3) for heatmaps. */
export function buildConflictMatrix(
  routines: ChildRoutineInput[],
  weights: ActivityPriorityWeights,
  bucketMinutes = 15,
): ConflictMatrix {
  const dayBuckets = Math.ceil((24 * 60) / bucketMinutes);
  const data: Array<Map<number, number>> = Array.from(
    { length: dayBuckets },
    () => new Map<number, number>(),
  );
  const items = indexItems(routines);
  for (const it of items) {
    const startBucket = Math.floor(it.startMins / bucketMinutes);
    const endBucket   = Math.min(dayBuckets - 1, Math.ceil(it.endMins / bucketMinutes));
    const score = effectivePriority(it.item.category, it.child, weights);
    for (let b = startBucket; b <= endBucket; b++) {
      const cur = data[b].get(it.childId) ?? 0;
      data[b].set(it.childId, cur + score);
    }
  }
  return { bucketMinutes, buckets: dayBuckets, data };
}

// ── timeline ─────────────────────────────────────────────────────────────
function buildTimeline(
  routines: ChildRoutineInput[],
  conflicts: ConflictItem[],
  bucketMinutes: number,
): HouseholdTimelineSlot[] {
  const items = indexItems(routines);
  if (items.length === 0) return [];

  const start = Math.floor(items[0].startMins / bucketMinutes) * bucketMinutes;
  const end   = Math.ceil(Math.max(...items.map((i) => i.endMins)) / bucketMinutes) * bucketMinutes;
  const slots: HouseholdTimelineSlot[] = [];

  for (let t = start; t < end; t += bucketMinutes) {
    const bucketEnd = t + bucketMinutes;
    const entries: HouseholdTimelineSlot["entries"] = [];
    const caregiverSet = new Set<HandlerKey>();
    const resourceSet  = new Set<HouseholdResource>();
    for (const it of items) {
      if (it.startMins < bucketEnd && it.endMins > t) {
        entries.push({
          childId: it.childId,
          childName: it.childName,
          item: it.item,
        });
        const cg = (it.item.caregiver ?? it.child.defaultCaregiver) as HandlerKey | undefined;
        if (cg) caregiverSet.add(cg);
        const res = inferResource(it.item.category);
        if (res) resourceSet.add(res);
      }
    }
    if (entries.length === 0) continue;
    const overlapsConflict = conflicts.some((c) => {
      const cs = parseTime(c.startTime);
      const ce = parseTime(c.endTime);
      return cs < bucketEnd && ce > t;
    });
    slots.push({
      startTime: formatTime12(t),
      endTime:   formatTime12(bucketEnd),
      entries,
      caregivers: Array.from(caregiverSet),
      resources:  Array.from(resourceSet),
      hasConflict: overlapsConflict,
    });
  }
  return slots;
}

function inferResource(category: string): HouseholdResource | null {
  switch (category) {
    case "meal":
    case "tiffin":          return "kitchen";
    case "hygiene":
    case "self_care":
    case "morning_routine": return "bathroom";
    case "study":           return "study_area";
    case "play":
    case "creative":        return "play_area";
    default:                return null;
  }
}

// ── summary scoring ──────────────────────────────────────────────────────
function computeSummary(
  routines: ChildRoutineInput[],
  conflicts: ConflictItem[],
  postConflicts: ConflictItem[],
  resolutions: Resolution[],
  weights: ActivityPriorityWeights,
) {
  const totalConflicts = conflicts.filter((c) => c.kind !== "shared_activity_opportunity").length;
  const remaining = postConflicts.filter((c) => c.kind !== "shared_activity_opportunity").length;
  const resolvedFromDelta = Math.max(0, totalConflicts - remaining);
  const resolvedFromPlan = resolutions.filter((r) => r.strategy !== "no_action").length;
  // Use the smaller of (delta-based, plan-based) to avoid over-claiming.
  const resolvedConflicts = Math.min(resolvedFromDelta, resolvedFromPlan);
  const sharedActivityWindows = conflicts.filter(
    (c) => c.kind === "shared_activity_opportunity",
  ).length;

  // Caregiver peak load — max simultaneous distinct children needing same caregiver.
  let caregiverPeakLoad = 0;
  const items = indexItems(routines);
  const byTime = new Map<string, Map<HandlerKey, Set<number>>>();
  for (const it of items) {
    const cg = (it.item.caregiver ?? it.child.defaultCaregiver) as HandlerKey | undefined;
    if (!cg) continue;
    // Stamp every minute the item runs (cheap — at most 1440 stamps per item).
    for (let t = it.startMins; t < it.endMins; t += 5) {
      const key = String(t);
      if (!byTime.has(key)) byTime.set(key, new Map());
      const m = byTime.get(key)!;
      if (!m.has(cg)) m.set(cg, new Set());
      m.get(cg)!.add(it.childId);
    }
  }
  for (const m of byTime.values()) {
    for (const set of m.values()) {
      if (set.size > caregiverPeakLoad) caregiverPeakLoad = set.size;
    }
  }

  // Sleep integrity — based on REMAINING (post-resolution) violations.
  const sleepConflicts = postConflicts.filter((c) => c.kind === "sleep_window_violation");
  const sleepIntegrityScore = Math.max(
    0,
    100 - sleepConflicts.reduce((s, c) => s + c.severity * 5, 0),
  );

  // Overall — weighted: 40% sleep, 30% conflict resolution, 30% caregiver load fit.
  const conflictFactor =
    totalConflicts === 0 ? 100 : Math.round((resolvedConflicts / totalConflicts) * 100);
  const loadPenalty = caregiverPeakLoad <= 1 ? 100 : Math.max(0, 100 - (caregiverPeakLoad - 1) * 20);
  const overallScore = Math.round(
    sleepIntegrityScore * 0.4 + conflictFactor * 0.3 + loadPenalty * 0.3,
  );

  void weights; // reserved for future scoring tweaks
  return {
    totalConflicts,
    resolvedConflicts,
    sharedActivityWindows,
    caregiverPeakLoad,
    sleepIntegrityScore,
    overallScore,
  };
}

function countItems(routines: ChildRoutineInput[]): number {
  return routines.reduce((s, r) => s + r.items.length, 0);
}

function deepCopyRoutines(routines: ChildRoutineInput[]): ChildRoutineInput[] {
  return routines.map((r) => ({
    child: { ...r.child },
    items: r.items.map((it) => ({ ...it })),
  }));
}
