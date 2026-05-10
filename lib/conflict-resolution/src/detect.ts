// ─────────────────────────────────────────────────────────────────────────
// Conflict detection — pure inspection of household routines.
// Returns a ConflictItem[] without mutating inputs.
// ─────────────────────────────────────────────────────────────────────────

import type { HandlerKey } from "@workspace/family-routine";
import type {
  ActivityPriorityWeights,
  CaregiverAvailability,
  ChildRoutineInput,
  ConflictItem,
  HouseholdResource,
  RoutineItem,
  SharedHouseholdResources,
} from "./types";
import { effectivePriority } from "./priorities";
import {
  formatTime12,
  intervalsOverlap,
  overlapMinutes,
  parseTime,
} from "./time";

interface IndexedItem {
  childId: number;
  childName: string;
  childAge: number;
  child: import("./types").ChildProfile;
  item: RoutineItem;
  startMins: number;
  endMins: number;
}

/** Flatten all child routines into a single time-indexed array. */
export function indexItems(routines: ChildRoutineInput[]): IndexedItem[] {
  const out: IndexedItem[] = [];
  for (const r of routines) {
    for (const it of r.items) {
      const startMins = parseTime(it.time);
      if (startMins < 0) continue;
      const endMins = startMins + Math.max(1, it.duration || 0);
      out.push({
        childId: r.child.id,
        childName: r.child.name,
        childAge: r.child.age,
        child: r.child,
        item: it,
        startMins,
        endMins,
      });
    }
  }
  return out.sort((a, b) => a.startMins - b.startMins);
}

/** Stable conflict id — deterministic across runs given same inputs. */
function makeConflictId(
  kind: string,
  childIds: number[],
  startMins: number,
  extra?: string
): string {
  const sorted = [...childIds].sort((a, b) => a - b).join("_");
  return `${kind}:${sorted}:${startMins}${extra ? ":" + extra : ""}`;
}

const DEFAULT_RESOURCES: Required<SharedHouseholdResources> = {
  capacities: {
    bathroom:   1,
    kitchen:    2,
    study_area: 2,
    play_area:  4,
    tv:         4,
  },
  resourceByCategory: {
    meal:       "kitchen",
    tiffin:     "kitchen",
    hygiene:    "bathroom",
    self_care:  "bathroom",
    morning_routine: "bathroom",
    study:      "study_area",
    play:       "play_area",
    creative:   "play_area",
  },
};

/** Detect every kind of conflict in one pass. */
export function detectConflicts(
  routines: ChildRoutineInput[],
  caregivers: CaregiverAvailability[],
  weights: ActivityPriorityWeights,
  resources: SharedHouseholdResources = DEFAULT_RESOURCES,
  opts: { mealSyncWindowMinutes?: number } = {}
): ConflictItem[] {
  const items = indexItems(routines);
  const conflicts: ConflictItem[] = [];
  const seen = new Set<string>(); // de-dupe by id
  const push = (c: ConflictItem) => {
    if (seen.has(c.id)) return;
    seen.add(c.id);
    conflicts.push(c);
  };
  const resCaps = { ...DEFAULT_RESOURCES.capacities, ...resources.capacities };
  const resMap  = { ...DEFAULT_RESOURCES.resourceByCategory, ...resources.resourceByCategory };

  // 1. Caregiver overlap & overload — group items by caregiver and check capacity.
  detectCaregiverConflicts(items, caregivers, weights, push, makeConflictId);

  // 2. Resource contention — items needing the same resource concurrently.
  detectResourceConflicts(items, resCaps, resMap, weights, push, makeConflictId);

  // 3. Meal misalignment — meals scheduled across kids that should sync.
  // Default 20 min — anything wider than ~⅓ of a typical meal is worth syncing.
  detectMealMisalignments(
    items,
    opts.mealSyncWindowMinutes ?? 20,
    weights,
    push,
    makeConflictId,
  );

  // 4. Sleep window violations — non-sleep items inside another child's sleep.
  detectSleepViolations(items, weights, push, makeConflictId);

  // 5. School collisions — two children needing the same caregiver during
  //    school transit windows (typical morning rush).
  detectSchoolCollisions(routines, weights, push, makeConflictId);

  // 6. Shared activity opportunities — same-category, same-window items
  //    across siblings (positive-side hint, low severity).
  detectSharedActivityOpportunities(items, push, makeConflictId);

  return conflicts.sort((a, b) => b.severity - a.severity);
}

