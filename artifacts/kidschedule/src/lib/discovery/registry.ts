/**
 * Age-aware discovery registry — source of truth for Home / nav doors.
 *
 * Age rules are copied from existing Hub / route gates. If a module has no
 * coded age bound, it is AGE_UNFILTERED. Do not invent new restrictions here.
 *
 * Infant taxonomy (intentionally not unified in this change):
 * - Canonical `AgeGroup.infant` = 0–11 months (`lib/age-groups.ts`) for
 *   routines, stories, and coach content.
 * - Hub Infant Care tile = childAgeMonths < 24 (`lib/hub-visibility.ts`) so
 *   12–23 month toddlers keep sleep / feed / cry logging.
 * Discovery Care door follows the Hub <24m rule so Infant Care is not lost.
 */
import { getAgeGroup, getTotalMonths, type AgeGroup } from "@/lib/age-groups";
import {
  GAMING_HUB_MIN_AGE_MONTHS,
  HEALTH_LAB_MAX_AGE_MONTHS,
  HEALTH_LAB_MIN_AGE_MONTHS,
  HUB_TILE_MONTH_GATES,
} from "@/lib/hub-visibility";

export type DiscoveryCategory =
  | "today"
  | "beside_you"
  | "care"
  | "grow"
  | "play"
  | "moments"
  | "progress"
  | "rooms";

export type DiscoveryClass =
  | "core"
  | "supporting"
  | "discovery"
  | "advanced"
  | "internal"
  | "deprecated";

export type DiscoveryAudience = "parent" | "child" | "both";

export type EntitlementHint = "free" | "premium" | "quota" | "preview";

export type AgeBound = {
  /** Inclusive. Omit when AGE_UNFILTERED. */
  minMonths?: number;
  /** Exclusive. Omit when AGE_UNFILTERED. */
  maxMonthsExclusive?: number;
  unfiltered: boolean;
};

export type DiscoveryModule = {
  id: string;
  href: string;
  title: string;
  category: DiscoveryCategory;
  classification: DiscoveryClass;
  audience: DiscoveryAudience;
  entitlement: EntitlementHint;
  age: AgeBound;
  preferredAgeGroups: readonly AgeGroup[] | "all";
  /** Eligible on Home before a plan exists. Almost always false. */
  firstSessionEligible: boolean;
  /** Eligible after a real plan is visible. */
  postFirstValueEligible: boolean;
  /** Eligible after first meaningful plan action. */
  afterFirstActionEligible: boolean;
  evidence: string;
};

function unfiltered(): AgeBound {
  return { unfiltered: true };
}

function months(min?: number, maxExclusive?: number): AgeBound {
  return { unfiltered: false, minMonths: min, maxMonthsExclusive: maxExclusive };
}

const SPEECH_MAX = HUB_TILE_MONTH_GATES["speech-coach"]?.max;
const PHONICS = HUB_TILE_MONTH_GATES.phonics;
const PTM = HUB_TILE_MONTH_GATES["ptm-prep"];
const STUDY = HUB_TILE_MONTH_GATES["smart-study"];
const SPELLING = HUB_TILE_MONTH_GATES["spelling-mastery"];
const OLYMPIAD = HUB_TILE_MONTH_GATES.olympiad;
const LIFE = HUB_TILE_MONTH_GATES["life-skills"];
const COLORING = HUB_TILE_MONTH_GATES["coloring-books"];
const EVENT = HUB_TILE_MONTH_GATES["event-prep"];

