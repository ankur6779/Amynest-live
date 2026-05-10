// ─────────────────────────────────────────────────────────────────────────
// @workspace/conflict-resolution — Type definitions
//
// Multi-Child Dynamic Conflict Resolution Engine.
// Pure-TS data structures for the household orchestration layer.
//
// Patent-positioning vocabulary (kept internal): "household orchestration",
// "concurrent-safe coordination", "constraint-solving layer", "weighted
// arbitration", "deterministic validation", "schedule dependency graph".
// ─────────────────────────────────────────────────────────────────────────

import type { HandlerKey } from "@workspace/family-routine";

/** Single routine item — mirrors FRItem but kept local so this lib has zero
 *  upstream dependency on the routine-shape (forward compatible). */
export interface RoutineItem {
  time: string;            // "H:MM AM/PM" display format
  activity: string;
  duration: number;        // minutes
  category: string;        // meal | sleep | school | study | play | outdoor | …
  notes?: string;
  status?: string;         // pending | completed | skipped | shifted
  rewardPoints?: number;
  /** Set by the orchestrator when this item was moved to resolve a conflict. */
  shiftedFromTime?: string;
  /** Caregiver attached to this item (filled by orchestrator if not present). */
  caregiver?: HandlerKey;
  /** True when this is one of the immutable sleep / school anchors. */
  isAnchor?: boolean;
}

/** Per-child profile passed to the engine. */
export interface ChildProfile {
  id: number;
  name: string;
  age: number;             // years
  ageMonths?: number;
  wakeUpTime?: string;     // "HH:MM" (24h)
  sleepTime?: string;      // "HH:MM" (24h)
  schoolStartTime?: string;// "HH:MM"
  schoolEndTime?: string;  // "HH:MM"
  hasSchoolToday?: boolean;
  /** Default caregiver if none specified per-item. */
  defaultCaregiver?: HandlerKey;
  /** Special-needs / illness flags that influence priority weights. */
  isSick?: boolean;
  isInfant?: boolean;      // age < 1 → sleep windows take absolute priority
}

/** A child's draft routine before household arbitration. */
export interface ChildRoutineInput {
  child: ChildProfile;
  items: RoutineItem[];
}

/** Caregiver availability window for the household-day. */
export interface CaregiverAvailability {
  caregiver: HandlerKey;
  /** Multiple availability windows, e.g. [[6:00, 9:00], [17:00, 22:00]]. */
  windows: Array<{ start: string; end: string }>; // "HH:MM" 24h
  /** How many children this caregiver can simultaneously supervise. */
  capacity: number;
  /** Optional skill tags — engine prefers caregivers whose skills match the
   *  activity category (e.g. "study" → "homework_help"). */
  skills?: string[];
}

/** Household-level shared resources that can become a contention point. */
export type HouseholdResource =
  | "bathroom"
  | "kitchen"
  | "study_area"
  | "play_area"
  | "tv";

export interface SharedHouseholdResources {
  /** How many parallel users each resource supports. Defaults: bathroom=1,
   *  kitchen=2, study_area=2, play_area=4, tv=4. */
  capacities: Partial<Record<HouseholdResource, number>>;
  /** Map activity-category → primary resource. Engine derives from this map
   *  unless an item explicitly sets `resource`. */
  resourceByCategory: Partial<Record<string, HouseholdResource>>;
}

/** Configurable weights for the constraint solver. Higher = more
 *  important = wins in arbitration ties. All weights ≥ 0. */
export interface ActivityPriorityWeights {
  sleep: number;
  school: number;
  meal: number;
  hygiene: number;
  study: number;
  play: number;
  outdoor: number;
  creative: number;
  family: number;
  rest: number;
  /** Multiplier applied per child age-band — younger children get a bump
   *  on sleep/meal categories. Maps ageMin (inclusive) → multiplier. */
  ageBandMultiplier?: Array<{ ageMax: number; multiplier: number }>;
  /** Bonus weight if the child is sick — applied to sleep + rest. */
  sickBonus?: number;
}

/** Distinct conflict kinds detected by the engine. */
export type ConflictKind =
  | "caregiver_overlap"
  | "resource_contention"
  | "meal_misalignment"
  | "sleep_window_violation"
  | "school_collision"
  | "shared_activity_opportunity"  // not a conflict but an arbitration hint
  | "caregiver_overload";          // caregiver-capacity exceeded