// ── 1. Caregiver overlap & overload ──────────────────────────────────────
function detectCaregiverConflicts(
  items: IndexedItem[],
  caregivers: CaregiverAvailability[],
  weights: ActivityPriorityWeights,
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  // Bucketize: which caregiver is needed for each item?
  const tagged = items
    .map((it) => ({
      ...it,
      caregiver: (it.item.caregiver ?? it.child.defaultCaregiver) as HandlerKey | undefined,
    }))
    .filter((it) => !!it.caregiver) as Array<IndexedItem & { caregiver: HandlerKey }>;

  // Group by caregiver, then sweep.
  const byCaregiver = new Map<HandlerKey, typeof tagged>();
  for (const it of tagged) {
    if (!byCaregiver.has(it.caregiver)) byCaregiver.set(it.caregiver, []);
    byCaregiver.get(it.caregiver)!.push(it);
  }

  for (const [cg, list] of byCaregiver.entries()) {
    const sorted = [...list].sort((a, b) => a.startMins - b.startMins);
    const cgInfo = caregivers.find((c) => c.caregiver === cg);
    const capacity = cgInfo?.capacity ?? 1;

    for (let i = 0; i < sorted.length; i++) {
      const overlapping: typeof sorted = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].startMins >= sorted[i].endMins) break;
        if (intervalsOverlap(
          sorted[i].startMins, sorted[i].endMins,
          sorted[j].startMins, sorted[j].endMins,
        )) {
          overlapping.push(sorted[j]);
        }
      }
      // Distinct children?
      const distinctChildren = new Set(overlapping.map((o) => o.childId));
      if (distinctChildren.size > capacity) {
        const childIds = Array.from(distinctChildren);
        const startMins = Math.min(...overlapping.map((o) => o.startMins));
        const endMins   = Math.max(...overlapping.map((o) => o.endMins));
        const sev = avgPriority(overlapping, weights);
        push({
          id: mkId("caregiver_overlap", childIds, startMins, cg),
          kind: distinctChildren.size > capacity + 1 ? "caregiver_overload" : "caregiver_overlap",
          explanation: `${cg} is needed by ${distinctChildren.size} children at the same time but can supervise ${capacity}.`,
          childIds,
          caregiver: cg,
          startTime: formatTime12(startMins),
          endTime:   formatTime12(endMins),
          severity:  Math.min(10, Math.round(sev / 10)),
        });
      }
    }

    // Caregiver availability window violation
    if (cgInfo && cgInfo.windows.length > 0) {
      const winMins = cgInfo.windows
        .map((w) => ({ s: parseTime(w.start), e: parseTime(w.end) }))
        .filter((w) => w.s >= 0 && w.e > w.s);
      for (const it of sorted) {
        const inside = winMins.some((w) =>
          it.startMins >= w.s && it.endMins <= w.e
        );
        if (!inside) {
          push({
            id: mkId("caregiver_overlap", [it.childId], it.startMins, cg + "_outwin"),
            kind: "caregiver_overlap",
            explanation: `${cg} is scheduled to handle "${it.item.activity}" outside their available hours.`,
            childIds: [it.childId],
            caregiver: cg,
            startTime: formatTime12(it.startMins),
            endTime:   formatTime12(it.endMins),
            severity:  Math.min(10, Math.round(
              effectivePriority(it.item.category, it.child, weights) / 12,
            )),
          });
        }
      }
    }
  }
}

