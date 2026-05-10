// ─────────────────────────────────────────────────────────────────────────
// Resolution layer — converts ConflictItems into Resolutions and (when not
// in dry-run) applies them to the routines in-place-of-copy fashion.
//
// Strategy selection per conflict kind:
//   caregiver_overlap / overload → shift_later (lower-priority loses)
//                                 → swap_caregiver (if alt available)
//   resource_contention          → shift_later or split_resource_window
//   meal_misalignment            → synchronize_meals
//   sleep_window_violation       → shift_earlier (noisy item)
//   school_collision             → no_action (advisory only)
//   shared_activity_opportunity  → merge_into_shared_activity
// ─────────────────────────────────────────────────────────────────────────

import type { HandlerKey } from "@workspace/family-routine";
import type {
  ActivityPriorityWeights,
  CaregiverAvailability,
  ChildRoutineInput,
  ConflictItem,
  Resolution,
  RoutineItem,
} from "./types";
import { effectivePriority } from "./priorities";
import { formatTime12, parseTime } from "./time";

const SHIFT_STEP_MIN = 15;

export function planResolutions(
  conflicts: ConflictItem[],
  routines: ChildRoutineInput[],
  caregivers: CaregiverAvailability[],
  weights: ActivityPriorityWeights,
): Resolution[] {
  return conflicts.map((c) => buildResolution(c, routines, caregivers, weights));
}

function buildResolution(
  c: ConflictItem,
  routines: ChildRoutineInput[],
  caregivers: CaregiverAvailability[],
  weights: ActivityPriorityWeights,
): Resolution {
  switch (c.kind) {
    case "caregiver_overlap":
    case "caregiver_overload":
      return resolveCaregiver(c, routines, caregivers, weights);
    case "resource_contention":
      return resolveResource(c, routines, weights);
    case "meal_misalignment":
      return resolveMealSync(c, routines);
    case "sleep_window_violation":
      return resolveSleepViolation(c, routines);
    case "school_collision":
      return {
        conflictId: c.id,
        strategy: "no_action",
        changes: [],
        rationale: "School times are external constraints. Coordinate drop-offs manually or arrange a carpool.",
        severityReduction: 0,
      };
    case "shared_activity_opportunity":
      return resolveSharedMerge(c, routines);
    default:
      return {
        conflictId: c.id,
        strategy: "no_action",
        changes: [],
        rationale: "No automatic resolution applicable.",
        severityReduction: 0,
      };
  }
}

// ── caregiver overlap / overload ─────────────────────────────────────────
function resolveCaregiver(
  c: ConflictItem,
  routines: ChildRoutineInput[],
  caregivers: CaregiverAvailability[],
  weights: ActivityPriorityWeights,
): Resolution {
  // Find every item involved in the overlap window.
  const items = collectItemsAtWindow(routines, c.childIds, c.startTime, c.endTime);

  // Try caregiver swap first — if a free caregiver covers the same window.
  const altCaregiver = pickAlternateCaregiver(c, caregivers);
  if (altCaregiver && items.length > 0) {
    const lowestPrio = pickLowestPriorityItem(items, weights);
    if (lowestPrio) {
      return {
        conflictId: c.id,
        strategy: "swap_caregiver",
        changes: [{
          childId: lowestPrio.childId,
          fromTime: lowestPrio.item.time,
          toTime:   lowestPrio.item.time,
          activity: lowestPrio.item.activity,
          action: "reassign",
          newCaregiver: altCaregiver,
        }],
        rationale: `Reassign "${lowestPrio.item.activity}" to ${altCaregiver} so the primary caregiver isn't double-booked.`,
        severityReduction: Math.max(2, c.severity - 2),
      };
    }
  }

  // Otherwise shift the lowest-priority item later by SHIFT_STEP_MIN.
  const lowest = pickLowestPriorityItem(items, weights);
  if (!lowest) {
    return noActionResolution(c, "Could not identify a flexible item to shift.");
  }
  const fromMins = parseTime(lowest.item.time);
  const toMins   = fromMins + SHIFT_STEP_MIN;
  return {
    conflictId: c.id,
    strategy: "shift_later",
    changes: [{
      childId: lowest.childId,
      fromTime: lowest.item.time,
      toTime:   formatTime12(toMins),
      activity: lowest.item.activity,
      action: "shift",
    }],
    rationale: `Shift "${lowest.item.activity}" by ${SHIFT_STEP_MIN} min so caregiver attention isn't split.`,
    severityReduction: Math.max(1, c.severity - 3),
  };
}

