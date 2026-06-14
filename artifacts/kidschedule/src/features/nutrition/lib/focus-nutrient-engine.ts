import type { AgeGroupId } from "@/lib/nutrition-data";
import type { WeeklyTrendDay } from "@/features/nutrition/lib/nutrition-streak";
import { getEvidenceForNutrient } from "@/features/nutrition/lib/nutrition-evidence";

/** Age-priority nutrients — first = highest relevance for the band. */
const AGE_PRIORITY: Partial<Record<AgeGroupId, string[]>> = {
  infant_0_6: ["protein"],
  infant_6_12: ["iron", "protein", "zinc"],
  toddler_1_3: ["iron", "calcium", "protein", "vitamin_a"],
  preschool_3_6: ["iron", "protein", "calcium", "vitamin_a"],
  school_6_10: ["protein", "iron", "calcium", "vitamin_c"],
  preteen_10_15: ["protein", "iron", "calcium", "vitamin_d"],
  adult: ["protein", "calcium", "iron"],
  pregnancy: ["iron", "protein", "calcium", "folate"],
  postpartum: ["iron", "protein", "calcium"],
};

/** Checklist item → nutrient gap signals for historical analysis. */
const CHECKLIST_NUTRIENT_MAP: Record<string, string[]> = {
  protein: ["protein"],
  dairy: ["calcium", "protein"],
  greens: ["iron", "vitamin_a"],
  fruit: ["vitamin_c"],
  wholegrains: ["iron", "vitamin_b"],
  breakfast: ["variety"],
  water: [],
  noJunk: ["variety"],
};

export interface FocusNutrientInput {
  ageGroupId: AgeGroupId;
  weeklyTrend: WeeklyTrendDay[];
  /** Checklist flags checked per day count over the week (aggregated). */
  checklistHits: Record<string, number>;
  daysLogged: number;
}

export interface FocusNutrientResult {
  nutrientId: string;
  nutrientName: string;
  rationale: string;
}

const NUTRIENT_LABELS: Record<string, string> = {
  protein: "Protein",
  iron: "Iron",
  calcium: "Calcium",
  vitamin_a: "Vitamin A",
  vitamin_c: "Vitamin C",
  vitamin_d: "Vitamin D",
  vitamin_b: "B Vitamins",
  zinc: "Zinc",
  folate: "Folate",
  variety: "Variety",
};

export function nutrientDisplayName(id: string): string {
  return NUTRIENT_LABELS[id] ?? id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreNutrientGaps(
  checklistHits: Record<string, number>,
  daysLogged: number,
): Map<string, number> {
  const gaps = new Map<string, number>();
  if (daysLogged <= 0) return gaps;

  for (const [checkId, nutrients] of Object.entries(CHECKLIST_NUTRIENT_MAP)) {
    const hitRate = (checklistHits[checkId] ?? 0) / daysLogged;
    for (const n of nutrients) {
      gaps.set(n, (gaps.get(n) ?? 0) + (1 - hitRate));
    }
  }
  return gaps;
}

function averageScore(days: WeeklyTrendDay[]): number {
  const active = days.filter((d) => d.checked > 0);
  if (active.length === 0) return 0;
  return Math.round(active.reduce((s, d) => s + d.score, 0) / active.length);
}

export function selectFocusNutrient(input: FocusNutrientInput): FocusNutrientResult {
  const { ageGroupId, weeklyTrend, checklistHits, daysLogged } = input;
  const priorities = AGE_PRIORITY[ageGroupId] ?? ["protein", "iron", "calcium", "vitamin_a"];
  const gaps = scoreNutrientGaps(checklistHits, daysLogged);

  let chosen = priorities[0] ?? "variety";
  let bestGap = -1;

  for (const nutrientId of priorities) {
    const gap = gaps.get(nutrientId) ?? 0.5;
    if (gap > bestGap) {
      bestGap = gap;
      chosen = nutrientId;
    }
  }

  if (daysLogged === 0) {
    chosen = priorities[0] ?? "variety";
  }

  const evidence = getEvidenceForNutrient(chosen, ageGroupId);
  const avg = averageScore(weeklyTrend);

  let rationale = evidence.detail;
  if (daysLogged >= 3 && bestGap >= 0.5) {
    rationale = `Based on this week's check-ins, ${nutrientDisplayName(chosen).toLowerCase()} is a helpful focus. ${evidence.detail}`;
  } else if (avg >= 70) {
    rationale = `Strong week so far — keep ${nutrientDisplayName(chosen).toLowerCase()}-rich options in rotation.`;
  }

  return {
    nutrientId: chosen,
    nutrientName: nutrientDisplayName(chosen),
    rationale,
  };
}

export function aggregateChecklistHits(
  weeklyTrend: WeeklyTrendDay[],
  todayChecklist: Record<string, boolean>,
  todayKey: string,
  dayChecklists?: Record<string, Record<string, boolean>>,
): { checklistHits: Record<string, number>; daysLogged: number } {
  const checklistHits: Record<string, number> = {};
  let daysLogged = 0;

  function addDayHits(hits: Record<string, boolean | number>) {
    daysLogged++;
    for (const [id, val] of Object.entries(hits)) {
      if (val) checklistHits[id] = (checklistHits[id] ?? 0) + 1;
    }
  }

  for (const day of weeklyTrend) {
    if (day.dateKey === todayKey) {
      const checked = Object.values(todayChecklist).filter(Boolean).length;
      if (checked > 0) addDayHits(todayChecklist);
      continue;
    }
    if (day.checked <= 0) continue;
    const canonical = dayChecklists?.[day.dateKey];
    if (!canonical || Object.keys(canonical).length === 0) continue;
    addDayHits(canonical);
  }

  return { checklistHits, daysLogged };
}

/** Deterministic inference when only checked-count is known (historical days). */
export function inferChecklistHitsFromCount(checked: number): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (checked <= 0) return out;
  out.breakfast = true;
  if (checked >= 2) out.fruit = true;
  if (checked >= 3) out.water = true;
  if (checked >= 4) {
    out.protein = true;
    out.dairy = true;
  }
  if (checked >= 5) out.greens = true;
  if (checked >= 6) out.wholegrains = true;
  if (checked >= 7) out.noJunk = true;
  return out;
}
