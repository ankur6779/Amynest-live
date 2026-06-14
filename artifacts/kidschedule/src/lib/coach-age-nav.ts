/** Coach entry flow: age band → grouped categories → goal → questions */

import { getTotalMonths } from "@/lib/age-groups";

/** Matches backend infant coach preview guard (`isInfantAgeMonths`). */
export const COACH_MIN_AGE_MONTHS = 24;

export type CoachAgeBand = "0-2" | "2-4" | "5-7" | "8-10" | "10+";

export interface CoachAgeBandOption {
  id: CoachAgeBand;
  emoji: string;
  label: string;
  description: string;
  /** Matches AGE_QUESTION option text in ai-coach.tsx */
  ageAnswer: string;
}

export const COACH_AGE_BAND_OPTIONS: CoachAgeBandOption[] = [
  {
    id: "0-2",
    emoji: "👶",
    label: "0–2 years",
    description: "Newborn & infant care",
    ageAnswer: "0–2 years",
  },
  {
    id: "2-4",
    emoji: "🧒",
    label: "2–4 years",
    description: "Toddler & preschool",
    ageAnswer: "2–4 years",
  },
  {
    id: "5-7",
    emoji: "🎒",
    label: "5–7 years",
    description: "Early school age",
    ageAnswer: "5–7 years",
  },
  {
    id: "8-10",
    emoji: "📚",
    label: "8–10 years",
    description: "School & tweens",
    ageAnswer: "8–10 years",
  },
  {
    id: "10+",
    emoji: "🎯",
    label: "10+ years",
    description: "Tween & teen",
    ageAnswer: "10+ years (tween/teen)",
  },
];

/** Parent self-care — separate entry, not mixed with child topic groups. */
export const COACH_FOR_YOU_CATEGORY_ID = "for-you";

export interface CoachCategoryGroup {
  id: string;
  label: string;
  categoryIds: string[];
}

export const COACH_CATEGORY_GROUPS: CoachCategoryGroup[] = [
  {
    id: "baby",
    label: "Baby (0–2)",
    categoryIds: ["infant-problems"],
  },
  {
    id: "daily",
    label: "Daily Life",
    categoryIds: ["eating", "sleep", "screen-focus", "daily-skills"],
  },
  {
    id: "behavior",
    label: "Behavior",
    categoryIds: ["behavior", "toddler-behavior"],
  },
  {
    id: "growth",
    label: "Learning & Health",
    categoryIds: ["learning", "kids-health-concern", "special-situations"],
  },
  {
    id: "family",
    label: "Family",
    categoryIds: ["family-dynamics", "parenting-challenges"],
  },
];

/** All child-topic categories in browse order (excludes for-you). */
export const ALL_CHILD_COACH_CATEGORY_IDS = [
  "infant-problems",
  "toddler-behavior",
  "daily-skills",
  "behavior",
  "eating",
  "sleep",
  "screen-focus",
  "learning",
  "family-dynamics",
  "parenting-challenges",
  "special-situations",
  "kids-health-concern",
] as const;

/** Child-topic category ids per age band (excludes for-you). */
const CATEGORIES_BY_AGE_BAND: Record<CoachAgeBand, readonly string[]> = {
  /** Infant parents browse the full catalog — baby care plus every 2+ topic. */
  "0-2": ALL_CHILD_COACH_CATEGORY_IDS,
  "2-4": [
    "toddler-behavior",
    "daily-skills",
    "behavior",
    "eating",
    "sleep",
    "screen-focus",
    "family-dynamics",
  ],
  "5-7": [
    "behavior",
    "screen-focus",
    "eating",
    "sleep",
    "learning",
    "family-dynamics",
    "parenting-challenges",
    "daily-skills",
    "special-situations",
    "kids-health-concern",
  ],
  "8-10": [
    "behavior",
    "screen-focus",
    "eating",
    "sleep",
    "learning",
    "family-dynamics",
    "parenting-challenges",
    "special-situations",
    "kids-health-concern",
  ],
  "10+": [
    "behavior",
    "screen-focus",
    "eating",
    "sleep",
    "learning",
    "family-dynamics",
    "parenting-challenges",
    "special-situations",
    "kids-health-concern",
  ],
};

const COACH_BAND_TO_AGE_ANSWER: Record<CoachAgeBand, string> = Object.fromEntries(
  COACH_AGE_BAND_OPTIONS.map((o) => [o.id, o.ageAnswer]),
) as Record<CoachAgeBand, string>;

export function coachBandToAgeAnswer(band: CoachAgeBand): string {
  return COACH_BAND_TO_AGE_ANSWER[band];
}