// ── resource contention ──────────────────────────────────────────────────
function resolveResource(
  c: ConflictItem,
  routines: ChildRoutineInput[],
  weights: ActivityPriorityWeights,
): Resolution {
  const items = collectItemsAtWindow(routines, c.childIds, c.startTime, c.endTime);
  const lowest = pickLowestPriorityItem(items, weights);
  if (!lowest) return noActionResolution(c, "No flexible item to reschedule.");
  const fromMins = parseTime(lowest.item.time);
  const toMins   = fromMins + SHIFT_STEP_MIN;
  return {
    conflictId: c.id,
    strategy: "split_resource_window",
    changes: [{
      childId: lowest.childId,
      fromTime: lowest.item.time,
      toTime:   formatTime12(toMins),
      activity: lowest.item.activity,
      action: "shift",
    }],
    rationale: `Stagger "${lowest.item.activity}" by ${SHIFT_STEP_MIN} min so the ${c.resource ?? "resource"} isn't oversubscribed.`,
    severityReduction: Math.max(1, c.severity - 2),
  };
}

// ── meal sync ────────────────────────────────────────────────────────────
function resolveMealSync(
  c: ConflictItem,
  routines: ChildRoutineInput[],
): Resolution {
  const items = collectItemsAtWindow(routines, c.childIds, c.startTime, c.endTime)
    .filter((i) => i.item.category === "meal" || i.item.category === "tiffin");
  if (items.length < 2) return noActionResolution(c, "Not enough meals to synchronize.");
  // Sync target = earliest meal start time across the involved kids.
  const earliestMins = Math.min(...items.map((it) => parseTime(it.item.time)));
  const targetTime = formatTime12(earliestMins);
  const changes = items
    .filter((it) => parseTime(it.item.time) !== earliestMins)
    .map((it) => ({
      childId: it.childId,
      fromTime: it.item.time,
      toTime:   targetTime,
      activity: it.item.activity,
      action:   "shift" as const,
    }));
  return {
    conflictId: c.id,
    strategy: "synchronize_meals",
    changes,
    rationale: `Move all meals to ${targetTime} so the family eats together — cuts down on kitchen runs and improves bonding.`,
    severityReduction: c.severity,
  };
}

// ── sleep violation: shift the noisy item earlier ────────────────────────
function resolveSleepViolation(
  c: ConflictItem,
  routines: ChildRoutineInput[],
): Resolution {
  // The "noisy" child is the one that is NOT the sleeper in childIds.
  // We shift the noisy item earlier (or later, away from the sleep window).
  // Heuristic: shift later by enough to clear the sleep window's end.
  const allItems = collectItemsAtWindow(routines, c.childIds, c.startTime, c.endTime);
  const noisy = allItems.find(
    (i) =>
      i.item.category !== "sleep" &&
      !/sleep|nap|bedtime/i.test(i.item.activity),
  );
  if (!noisy) return noActionResolution(c, "No noisy item to shift.");
  const endMins = parseTime(c.endTime);
  const newStart = endMins; // place right after sleep window ends
  return {
    conflictId: c.id,
    strategy: "shift_later",
    changes: [{
      childId: noisy.childId,
      fromTime: noisy.item.time,
      toTime:   formatTime12(newStart),
      activity: noisy.item.activity,
      action: "shift",
    }],
    rationale: `Move "${noisy.item.activity}" out of the sibling's sleep window so naps aren't interrupted.`,
    severityReduction: c.severity,
  };
}

// ── shared-activity merge (positive hint) ────────────────────────────────
function resolveSharedMerge(
  c: ConflictItem,
  routines: ChildRoutineInput[],
): Resolution {
  const items = collectItemsAtWindow(routines, c.childIds, c.startTime, c.endTime);
  if (items.length < 2) return noActionResolution(c, "Not enough overlapping items.");
  const targetMins = Math.min(...items.map((it) => parseTime(it.item.time)));
  const targetTime = formatTime12(targetMins);
  const changes = items
    .filter((it) => parseTime(it.item.time) !== targetMins)
    .map((it) => ({
      childId: it.childId,
      fromTime: it.item.time,
      toTime:   targetTime,
      activity: it.item.activity,
      action:   "merge" as const,
    }));
  return {
    conflictId: c.id,
    strategy: "merge_into_shared_activity",
    changes,
    rationale: `Combine into one shared session at ${targetTime} — siblings bond and you supervise once.`,
    severityReduction: c.severity,
  };
}