export interface ConflictItem {
  id: string;                      // stable hash (kind + sortedChildIds + time)
  kind: ConflictKind;
  /** Human-readable explanation in plain English. */
  explanation: string;
  /** Children involved (≥1; unary for sleep-window violations). */
  childIds: number[];
  /** Caregiver involved if applicable. */
  caregiver?: HandlerKey;
  /** Resource involved if applicable. */
  resource?: HouseholdResource;
  /** Time window of the conflict in display format. */
  startTime: string;
  endTime: string;
  /** Severity score 1–10 (computed from weights + child age + duration). */
  severity: number;
}

export type ResolutionStrategy =
  | "shift_later"
  | "shift_earlier"
  | "synchronize_meals"
  | "merge_into_shared_activity"
  | "swap_caregiver"
  | "split_resource_window"
  | "drop_optional"          // last resort — only for non-essential, low-prio items
  | "no_action";

export interface Resolution {
  /** References the conflict that prompted this resolution. */
  conflictId: string;
  strategy: ResolutionStrategy;
  /** Items that will be modified. Maps childId → list of item changes. */
  changes: Array<{
    childId: number;
    fromTime: string;
    toTime: string;
    activity: string;
    /** "shift" | "drop" | "merge" | "reassign". */
    action: "shift" | "drop" | "merge" | "reassign";
    newCaregiver?: HandlerKey;
  }>;
  /** Plain-English rationale shown in the UI. */
  rationale: string;
  /** Estimated severity reduction after applying. */
  severityReduction: number;
}

/** A concurrent slot in the household timeline — one row per overlapping
 *  set of activities across all children at a given minute. */
export interface HouseholdTimelineSlot {
  startTime: string;
  endTime: string;
  entries: Array<{
    childId: number;
    childName: string;
    item: RoutineItem;
  }>;
  /** Caregivers that are simultaneously needed during this slot. */
  caregivers: HandlerKey[];
  /** Resources that are simultaneously contested during this slot. */
  resources: HouseholdResource[];
  /** True when the engine flagged at least one conflict overlapping this
   *  slot — used by the UI to highlight rows. */
  hasConflict: boolean;
}

/** ConflictMatrix = pairwise scores per child × child × time-bucket.
 *  Index: matrix[bucketIdx][childId] = severity contribution. */
export interface ConflictMatrix {
  /** Bucket size in minutes (default 15). */
  bucketMinutes: number;
  /** Total buckets covering the orchestrated day window. */
  buckets: number;
  /** matrix[bucketIdx] = Map<childId, severity>. */
  data: Array<Map<number, number>>;
}

/** Final orchestration result — the API response shape. */
export interface HouseholdRoutineState {
  /** Date the orchestration was computed for ("YYYY-MM-DD"). */
  date: string;
  /** Original draft routines as supplied by the caller. */
  originalRoutines: ChildRoutineInput[];
  /** Routines after applying every accepted resolution. */
  finalRoutines: ChildRoutineInput[];
  /** All detected conflicts on the original (pre-resolution) routines. */
  conflicts: ConflictItem[];
  /** Conflicts that remain after applying resolutions (empty in dryRun if all resolvable). */
  postResolutionConflicts: ConflictItem[];
  /** Suggested or applied resolutions, one per conflict (may be no_action). */
  resolutions: Resolution[];
  /** Concurrent timeline view (15-min buckets by default). */
  timeline: HouseholdTimelineSlot[];
  /** Aggregate summary card data for the dashboard. */
  summary: {
    totalConflicts: number;
    resolvedConflicts: number;
    sharedActivityWindows: number;
    caregiverPeakLoad: number;       // max simultaneous children per caregiver
    sleepIntegrityScore: number;     // 0–100
    overallScore: number;            // 0–100
  };
  /** Per-step trace for the explainability layer (Module 3 hook). */
  reasoningTrace: Array<{
    step: string;
    detail: string;
    inputCount?: number;
    outputCount?: number;
  }>;
}

/** Top-level options accepted by `orchestrateHousehold`. */
export interface OrchestrateOptions {
  date: string; // YYYY-MM-DD
  routines: ChildRoutineInput[];
  caregivers: CaregiverAvailability[];
  resources?: SharedHouseholdResources;
  weights?: Partial<ActivityPriorityWeights>;
  /** Tolerance window (minutes) within which two children's meals are
   *  considered "synchronizable". Default 30. */
  mealSyncWindowMinutes?: number;
  /** Bucket size for the conflict matrix (default 15). */
  bucketMinutes?: number;
  /** When true, the engine returns proposed resolutions but does NOT apply
   *  them to `finalRoutines`. Useful for "preview" UX. Default false. */
  dryRun?: boolean;
}
