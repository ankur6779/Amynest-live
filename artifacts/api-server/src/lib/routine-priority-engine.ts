/**
 * Priority-driven cultural slot allocation — replaces unbounded injection.
 */
import type { LaunchCountry } from "./routine-country-profile.js";
import { normalizeCountryCode } from "./routine-country-profile.js";
import { pickNzNatureActivity } from "./routine-activity-labels.js";
import { lightOutdoorWalkLabel } from "./routine-aqi.js";
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import {
  classifyStructureBlock,
  indiaTuitionDuration,
  type StructureBlockKind,
} from "./routine-country-structure.js";
import {
  UAE_EVENING_OUTDOOR_WINDOW,
  clampOutdoorToEveningWindow,
  isOutdoorBlockedByHeat,
} from "./routine-country-structure.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { minsToTime24, parseTimeToMins } from "./routine-scheduler.js";

export type DecisionTraceEntry = {
  kind: "weather" | "cultural" | "meal" | "priority" | "validation" | "structural";
  message: string;
  detail?: Record<string, unknown>;
};

export type ScheduleDecisionMeta = {
  reason: string;
  source: "safety" | "health" | "development" | "preference" | "structure";
  originalActivity?: string;
};

export type RoutineScheduleItemWithDecision = RoutineScheduleItem & {
  scheduleDecision?: ScheduleDecisionMeta;
  culturalTag?: string;
  structureKind?: StructureBlockKind;
  decisionTrace?: DecisionTraceEntry[];
};

/** Max injected cultural blocks per launch market (drop lowest priority when exceeded). */
export const MAX_CULTURAL_BLOCKS: Partial<Record<LaunchCountry, number>> = {
  IN: 3,
  AE: 2,
  US: 2,
  UK: 3,
};

const DEFAULT_MAX_CULTURAL_BLOCKS = 3;

export type PrioritySlot = "post_school" | "pre_dinner" | "evening" | "morning" | "any";

export type CulturalBlockCandidate = {
  id: string;
  priority: number;
  slot: PrioritySlot;
  item: RoutineScheduleItem;
  reason: string;
  source: ScheduleDecisionMeta["source"];
  tag: string;
  kind: StructureBlockKind;
  /** Skip if this pattern already exists in base items. */
  exists?: (items: RoutineScheduleItem[]) => boolean;
};

const EXTRACURRICULAR_RE =
  /\b(soccer|football|sports practice|sports club|music|club|tuition|hobby|extracurricular)\b/i;
const INDEPENDENCE_RE =
  /\b(get ready|self study|pack backpack|independently|selbstständig|on your own)\b/i;
const SNACK_RE = /\b(snack|tiffin|drunch|after-school snack)\b/i;
const OUTDOOR_RE =
  /\b(outdoor|park|playground|backyard|beach|cricket|walk|nature|garden)\b/i;

function windowMidpoint(win: readonly [number, number]): number {
  return Math.round((win[0] + win[1]) / 2);
}

function hasMatching(items: RoutineScheduleItem[], re: RegExp): boolean {
  return items.some((i) => re.test(i.activity));
}

function withDecision(
  item: RoutineScheduleItem,
  reason: string,
  source: ScheduleDecisionMeta["source"],
  tag: string,
  kind: StructureBlockKind,
  originalActivity?: string,
): RoutineScheduleItemWithDecision {
  return {
    ...item,
    scheduleDecision: { reason, source, originalActivity },
    culturalTag: tag,
    structureKind: kind,
  };
}

function maxBlocksFor(country: LaunchCountry): number {
  return MAX_CULTURAL_BLOCKS[country] ?? DEFAULT_MAX_CULTURAL_BLOCKS;
}