// ── shared helpers ───────────────────────────────────────────────────────
interface FoundItem {
  childId: number;
  child: ChildRoutineInput["child"];
  item: RoutineItem;
}

function collectItemsAtWindow(
  routines: ChildRoutineInput[],
  childIds: number[],
  startTime: string,
  endTime: string,
): FoundItem[] {
  const wanted = new Set(childIds);
  const sMins = parseTime(startTime);
  const eMins = parseTime(endTime);
  const out: FoundItem[] = [];
  for (const r of routines) {
    if (!wanted.has(r.child.id)) continue;
    for (const it of r.items) {
      const itStart = parseTime(it.time);
      if (itStart < 0) continue;
      const itEnd = itStart + (it.duration || 0);
      if (itStart < eMins && itEnd > sMins) {
        out.push({ childId: r.child.id, child: r.child, item: it });
      }
    }
  }
  return out;
}

function pickLowestPriorityItem(
  items: FoundItem[],
  weights: ActivityPriorityWeights,
): FoundItem | null {
  if (items.length === 0) return null;
  let lowest = items[0];
  let lowestScore = effectivePriority(lowest.item.category, lowest.child, weights);
  for (let i = 1; i < items.length; i++) {
    const s = effectivePriority(items[i].item.category, items[i].child, weights);
    if (s < lowestScore) {
      lowest = items[i];
      lowestScore = s;
    }
  }
  return lowest;
}

function pickAlternateCaregiver(
  c: ConflictItem,
  caregivers: CaregiverAvailability[],
): HandlerKey | null {
  if (!c.caregiver) return null;
  const sMins = parseTime(c.startTime);
  const eMins = parseTime(c.endTime);
  for (const cg of caregivers) {
    if (cg.caregiver === c.caregiver) continue;
    if (cg.windows.length === 0) return cg.caregiver; // assume always available
    const covers = cg.windows.some((w) => {
      const ws = parseTime(w.start);
      const we = parseTime(w.end);
      return ws <= sMins && we >= eMins;
    });
    if (covers) return cg.caregiver;
  }
  return null;
}

function noActionResolution(c: ConflictItem, why: string): Resolution {
  return {
    conflictId: c.id,
    strategy: "no_action",
    changes: [],
    rationale: why,
    severityReduction: 0,
  };
}

/** Apply resolutions to a deep copy of the routines and return the new
 *  ChildRoutineInput[]. Idempotent — each shift is applied exactly once. */
export function applyResolutions(
  routines: ChildRoutineInput[],
  resolutions: Resolution[],
): ChildRoutineInput[] {
  // Deep copy to avoid mutating caller's data.
  const copy: ChildRoutineInput[] = routines.map((r) => ({
    child: { ...r.child },
    items: r.items.map((it) => ({ ...it })),
  }));
  const indexBy = (cid: number) => copy.find((r) => r.child.id === cid);

  for (const res of resolutions) {
    if (res.strategy === "no_action") continue;
    for (const ch of res.changes) {
      const owner = indexBy(ch.childId);
      if (!owner) continue;
      const idx = owner.items.findIndex(
        (it) => it.time === ch.fromTime && it.activity === ch.activity,
      );
      if (idx === -1) continue;
      const orig = owner.items[idx];
      if (ch.action === "drop") {
        owner.items.splice(idx, 1);
      } else if (ch.action === "reassign") {
        owner.items[idx] = {
          ...orig,
          caregiver: ch.newCaregiver ?? orig.caregiver,
          notes: appendNote(orig.notes, `↻ Reassigned to ${ch.newCaregiver ?? "alt caregiver"}.`),
        };
      } else {
        // shift / merge — both move the item to a new time.
        owner.items[idx] = {
          ...orig,
          time: ch.toTime,
          shiftedFromTime: orig.time,
          status: "shifted",
          notes: appendNote(
            orig.notes,
            ch.action === "merge"
              ? "↔ Merged into shared family activity."
              : `↪ Shifted from ${orig.time} to resolve conflict.`,
          ),
        };
      }
    }
    // Re-sort items by time after every resolution.
    for (const r of copy) {
      r.items.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    }
  }
  return copy;
}

function appendNote(existing: string | undefined, addition: string): string {
  if (!existing || !existing.trim()) return addition;
  if (existing.includes(addition)) return existing;
  return `${existing} ${addition}`;
}