export function coachAgeAnswerToApi(ageAnswer: string): string {
  const map: Record<string, string> = {
    "0–2 years": "0-2",
    "2–4 years": "2-4",
    "5–7 years": "5-7",
    "8–10 years": "8-10",
    "10+ years (tween/teen)": "10+",
  };
  return map[ageAnswer] ?? ageAnswer;
}

export function childToCoachAgeBand(years: number, ageMonths = 0): CoachAgeBand {
  const totalMonths = years * 12 + ageMonths;
  if (totalMonths < 24) return "0-2";
  if (totalMonths < 60) return "2-4";
  if (totalMonths < 96) return "5-7";
  if (totalMonths < 132) return "8-10";
  return "10+";
}

export function isCategoryVisibleForBand(categoryId: string, band: CoachAgeBand): boolean {
  return CATEGORIES_BY_AGE_BAND[band].includes(categoryId);
}

export interface GroupedCoachCategories<T extends { id: string }> {
  group: CoachCategoryGroup;
  categories: T[];
}

export function groupCategoriesForBand<T extends { id: string }>(
  categories: T[],
  band: CoachAgeBand,
): GroupedCoachCategories<T>[] {
  const visibleIds = new Set(CATEGORIES_BY_AGE_BAND[band]);
  const visible = categories.filter((c) => visibleIds.has(c.id));
  const out: GroupedCoachCategories<T>[] = [];

  for (const group of COACH_CATEGORY_GROUPS) {
    const inGroup = visible.filter((c) => group.categoryIds.includes(c.id));
    if (inGroup.length > 0) {
      out.push({ group, categories: inGroup });
    }
  }

  const groupedIds = new Set(out.flatMap((g) => g.categories.map((c) => c.id)));
  const ungrouped = visible.filter((c) => !groupedIds.has(c.id));
  if (ungrouped.length > 0) {
    out.push({
      group: { id: "more", label: "More", categoryIds: ungrouped.map((c) => c.id) },
      categories: ungrouped,
    });
  }

  return out;
}

export interface CoachCategoryHint {
  targetCategoryId: string;
  message: string;
}

export function getCategoryHint(
  categoryId: string,
  band: CoachAgeBand,
): CoachCategoryHint | null {
  if (categoryId === "behavior" && band === "2-4") {
    return {
      targetCategoryId: "toddler-behavior",
      message: "Age 2–4? Toddler Behavior has age-specific goals.",
    };
  }
  if (categoryId === "sleep" && band === "0-2") {
    return {
      targetCategoryId: "infant-problems",
      message: "For babies 0–2, Baby Care has dedicated sleep guides.",
    };
  }
  if (categoryId === "behavior" && band === "0-2") {
    return {
      targetCategoryId: "infant-problems",
      message: "For babies under 2, Baby Care has age-specific guides.",
    };
  }
  if (categoryId === "behavior" && (band === "5-7" || band === "8-10" || band === "10+")) {
    return {
      targetCategoryId: "learning",
      message: "Focus or homework issues? Learning may fit better.",
    };
  }
  return null;
}

export const ACTIVE_CHILD_STORAGE_KEY = "amynest:hub:activeChildId";
export const ACTIVE_CHILD_CHANGE_EVENT = "amynest:active-child-changed";

/** Hub active child from localStorage (`amynest:hub:activeChildId`). */
export function readStoredActiveChildId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CHILD_STORAGE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** Attach active childId for infant-preview server guards when available. */
export function withActiveChildId<T extends Record<string, unknown>>(
  body: T,
  childId?: number | null,
): T & { childId?: number } {
  const id = childId ?? readStoredActiveChildId();
  if (id == null) return body;
  return { ...body, childId: id };
}

export interface ChildAgeLike {
  id: number;
  age: number;
  ageMonths?: number | null;
  name?: string | null;
}

export function resolveActiveChild(children: ChildAgeLike[] | undefined | null): ChildAgeLike | null {
  if (!children?.length) return null;
  const storedId = readStoredActiveChildId();
  if (storedId != null) {
    const match = children.find((c) => c.id === storedId);
    if (match) return match;
  }
  return children[0] ?? null;
}

export function childTotalAgeMonths(child: Pick<ChildAgeLike, "age" | "ageMonths">): number {
  return getTotalMonths(child.age, child.ageMonths ?? 0);
}

/** Plan generation and progress unlock at 24+ months (backend: infant_coach_preview_only). */
export function isCoachEligible(
  child: Pick<ChildAgeLike, "age" | "ageMonths"> | null | undefined,
): boolean {
  if (!child) return true;
  return childTotalAgeMonths(child) >= COACH_MIN_AGE_MONTHS;
}