function buildCandidates(
  state: InterpretedBehavioralState,
  schoolEndMid: number,
): CulturalBlockCandidate[] {
  const c = state.country;
  const L = state.labels;
  const candidates: CulturalBlockCandidate[] = [];

  const add = (cand: CulturalBlockCandidate) => {
    if (cand.exists && cand.exists([])) return;
    candidates.push(cand);
  };

  if (state.requireIndependenceTasks) {
    add({
      id: "independence_morning",
      priority: 40,
      slot: "morning",
      item: {
        time: "07:30",
        activity: L.independenceMorning,
        duration: 20,
        category: "self_care",
        notes: "Age-appropriate independence — builds daily autonomy.",
        status: "pending",
      },
      reason: `${c} independence culture`,
      source: "development",
      tag: `independence_${c.toLowerCase()}`,
      kind: "independence",
      exists: (items) => hasMatching(items, INDEPENDENCE_RE),
    });
  }

  switch (c) {
    case "US": {
      add({
        id: "snack_us",
        priority: 55,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 15),
          activity: "After-school snack",
          duration: 20,
          category: "meal",
          notes: "Light snack before sports or clubs.",
          status: "pending",
        },
        reason: "US after-school snack before sports",
        source: "structure",
        tag: "snack_us",
        kind: "snack",
        exists: (items) => items.some((i) => SNACK_RE.test(i.activity)),
      });
      if (state.requireExtracurricularBlock) {
        add({
          id: "extracurricular_us",
          priority: 90,
          slot: "pre_dinner",
          item: {
            time: minsToTime24(schoolEndMid + 45),
            activity: L.extracurricular,
            duration: 45,
            category: "exercise",
            notes: "Activity-first afternoon — sports before dinner.",
            status: "pending",
          },
          reason: "US extracurricular before dinner (pre-dinner slot)",
          source: "development",
          tag: "extracurricular_us",
          kind: "extracurricular",
          exists: (items) => hasMatching(items, EXTRACURRICULAR_RE),
        });
      }
      break;
    }
    case "UK": {
      add({
        id: "snack_uk",
        priority: 55,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 15),
          activity: "After-school snack",
          duration: 20,
          category: "meal",
          notes: "Light teatime snack before homework.",
          status: "pending",
        },
        reason: "UK after-school snack",
        source: "structure",
        tag: "snack_uk",
        kind: "snack",
        exists: (items) => items.some((i) => SNACK_RE.test(i.activity)),
      });
      add({
        id: "homework_uk",
        priority: 85,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 40),
          activity: "Homework & reading",
          duration: 40,
          category: "study",
          notes: "Family-first — homework before clubs.",
          status: "pending",
        },
        reason: "UK homework in post-school slot",
        source: "development",
        tag: "academic_uk",
        kind: "study",
        exists: (items) =>
          items.some(
            (i) =>
              /\b(homework|study|hausaufgaben)\b/i.test(i.activity) &&
              classifyStructureBlock(i) === "study",
          ),
      });
      if (state.requireExtracurricularBlock) {
        add({
          id: "extracurricular_uk",
          priority: 80,
          slot: "pre_dinner",
          item: {
            time: minsToTime24(schoolEndMid + 90),
            activity: L.extracurricular,
            duration: 45,
            category: "exercise",
            notes: "Football club after homework — pre-dinner slot.",
            status: "pending",
          },
          reason: "UK football club in pre-dinner slot",
          source: "development",
          tag: "extracurricular_uk",
          kind: "extracurricular",
          exists: (items) => hasMatching(items, EXTRACURRICULAR_RE),
        });
      }
      add({
        id: "family_uk",
        priority: 50,
        slot: "pre_dinner",
        item: {
          time: minsToTime24(schoolEndMid + 140),
          activity: L.familyTime,
          duration: 25,
          category: "family",
          notes: "Family check-in before teatime dinner.",
          status: "pending",
        },
        reason: "UK family time before dinner",
        source: "preference",
        tag: "family_uk",
        kind: "family",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "family"),
      });
      break;
    }
    case "AU": {
      if (state.requireExtracurricularBlock) {
        add({
          id: "sports_au",
          priority: 88,
          slot: "pre_dinner",
          item: {
            time: minsToTime24(schoolEndMid + 95),
            activity: "Sports practice",
            duration: 45,
            category: "exercise",
            notes: "Structured sports before dinner — AU club culture.",
            status: "pending",
          },
          reason: "AU structured sports in pre-dinner slot",
          source: "development",
          tag: "extracurricular_au",
          kind: "extracurricular",
          exists: (items) => hasMatching(items, EXTRACURRICULAR_RE),
        });
      }
      add({
        id: "snack_au",
        priority: 45,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 70),
          activity: "Afternoon snack",
          duration: 20,
          category: "meal",
          status: "pending",
        },
        reason: "AU snack between outdoor and sports",
        source: "structure",
        tag: "snack_au",
        kind: "snack",
        exists: (items) => items.some((i) => SNACK_RE.test(i.activity)),
      });
      break;
    }
    case "NZ": {
      if (state.requireOutdoorBlock) {
        add({
          id: "outdoor_nz",
          priority: 92,
          slot: "post_school",
          item: {
            time: minsToTime24(schoolEndMid + 20),
            activity: pickNzNatureActivity(schoolEndMid + 20),
            duration: 55,
            category: "outdoor",
            notes: "NZ nature-focused outdoor — bush, beach, or backyard exploration.",
            status: "pending",
          },
          reason: "NZ free outdoor play in post-school slot",
          source: "preference",
          tag: "outdoor_nz",
          kind: "outdoor",
          exists: (items) => items.some((i) => OUTDOOR_RE.test(i.activity) || i.category === "outdoor"),
        });
      }
      add({
        id: "snack_nz",
        priority: 45,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 80),
          activity: "Afternoon snack",
          duration: 20,
          category: "meal",
          status: "pending",
        },
        reason: "NZ snack after outdoor play",
        source: "structure",
        tag: "snack_nz",
        kind: "snack",
        exists: (items) => items.some((i) => SNACK_RE.test(i.activity)),
      });
      break;
    }
    case "IN": {
      const tuitionDur = indiaTuitionDuration(schoolEndMid);
      const aqiAdvisoryOutdoor =
        state.aqiExposureMode === "controlled" ||
        state.aqiExposureMode === "limited" ||
        state.aqiExposureMode === "reduced";
      if (
        state.allowOutdoor &&
        state.dayPlanningMode === "evening_only" &&
        aqiAdvisoryOutdoor
      ) {
        const eveningDur = Math.min(state.maxOutdoorDurationFromAqi ?? 20, 20);
        add({
          id: "evening_outdoor_in",
          priority: 96,
          slot: "evening",
          item: {
            time: minsToTime24(19 * 60),
            activity: "Evening outdoor play (limited)",
            duration: eveningDur,
            category: "outdoor",
            notes:
              "Evening only — heat-safe window; mask and hydration advised.",
            status: "pending",
          },
          reason: "India heat + AQI — evening outdoor (limited)",
          source: "safety",
          tag: "evening_outdoor_in",
          kind: "outdoor_evening",
          exists: (items) =>
            items.some(
              (i) =>
                OUTDOOR_RE.test(i.activity) ||
                /\blight outdoor walk\b/i.test(i.activity),
            ),
        });
      } else if (
        state.allowOutdoor &&
        (state.aqiExposureMode === "controlled" ||
          state.aqiExposureMode === "limited")
      ) {
        add({
          id: "outdoor_limited_in",
          priority: 98,
          slot: "post_school",
          item: {
            time: minsToTime24(schoolEndMid + 18),
            activity: lightOutdoorWalkLabel(),
            duration: state.maxOutdoorDurationFromAqi ?? 20,
            category: "outdoor",
            notes:
              "Brief outdoor after school — mask advised; avoid evening traffic peak.",
            status: "pending",
          },
          reason: "India metro AQI — limited outdoor with safety advisory",
          source: "safety",
          tag: "outdoor_limited_in",
          kind: "outdoor",
          exists: (items) =>
            items.some((i) => /\blight outdoor walk\b/i.test(i.activity)),
        });
      }
      add({
        id: "snack_in",
        priority: 48,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 95),
          activity: "Afternoon snack",
          duration: 20,
          category: "meal",
          status: "pending",
        },
        reason: "India afternoon snack before dinner",
        source: "structure",
        tag: "snack_in",
        kind: "snack",
        exists: (items) => items.some((i) => SNACK_RE.test(i.activity)),
      });
      add({
        id: "tuition_in",
        priority: 100,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 30),
          activity: L.studyBlock,
          duration: tuitionDur,
          category: "study",
          notes: "Parent-led tuition — post-school priority slot.",
          status: "pending",
        },
        reason: `India tuition ${tuitionDur}min (post-school slot)`,
        source: "development",
        tag: "academic_in",
        kind: "study",
        exists: (items) => /tuition|study time/i.test(items.map((i) => i.activity).join(" ")),
      });
      add({
        id: "play_in",
        priority: 70,
        slot: "pre_dinner",
        item: {
          time: minsToTime24(schoolEndMid + 30 + tuitionDur + 15),
          activity: "Evening play with parent",
          duration: 40,
          category: "play",
          notes: "Parent-guided play before dinner.",
          status: "pending",
        },
        reason: "India parent-led play before dinner",
        source: "preference",
        tag: "play_in",
        kind: "play",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "play"),
      });
      if (!state.reduceStudyBlocks) {
        add({
          id: "revision_in",
          priority: 25,
          slot: "evening",
          item: {
            time: "20:30",
            activity: "Optional revision with parent",
            duration: 35,
            category: "study",
            notes: "Light post-dinner revision when energy allows.",
            status: "pending",
          },
          reason: "India optional post-dinner revision (lowest priority)",
          source: "structure",
          tag: "study_optional_in",
          kind: "post_dinner_study",
          exists: (items) =>
            items.some((i) => (i as { structureKind?: string }).structureKind === "post_dinner_study"),
        });
      }
      break;
    }
    case "AE": {
      add({
        id: "indoor_rest_ae",
        priority: 85,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 30),
          activity: "Indoor rest & quiet time",
          duration: 40,
          category: "rest",
          notes: "Afternoon indoor rest — no outdoor before 18:30.",
          status: "pending",
        },
        reason: "UAE afternoon indoor rest",
        source: "safety",
        tag: "indoor_rest_ae",
        kind: "indoor_rest",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "indoor_rest"),
      });
      add({
        id: "indoor_creative_ae",
        priority: 75,
        slot: "post_school",
        item: {
          time: minsToTime24(16 * 60),
          activity: L.indoorCreative,
          duration: 45,
          category: "creative",
          notes: "Indoor creative during hot afternoon.",
          status: "pending",
        },
        reason: "UAE indoor creative afternoon",
        source: "structure",
        tag: "indoor_creative_ae",
        kind: "indoor_creative",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "indoor_creative"),
      });
      if (state.allowOutdoor) {
        add({
          id: "evening_outdoor_ae",
          priority: 95,
          slot: "evening",
          item: {
            time: minsToTime24(UAE_EVENING_OUTDOOR_WINDOW[0]),
            activity: L.outdoorPlay,
            duration: 45,
            category: "outdoor",
            notes: "Evening outdoor — not before 18:30 (heat-safe).",
            status: "pending",
          },
          reason: "UAE evening outdoor at 18:30+",
          source: "safety",
          tag: "evening_outdoor_ae",
          kind: "outdoor_evening",
          exists: (items) =>
            items.some((i) => classifyStructureBlock(i) === "outdoor_evening"),
        });
      }
      add({
        id: "family_ae",
        priority: 40,
        slot: "evening",
        item: {
          time: "20:45",
          activity: L.familyTime,
          duration: 35,
          category: "family",
          status: "pending",
        },
        reason: "UAE family time after dinner",
        source: "preference",
        tag: "family_ae",
        kind: "family",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "family"),
      });
      break;
    }
    case "AT": {
      add({
        id: "homework_at",
        priority: 90,
        slot: "post_school",
        item: {
          time: minsToTime24(schoolEndMid + 30),
          activity: L.studyBlock,
          duration: 50,
          category: "study",
          notes: "Fixed homework block.",
          status: "pending",
        },
        reason: "Austria fixed homework post-school",
        source: "development",
        tag: "academic_at",
        kind: "study",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "study"),
      });
      add({
        id: "outdoor_structured_at",
        priority: 75,
        slot: "pre_dinner",
        item: {
          time: minsToTime24(schoolEndMid + 95),
          activity: state.labels.outdoorPlay,
          duration: 45,
          category: "outdoor",
          notes: "Structured outdoor activity.",
          status: "pending",
        },
        reason: "Austria structured outdoor pre-dinner",
        source: "structure",
        tag: "outdoor_structured_at",
        kind: "outdoor_structured",
        exists: (items) => items.some((i) => classifyStructureBlock(i) === "outdoor_structured"),
      });
      break;
    }
    default:
      break;
  }

  return candidates.map((cand) => ({
    ...cand,
    exists: cand.exists
      ? (items: RoutineScheduleItem[]) => cand.exists!(items)
      : undefined,
  }));
}