// ── 2. Resource contention ───────────────────────────────────────────────
function detectResourceConflicts(
  items: IndexedItem[],
  capacities: Partial<Record<HouseholdResource, number>>,
  resByCat: Partial<Record<string, HouseholdResource>>,
  weights: ActivityPriorityWeights,
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  const tagged = items
    .map((it) => ({ ...it, resource: resByCat[it.item.category] }))
    .filter((it) => !!it.resource) as Array<IndexedItem & { resource: HouseholdResource }>;

  const byRes = new Map<HouseholdResource, typeof tagged>();
  for (const it of tagged) {
    if (!byRes.has(it.resource)) byRes.set(it.resource, []);
    byRes.get(it.resource)!.push(it);
  }

  for (const [res, list] of byRes.entries()) {
    const cap = capacities[res] ?? 1;
    const sorted = [...list].sort((a, b) => a.startMins - b.startMins);
    for (let i = 0; i < sorted.length; i++) {
      const overlapping = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].startMins >= sorted[i].endMins) break;
        if (intervalsOverlap(
          sorted[i].startMins, sorted[i].endMins,
          sorted[j].startMins, sorted[j].endMins,
        )) {
          overlapping.push(sorted[j]);
        }
      }
      const distinctChildren = new Set(overlapping.map((o) => o.childId));
      if (distinctChildren.size > cap) {
        const childIds = Array.from(distinctChildren);
        push({
          id: mkId("resource_contention", childIds, sorted[i].startMins, res),
          kind: "resource_contention",
          explanation: `${res.replace("_", " ")} is needed by ${distinctChildren.size} children at the same time (capacity ${cap}).`,
          childIds,
          resource: res,
          startTime: formatTime12(sorted[i].startMins),
          endTime:   formatTime12(Math.max(...overlapping.map((o) => o.endMins))),
          severity:  Math.min(10, Math.round(avgPriority(overlapping, weights) / 11)),
        });
      }
    }
  }
}

// ── 3. Meal misalignment ─────────────────────────────────────────────────
function detectMealMisalignments(
  items: IndexedItem[],
  windowMins: number,
  weights: ActivityPriorityWeights,
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  const meals = items.filter(
    (it) => it.item.category === "meal" || it.item.category === "tiffin",
  );
  if (meals.length < 2) return;

  // Group by meal-name token (breakfast / lunch / dinner / snack)
  const buckets: Record<string, IndexedItem[]> = {};
  for (const m of meals) {
    const tok = mealToken(m.item.activity);
    if (!tok) continue;
    (buckets[tok] ||= []).push(m);
  }
  for (const [tok, list] of Object.entries(buckets)) {
    if (list.length < 2) continue;
    const distinctChildren = new Set(list.map((l) => l.childId));
    if (distinctChildren.size < 2) continue;
    const minS = Math.min(...list.map((l) => l.startMins));
    const maxS = Math.max(...list.map((l) => l.startMins));
    if (maxS - minS > windowMins) {
      const childIds = Array.from(distinctChildren);
      push({
        id: mkId("meal_misalignment", childIds, minS, tok),
        kind: "meal_misalignment",
        explanation: `${cap(tok)} is scheduled ${maxS - minS} min apart across ${distinctChildren.size} children — synchronizing saves a kitchen run.`,
        childIds,
        startTime: formatTime12(minS),
        endTime:   formatTime12(maxS + 30),
        severity:  Math.min(10, Math.round(avgPriority(list, weights) / 12)),
      });
    }
  }
}

function mealToken(activity: string): string | null {
  const a = activity.toLowerCase();
  if (/breakfast/.test(a)) return "breakfast";
  if (/lunch/.test(a))     return "lunch";
  if (/dinner|supper/.test(a)) return "dinner";
  if (/snack|tiffin/.test(a))  return "snack";
  return null;
}