export const DISCOVERY_MODULES: readonly DiscoveryModule[] = [
  {
    id: "today-plan",
    href: "/routines",
    title: "Today's plan",
    category: "today",
    classification: "core",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: true,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /routines — no age gate",
  },
  {
    id: "amy",
    href: "/assistant",
    title: "Amy",
    category: "beside_you",
    classification: "core",
    audience: "parent",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /assistant — no age gate; AI quota",
  },
  {
    id: "amy-coach",
    href: "/amy-coach",
    title: "Beside you",
    category: "beside_you",
    classification: "core",
    audience: "parent",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: true,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "Tab bar /amy-coach — no age gate",
  },
  {
    id: "speech-coach",
    href: "/speech-coach",
    title: "Speech Coach",
    category: "grow",
    classification: "core",
    audience: "both",
    entitlement: "quota",
    age: months(undefined, SPEECH_MAX),
    preferredAgeGroups: ["toddler", "preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.speech-coach.max = 132",
  },
  {
    id: "infant-care",
    href: "/parenting-hub#care",
    title: "Infant Care",
    category: "care",
    classification: "core",
    audience: "parent",
    entitlement: "free",
    age: months(0, 24),
    preferredAgeGroups: ["infant", "toddler"],
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "isHubSectionVisible infant-hub: childAgeMonths < 24",
  },
  {
    id: "nutrition",
    href: "/nutrition",
    title: "Nutrition",
    category: "care",
    classification: "supporting",
    audience: "parent",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /nutrition — AGE_UNFILTERED; canAccessNutritionHub",
  },
  {
    id: "health-lab",
    href: "/health-lab",
    title: "Health Lab",
    category: "care",
    classification: "advanced",
    audience: "parent",
    entitlement: "premium",
    age: months(0, HEALTH_LAB_MAX_AGE_MONTHS),
    preferredAgeGroups: ["toddler", "preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HEALTH_LAB_MIN/MAX; canAccessHealthLab = isPremium; preview <24m",
  },
  {
    id: "games",
    href: "/games",
    title: "Play",
    category: "play",
    classification: "core",
    audience: "both",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["toddler", "preschool", "early_school", "pre_teen"],
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "/games AGE_UNFILTERED; Hub preview < GAMING_HUB_MIN_AGE_MONTHS (24)",
  },
  {
    id: "study",
    href: "/study",
    title: "Learning",
    category: "grow",
    classification: "core",
    audience: "both",
    entitlement: "quota",
    age: months(24, STUDY?.max),
    preferredAgeGroups: ["preschool", "early_school", "pre_teen"],
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "Hub 24+ unlock bypasses infant smart-study 36m min; max 204m",
  },
  {
    id: "grow-room",
    href: "/parenting-hub#understand",
    title: "Grow",
    category: "grow",
    classification: "core",
    audience: "both",
    entitlement: "free",
    age: months(24),
    preferredAgeGroups: ["preschool", "early_school", "pre_teen"],
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "Hub Understand/Grow visible at 24+ months",
  },
  {
    id: "phonics",
    href: "/phonics",
    title: "Phonics",
    category: "grow",
    classification: "supporting",
    audience: "both",
    entitlement: "free",
    age: months(PHONICS?.min, PHONICS?.max),
    preferredAgeGroups: ["toddler", "preschool"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.phonics 12–72m",
  },
  {
    id: "abacus",
    href: "/abacus",
    title: "Abacus",
    category: "grow",
    classification: "supporting",
    audience: "both",
    entitlement: "free",
    age: months(24),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Hub tile abacus — no month gate; 24+ Hub unlock",
  },
  {
    id: "spelling",
    href: "/spelling",
    title: "Spelling",
    category: "grow",
    classification: "supporting",
    audience: "both",
    entitlement: "free",
    age: months(SPELLING?.min),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.spelling-mastery min 24m",
  },
  {
    id: "smart-math",
    href: "/smart-math-tricks",
    title: "Smart Math",
    category: "grow",
    classification: "supporting",
    audience: "both",
    entitlement: "free",
    age: months(24),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Hub smart-math-tricks — 24+ unlock",
  },
  {
    id: "olympiad",
    href: "/olympiad",
    title: "Olympiad",
    category: "grow",
    classification: "advanced",
    audience: "both",
    entitlement: "free",
    age: months(OLYMPIAD?.min, OLYMPIAD?.max),
    preferredAgeGroups: ["early_school", "pre_teen"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.olympiad 36–192m",
  },
  {
    id: "ptm-prep",
    href: "/parenting-hub#help",
    title: "PTM Prep",
    category: "beside_you",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: months(PTM?.min, PTM?.max),
    preferredAgeGroups: ["early_school", "pre_teen"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.ptm-prep 36–216m",
  },
  {
    id: "life-skills",
    href: "/life-skills",
    title: "Life Skills",
    category: "grow",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: months(LIFE?.min, LIFE?.max),
    preferredAgeGroups: ["toddler", "preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.life-skills 24–192m",
  },
  {
    id: "rooms",
    href: "/parenting-hub",
    title: "Rooms",
    category: "rooms",
    classification: "core",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: true,
    afterFirstActionEligible: true,
    evidence: "/parenting-hub — no age gate",
  },
  {
    id: "progress",
    href: "/progress",
    title: "Progress",
    category: "progress",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /progress — AGE_UNFILTERED; hide until first action (empty on day 0)",
  },
  {
    id: "insights",
    href: "/insights",
    title: "Insights",
    category: "progress",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /insights — AGE_UNFILTERED",
  },
  {
    id: "rewards",
    href: "/rewards",
    title: "Rewards",
    category: "moments",
    classification: "supporting",
    audience: "both",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Shipped /rewards page; was orphaned from NAV_ITEMS",
  },
  {
    id: "birth-sky",
    href: "/birth-sky",
    title: "Birth Sky",
    category: "rooms",
    classification: "advanced",
    audience: "parent",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "VITE_FF_BIRTH_SKY default ON; AGE_UNFILTERED",
  },
  {
    id: "amy-tutor",
    href: "/amy-ai-tutor",
    title: "Quick help",
    category: "grow",
    classification: "discovery",
    audience: "both",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /amy-ai-tutor — AGE_UNFILTERED",
  },
  {
    id: "talking-amy",
    href: "/talking-amy",
    title: "Talking Amy",
    category: "moments",
    classification: "discovery",
    audience: "both",
    entitlement: "free",
    age: months(24),
    preferredAgeGroups: ["toddler", "preschool"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Hub talking-amy render gate isTwoPlus (24m+)",
  },
  {
    id: "story",
    href: "/parenting-hub#moments",
    title: "Story",
    category: "moments",
    classification: "discovery",
    audience: "both",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Moments story destination — AGE_UNFILTERED",
  },
  {
    id: "discovery-worlds",
    href: "/discovery-worlds",
    title: "Discovery",
    category: "moments",
    classification: "discovery",
    audience: "child",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["toddler", "preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Route /discovery-worlds — AGE_UNFILTERED",
  },
  {
    id: "event-prep",
    href: "/event-prep",
    title: "Event Prep",
    category: "moments",
    classification: "advanced",
    audience: "parent",
    entitlement: "free",
    age: months(EVENT?.min, EVENT?.max),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "HUB_TILE_MONTH_GATES.event-prep 36–180m",
  },
  {
    id: "worksheets",
    href: "/worksheet",
    title: "Make",
    category: "moments",
    classification: "discovery",
    audience: "both",
    entitlement: "premium",
    age: months(COLORING?.min),
    preferredAgeGroups: ["preschool", "early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Shipped /worksheet; coloring/fun-sheets min 24m",
  },
  {
    id: "audio-lessons",
    href: "/audio-lessons",
    title: "Audio Lessons",
    category: "moments",
    classification: "discovery",
    audience: "both",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["infant", "toddler", "preschool"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Route exists; no nav — AGE_UNFILTERED",
  },
  {
    id: "rhymes",
    href: "/rhymes",
    title: "Rhymes",
    category: "moments",
    classification: "discovery",
    audience: "both",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["infant", "toddler"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Route exists; no nav — AGE_UNFILTERED",
  },
  {
    id: "animal-world",
    href: "/animal-world",
    title: "Animal World",
    category: "moments",
    classification: "discovery",
    audience: "child",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["toddler", "preschool"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "Route exists; no nav — AGE_UNFILTERED",
  },
  {
    id: "behavior",
    href: "/behavior",
    title: "Patterns",
    category: "progress",
    classification: "supporting",
    audience: "parent",
    entitlement: "quota",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /behavior — AGE_UNFILTERED",
  },
  {
    id: "recipes",
    href: "/recipes",
    title: "Recipes",
    category: "care",
    classification: "discovery",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /recipes — AGE_UNFILTERED",
  },
  {
    id: "environment",
    href: "/environment",
    title: "Environment",
    category: "care",
    classification: "internal",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: false,
    evidence: "Deep route — not consumer Home",
  },
  {
    id: "school-morning",
    href: "/school-morning-flow",
    title: "School morning",
    category: "today",
    classification: "internal",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: ["early_school"],
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: false,
    evidence: "Deep route — not consumer Home",
  },
  {
    id: "teacher-os",
    href: "/teacher-os",
    title: "Teacher OS",
    category: "grow",
    classification: "internal",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: false,
    evidence: "Not consumer-facing; living URL aliases to Rooms",
  },
  {
    id: "kids-control",
    href: "/kids-control-center",
    title: "Kids Control",
    category: "rooms",
    classification: "deprecated",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: false,
    evidence: "Waitlist badge; LIVING_NAV_CONTAINED_HREFS",
  },
  {
    id: "referrals",
    href: "/referrals",
    title: "Invite",
    category: "rooms",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /referrals — account More",
  },
  {
    id: "feedback",
    href: "/feedback",
    title: "Feedback",
    category: "rooms",
    classification: "supporting",
    audience: "parent",
    entitlement: "free",
    age: unfiltered(),
    preferredAgeGroups: "all",
    firstSessionEligible: false,
    postFirstValueEligible: false,
    afterFirstActionEligible: true,
    evidence: "NAV_ITEMS /feedback — account More",
  },
];

export function isAgeEligible(bound: AgeBound, totalMonths: number | null): boolean {
  if (bound.unfiltered) return true;
  if (totalMonths == null) return bound.minMonths == null;
  if (bound.minMonths != null && totalMonths < bound.minMonths) return false;
  if (bound.maxMonthsExclusive != null && totalMonths >= bound.maxMonthsExclusive) return false;
  return true;
}

export function moduleVisibleForMonths(
  module: DiscoveryModule,
  totalMonths: number | null,
): boolean {
  return isAgeEligible(module.age, totalMonths);
}

export function findDiscoveryModule(id: string): DiscoveryModule | undefined {
  return DISCOVERY_MODULES.find((m) => m.id === id);
}

export function ageGroupFromParts(years?: number | null, monthsPart?: number | null): AgeGroup {
  return getAgeGroup(years ?? 0, monthsPart ?? 0);
}

export function totalMonthsFromParts(years?: number | null, monthsPart?: number | null): number {
  return getTotalMonths(years ?? 0, monthsPart ?? 0);
}

/** Hub Infant Care window — not the canonical 0–11m infant group. */
export function isInfantCareDiscoveryAge(totalMonths: number): boolean {
  return totalMonths < 24;
}

export function isGamingPreviewAge(totalMonths: number): boolean {
  return totalMonths < GAMING_HUB_MIN_AGE_MONTHS;
}

export function isHealthLabPreviewAgeMonths(totalMonths: number): boolean {
  return totalMonths < HEALTH_LAB_MIN_AGE_MONTHS;
}

export type AgeMatrixCell = "Y" | "—" | "AGE_UNFILTERED";

export function ageMatrixCell(module: DiscoveryModule, group: AgeGroup): AgeMatrixCell {
  if (module.age.unfiltered) return "AGE_UNFILTERED";
  const sampleMonths: Record<AgeGroup, number> = {
    infant: 6,
    toddler: 18,
    preschool: 48,
    early_school: 84,
    pre_teen: 132,
  };
  return isAgeEligible(module.age, sampleMonths[group]) ? "Y" : "—";
}

export function discoveryModuleForHref(href: string): DiscoveryModule | undefined {
  const path = href.split("#")[0] ?? href;
  return DISCOVERY_MODULES.find((m) => (m.href.split("#")[0] ?? m.href) === path);
}

/**
 * More-drawer age filter. Unknown hrefs and AGE_UNFILTERED modules stay visible.
 * Do not invent a hide when code has no bound.
 */
export function isMoreHrefVisibleForAge(
  href: string,
  totalMonths: number | null | undefined,
): boolean {
  if (totalMonths == null) return true;
  const mod = discoveryModuleForHref(href);
  if (!mod || mod.age.unfiltered) return true;
  return isAgeEligible(mod.age, totalMonths);
}

export function resolveChildTotalMonths(
  children: Array<{
    id?: number | null;
    age?: number | null;
    ageMonths?: number | null;
  }>,
  activeChildId?: number | null,
): number | null {
  if (!children.length) return null;
  const active =
    activeChildId != null ? children.find((c) => c.id === activeChildId) : undefined;
  const child = active ?? children[0];
  if (!child || (child.age == null && child.ageMonths == null)) return null;
  return getTotalMonths(child.age ?? 0, child.ageMonths ?? 0);
}