/**
 * Allocate cultural blocks by priority + slot rules (sport → pre-dinner, tuition → post-school).
 */
export function allocatePrioritySlots(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItemWithDecision[] {
  const out = [...items];
  const c = normalizeCountryCode(state.country);
  const schoolEndMid = windowMidpoint(state.countryProfile.schoolEndTimeRange);

  const candidates = buildCandidates(state, schoolEndMid).filter(
    (cand) => !cand.exists?.(out),
  );

  const limit = maxBlocksFor(c);
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const kept = sorted.slice(0, limit);
  const dropped = sorted.slice(limit);

  for (const d of dropped) {
    trace.push({
      kind: "priority",
      message: `Dropped cultural block "${d.item.activity}" (priority ${d.priority} < top ${limit})`,
      detail: { country: c, id: d.id, slot: d.slot },
    });
  }

  for (const k of kept) {
    trace.push({
      kind: "cultural",
      message: `Allocated ${k.slot}: ${k.item.activity}`,
      detail: { country: c, id: k.id, priority: k.priority },
    });
    out.push(withDecision(k.item, k.reason, k.source, k.tag, k.kind));
  }

  return out;
}

/** @deprecated Use allocatePrioritySlots */
export function injectCulturalBlocks(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  return allocatePrioritySlots(items, state, []);
}

/** Meal slot priority — dinner gets best dishes first. */
export const MEAL_PRIORITY_ORDER = [
  "dinner",
  "lunch",
  "breakfast",
  "tiffin",
  "drunch",
  "snack",
] as const;

export type MealPrioritySlot = (typeof MEAL_PRIORITY_ORDER)[number];

export const MEAL_PRIORITY_RANK: Record<MealPrioritySlot, "highest" | "medium" | "low"> = {
  dinner: "highest",
  lunch: "medium",
  breakfast: "medium",
  tiffin: "low",
  drunch: "low",
  snack: "low",
};

export function mealSlotsByPriority(): readonly MealPrioritySlot[] {
  return MEAL_PRIORITY_ORDER;
}

/** Slots that may receive fridge-accent dishes (not dinner-first quality). */
export function prefersFridgeAccent(slot: MealPrioritySlot): boolean {
  return slot === "snack" || slot === "lunch" || slot === "tiffin" || slot === "drunch";
}

/** UAE: no outdoor activity may start before 18:30 — hard shift, no soft override. */
export function enforceUaeOutdoorHardConstraint(
  items: RoutineScheduleItem[],
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItem[] {
  const eveningStart = UAE_EVENING_OUTDOOR_WINDOW[0];
  return items.map((it) => {
    const cat = (it.category ?? "").toLowerCase();
    const isOutdoor =
      cat === "outdoor" ||
      OUTDOOR_RE.test(it.activity) ||
      classifyStructureBlock(it) === "outdoor_evening";
    if (normalizeCountryCode("AE") !== "AE") return it;
    if (!isOutdoor) return it;

    const start = parseTimeToMins(it.time);
    if (!isOutdoorBlockedByHeat(start, "AE")) return it;

    const fixed = clampOutdoorToEveningWindow(start, "AE");
    trace.push({
      kind: "structural",
      message: `UAE hard constraint: moved "${it.activity}" to ${minsToTime24(fixed)} (no outdoor before 18:30)`,
      detail: { from: it.time, to: minsToTime24(fixed) },
    });
    return {
      ...it,
      time: minsToTime24(fixed),
      structureKind: "outdoor_evening" as StructureBlockKind,
      notes: [it.notes, "Heat-safe evening window (starts 18:30)."].filter(Boolean).join(" "),
    };
  });
}

export type ValidationTier = "hard" | "structural" | "soft";

export type TieredValidationResult = {
  items: RoutineScheduleItem[];
  hardValid: boolean;
  structuralFixes: string[];
  softWarnings: string[];
  rejected: boolean;
  trace: DecisionTraceEntry[];
};