// ── 4. Sleep window violation ────────────────────────────────────────────
function detectSleepViolations(
  items: IndexedItem[],
  weights: ActivityPriorityWeights,
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  // For each child, compute their sleep window (from sleep items + child profile).
  const sleepByChild = new Map<number, Array<{ s: number; e: number; child: typeof items[number]["child"] }>>();
  for (const it of items) {
    if (it.item.category !== "sleep" && !/sleep|nap|bedtime/i.test(it.item.activity)) continue;
    if (!sleepByChild.has(it.childId)) sleepByChild.set(it.childId, []);
    sleepByChild.get(it.childId)!.push({ s: it.startMins, e: it.endMins, child: it.child });
  }
  // Add the child's profile sleepTime → wakeUpTime as an implicit overnight window.
  for (const it of items) {
    if (sleepByChild.has(it.childId)) continue;
    const sleep = parseTime(it.child.sleepTime);
    const wake  = parseTime(it.child.wakeUpTime);
    if (sleep < 0 || wake < 0) continue;
    sleepByChild.set(it.childId, [{ s: sleep, e: sleep < wake ? wake : 24 * 60, child: it.child }]);
  }

  // Now look for non-sleep items overlapping any sleep window of ANOTHER child.
  for (const it of items) {
    if (it.item.category === "sleep" || /sleep|nap|bedtime/i.test(it.item.activity)) continue;
    for (const [cid, windows] of sleepByChild.entries()) {
      if (cid === it.childId) continue;
      for (const w of windows) {
        if (intervalsOverlap(it.startMins, it.endMins, w.s, w.e)) {
          // Loud activities only — meals/study are quiet enough to coexist.
          const noisy = ["play", "outdoor", "creative", "music", "family"]
            .includes(it.item.category) || /play|game|music|sing|dance/i.test(it.item.activity);
          if (!noisy) continue;
          // Severity dominated by sleeping child's age (younger = higher).
          const sev = effectivePriority("sleep", w.child, weights) / 12;
          push({
            id: mkId("sleep_window_violation", [cid, it.childId], it.startMins),
            kind: "sleep_window_violation",
            explanation: `${w.child.name} is sleeping during this time — a noisy "${it.item.activity}" may wake them.`,
            childIds: [cid, it.childId],
            startTime: formatTime12(Math.max(it.startMins, w.s)),
            endTime:   formatTime12(Math.min(it.endMins, w.e)),
            severity:  Math.min(10, Math.round(sev)),
          });
        }
      }
    }
  }
}

// ── 5. School collisions ─────────────────────────────────────────────────
function detectSchoolCollisions(
  routines: ChildRoutineInput[],
  weights: ActivityPriorityWeights,
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  const schoolKids = routines.filter(
    (r) => r.child.hasSchoolToday && r.child.schoolStartTime,
  );
  if (schoolKids.length < 2) return;

  // Two kids whose school-start times are within 15 min of each other but
  // their schools could be different → caregiver drop-off conflict.
  for (let i = 0; i < schoolKids.length; i++) {
    for (let j = i + 1; j < schoolKids.length; j++) {
      const a = parseTime(schoolKids[i].child.schoolStartTime);
      const b = parseTime(schoolKids[j].child.schoolStartTime);
      if (a < 0 || b < 0) continue;
      const diff = Math.abs(a - b);
      if (diff <= 15) {
        const ids = [schoolKids[i].child.id, schoolKids[j].child.id];
        push({
          id: mkId("school_collision", ids, Math.min(a, b)),
          kind: "school_collision",
          explanation:
            diff === 0
              ? `Both children must reach school at the same time (${formatTime12(a)}). Plan separate drop-offs or carpool.`
              : `School drop-offs are only ${diff} min apart — caregiver may not make both on time.`,
          childIds: ids,
          startTime: formatTime12(Math.min(a, b) - 30),
          endTime:   formatTime12(Math.max(a, b) + 15),
          severity:  Math.min(10, Math.round(weights.school / 12)),
        });
      }
    }
  }
}

// ── 6. Shared activity opportunity ───────────────────────────────────────
function detectSharedActivityOpportunities(
  items: IndexedItem[],
  push: (c: ConflictItem) => void,
  mkId: typeof makeConflictId,
): void {
  const candidates = items.filter((it) =>
    ["play", "outdoor", "creative", "family", "rest"].includes(it.item.category),
  );
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i], b = candidates[j];
      if (a.childId === b.childId) continue;
      if (a.item.category !== b.item.category) continue;
      const ovl = overlapMinutes(a.startMins, a.endMins, b.startMins, b.endMins);
      if (ovl >= 10) {
        const ids = [a.childId, b.childId];
        push({
          id: mkId("shared_activity_opportunity", ids, Math.min(a.startMins, b.startMins), a.item.category),
          kind: "shared_activity_opportunity",
          explanation: `${a.childName} and ${b.childName} both have "${a.item.category}" overlapping by ${ovl} min — merge into one shared session.`,
          childIds: ids,
          startTime: formatTime12(Math.min(a.startMins, b.startMins)),
          endTime:   formatTime12(Math.max(a.endMins, b.endMins)),
          severity:  2, // positive hint, low severity
        });
      }
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────
function avgPriority(
  items: Array<IndexedItem>,
  weights: ActivityPriorityWeights,
): number {
  if (items.length === 0) return 0;
  const total = items.reduce(
    (s, it) => s + effectivePriority(it.item.category, it.child, weights),
    0,
  );
  return total / items.length;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
