// ─────────────────────────────────────────────────────────────────────────
// @workspace/family-routine
// Shared logic for AmyNest's multi-child + family routine system.
// Pure TS — no React, no platform deps. Runs on web + Expo + Node.
// ─────────────────────────────────────────────────────────────────────────

export type HandlerKey = "mom" | "dad" | "both" | "grandparent" | "babysitter";

export type HandlerInfo = {
  key: HandlerKey;
  label: string;
  emoji: string;
  /** UI accent colour as a soft background */
  bg: string;
  /** Border colour for selected state */
  border: string;
  /** Foreground / text accent */
  fg: string;
  /** Short note shown to the parent describing how Amy will adjust the day */
  note: string;
  /** Categories that should be filtered OUT entirely for this handler */
  skipCategories: string[];
  /** Maximum number of activities Amy will keep when simplifying for this handler */
  maxActivities: number;
  /** Whether to add "easy step" prefix to remaining activities */
  addEasySteps: boolean;
};

export const HANDLER_TYPES: HandlerInfo[] = [
  {
    key: "mom",
    label: "Mom",
    emoji: "👩",
    bg: "#FFF1F8",
    border: "#F472B6",
    fg: "#9D174D",
    note: "Full routine with bonding moments and learning time.",
    skipCategories: [],
    maxActivities: 99,
    addEasySteps: false,
  },
  {
    key: "dad",
    label: "Dad",
    emoji: "👨",
    bg: "#EEF2FF",
    border: "#818CF8",
    fg: "#3730A3",
    note: "Full routine with extra outdoor and active play.",
    skipCategories: [],
    maxActivities: 99,
    addEasySteps: false,
  },
  {
    key: "both",
    label: "Both Parents",
    emoji: "👨‍👩‍👧",
    bg: "#F3E8FF",
    border: "#A78BFA",
    fg: "#5B21B6",
    note: "Both parents available — Amy will plan extra family bonding moments and shared activities.",
    skipCategories: [],
    maxActivities: 99,
    addEasySteps: false,
  },
  {
    key: "grandparent",
    label: "Grandparent",
    emoji: "🧑‍🦳",
    bg: "#FEF3C7",
    border: "#F59E0B",
    fg: "#92400E",
    note: "Simpler, low-stress routine — fewer transitions, more rest.",
    skipCategories: ["study", "creative"],
    maxActivities: 9,
    addEasySteps: true,
  },
  {
    key: "babysitter",
    label: "Babysitter",
    emoji: "🧑‍🍼",
    bg: "#ECFDF5",
    border: "#34D399",
    fg: "#065F46",
    note: "Clear step-by-step instructions and easy tasks only.",
    skipCategories: ["study"],
    maxActivities: 11,
    addEasySteps: true,
  },
];

export function getHandlerInfo(key: HandlerKey | null | undefined): HandlerInfo {
  return HANDLER_TYPES.find((h) => h.key === key) ?? HANDLER_TYPES[0];
}

// ─── Routine item shape (matches API) ────────────────────────────────────
export type FRItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
  rewardPoints?: number;
};

export type FRChild = {
  id: number;
  name: string;
  age: number;
};

export type FRRoutine = { title: string; items: FRItem[] };
export type FRFamilyResult = { child: FRChild; routine: FRRoutine };

// ─── Handler-based simplification ────────────────────────────────────────
/**
 * Simplifies a routine based on who is handling the child. Always preserves
 * essential tasks (meals, sleep, hygiene). Trims optional activities and
 * prepends "Easy:" hint for grandparent/babysitter.
 */
export function simplifyForHandler(items: FRItem[], handlerKey: HandlerKey): FRItem[] {
  const handler = getHandlerInfo(handlerKey);
  if (handler.skipCategories.length === 0 && handler.maxActivities >= 99) {
    return items; // mom/dad — no simplification
  }

  const isEssential = (it: FRItem) =>
    ["meal", "tiffin", "sleep", "morning_routine", "self_care", "school"].includes(it.category) ||
    /sleep|breakfast|lunch|dinner|snack|brush|bath|wake|tiffin/i.test(it.activity);

  // 1. Remove categories the handler should skip (but keep essentials)
  const filtered = items.filter(
    (it) => isEssential(it) || !handler.skipCategories.includes(it.category)
  );

  // 2. Cap total length — keep all essentials + earliest non-essentials up to cap
  let trimmed: FRItem[];
  if (filtered.length > handler.maxActivities) {
    const essentials = filtered.filter(isEssential);
    const optional = filtered.filter((it) => !isEssential(it));
    const slots = Math.max(0, handler.maxActivities - essentials.length);
    trimmed = [...essentials, ...optional.slice(0, slots)].sort(
      (a, b) => parseTimeMins(a.time) - parseTimeMins(b.time)
    );
  } else {
    trimmed = filtered;
  }

  // 3. Add "Easy step" hint for non-essential items
  if (handler.addEasySteps) {
    return trimmed.map((it) => {
      if (isEssential(it)) return it;
      const hint = handler.key === "babysitter" ? "Step:" : "Easy:";
      const already = it.activity.toLowerCase().startsWith("step:") || it.activity.toLowerCase().startsWith("easy:");
      return already ? it : { ...it, activity: `${hint} ${it.activity}` };
    });
  }
  return trimmed;
}

// ─── Time helpers ────────────────────────────────────────────────────────
export function parseTimeMins(t: string): number {
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3]) {
    if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
    if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  }
  return h * 60 + min;
}

// ─── Amy AI Smart-Sync Suggestions ───────────────────────────────────────
export type AmySuggestion = {
  icon: string;
  title: string;
  body: string;
};

/**
 * Local rule-based engine that scans family routines and generates
 * actionable parenting suggestions. No AI calls.
 */
export function buildSyncSuggestions(results: FRFamilyResult[]): AmySuggestion[] {
  const suggestions: AmySuggestion[] = [];
  if (results.length < 2) return suggestions;

  // 1. Meal time alignment check
  const mealTimes = results.map((r) => {
    const lunch = r.routine.items.find((i) => /lunch/i.test(i.activity));
    return lunch ? { name: r.child.name, time: lunch.time, mins: parseTimeMins(lunch.time) } : null;
  }).filter(Boolean) as { name: string; time: string; mins: number }[];

  if (mealTimes.length >= 2) {
    const minM = Math.min(...mealTimes.map((m) => m.mins));
    const maxM = Math.max(...mealTimes.map((m) => m.mins));
    if (maxM - minM > 15) {
      const earliest = mealTimes.find((m) => m.mins === minM)!;
      suggestions.push({
        icon: "🍽️",
        title: "Combine meal time",
        body: `Lunch times differ by ${maxM - minM} min across kids. Try eating together at ${earliest.time} to reduce kitchen runs.`,
      });
    } else {
      suggestions.push({
        icon: "✨",
        title: "Lunch is already in sync",
        body: `All kids are eating around ${mealTimes[0].time} — perfect for a shared family meal.`,
      });
    }
  }

  // 2. Wake-time staggering check
  const wakeTimes = results.map((r) => {
    const first = r.routine.items[0];
    return first ? parseTimeMins(first.time) : 0;
  }).filter((t) => t > 0);
  if (wakeTimes.length >= 2) {
    const wakeSpread = Math.max(...wakeTimes) - Math.min(...wakeTimes);
    if (wakeSpread < 10) {
      suggestions.push({
        icon: "⏰",
        title: "Stagger wake-ups by 15 min",
        body: "All kids wake at the same time — staggering by 15 min gives you breathing room for breakfast.",
      });
    }
  }

  // 3. Age difference advisory
  const ages = results.map((r) => r.child.age);
  const ageGap = Math.max(...ages) - Math.min(...ages);
  if (ageGap >= 4) {
    suggestions.push({
      icon: "🎯",
      title: "Match activity difficulty to each age",
      body: `${ageGap}-year age gap — Amy adjusted task difficulty per child. Pair them for play, not for study.`,
    });
  }

  // 4. Family bonding window suggestion
  suggestions.push({
    icon: "👨‍👩‍👧",
    title: "Block one shared family activity today",
    body: "Even 20 min of story time or a board game together strongly boosts sibling bonding.",
  });

  return suggestions;
}

// ─── Family Points calculation ───────────────────────────────────────────
export type FamilyPointsBreakdown = {
  perChild: { name: string; points: number }[];
  individualTotal: number;
  familyBonus: number;
  total: number;
  allCompleted: boolean;
};

export function computeFamilyPoints(results: FRFamilyResult[]): FamilyPointsBreakdown {
  const perChild = results.map(({ child, routine }) => {
    const earned = routine.items
      .filter((i) => i.status === "completed")
      .reduce((sum, i) => sum + (i.rewardPoints ?? pointsForCategory(i.category)), 0);
    return { name: child.name, points: earned };
  });
  const individualTotal = perChild.reduce((s, p) => s + p.points, 0);

  const allCompleted =
    results.length > 0 &&
    results.every((r) => r.routine.items.every((i) => i.status === "completed" || i.status === "skipped"));

  const familyBonus = allCompleted ? 20 : 0;
  return { perChild, individualTotal, familyBonus, total: individualTotal + familyBonus, allCompleted };
}

// Points per category (mirrors backend defaults)
export function pointsForCategory(cat: string): number {
  switch (cat) {
    case "morning_routine": return 5;
    case "meal": case "tiffin": return 5;
    case "school": return 10;
    case "study": return 10;
    case "play": return 5;
    case "outdoor": return 8;
    case "creative": return 8;
    case "family": return 10;
    case "self_care": return 5;
    case "rest": return 3;
    case "sleep": return 5;
    default: return 5;
  }
}

// ─── Shared family activities catalog ────────────────────────────────────
export type SharedActivity = {
  emoji: string;
  title: string;
  duration: number;
  description: string;
  category: "family" | "creative" | "outdoor";
  ageMin: number;
  ageMax: number;
};

export const SHARED_ACTIVITIES: SharedActivity[] = [
  {
    emoji: "📖",
    title: "Bedtime story circle",
    duration: 20,
    description: "Pick one book and take turns reading a page each.",
    category: "family",
    ageMin: 2,
    ageMax: 12,
  },
  {
    emoji: "🎨",
    title: "Family art jam",
    duration: 30,
    description: "Everyone draws on the same theme, then share what you made.",
    category: "creative",
    ageMin: 3,
    ageMax: 14,
  },
  {
    emoji: "🧩",
    title: "Puzzle time together",
    duration: 25,
    description: "Pull out a puzzle the youngest can manage and solve as a team.",
    category: "family",
    ageMin: 3,
    ageMax: 12,
  },
  {
    emoji: "⚽",
    title: "Backyard play",
    duration: 30,
    description: "Throw a ball, race, or play tag — pure outdoor energy.",
    category: "outdoor",
    ageMin: 3,
    ageMax: 15,
  },
  {
    emoji: "🍳",
    title: "Cook one dish together",
    duration: 35,
    description: "Let each kid have a job — stirring, sprinkling, plating.",
    category: "family",
    ageMin: 4,
    ageMax: 14,
  },
  {
    emoji: "🎵",
    title: "Music + dance break",
    duration: 15,
    description: "Pick 3 songs and dance — silly, no rules, all in.",
    category: "family",
    ageMin: 1,
    ageMax: 15,
  },
  {
    emoji: "🌱",
    title: "Garden / plant care",
    duration: 20,
    description: "Water plants, feel the soil, look for tiny bugs.",
    category: "outdoor",
    ageMin: 2,
    ageMax: 12,
  },
  {
    emoji: "🎲",
    title: "One round of a board game",
    duration: 25,
    description: "Pick a quick game so everyone stays engaged.",
    category: "family",
    ageMin: 4,
    ageMax: 15,
  },
];

/**
 * Picks 3 family activities that fit the age range across all kids.
 */
export function pickSharedActivities(children: FRChild[], count = 3): SharedActivity[] {
  if (children.length === 0) return SHARED_ACTIVITIES.slice(0, count);
  const minAge = Math.min(...children.map((c) => c.age));
  const maxAge = Math.max(...children.map((c) => c.age));
  const matching = SHARED_ACTIVITIES.filter((a) => a.ageMin <= minAge && a.ageMax >= maxAge);
  const pool = matching.length >= count ? matching : SHARED_ACTIVITIES;
  // Pseudo-random but deterministic per child set
  const seed = children.reduce((s, c) => s + c.id, 0);
  const shuffled = [...pool].sort((a, b) => ((a.title.charCodeAt(0) + seed) % 7) - ((b.title.charCodeAt(0) + seed) % 7));
  return shuffled.slice(0, count);
}

// ─── Handler note for backend prompt augmentation ────────────────────────
export function buildHandlerSpecialPlansSuffix(handlerKey: HandlerKey): string {
  const h = getHandlerInfo(handlerKey);
  switch (h.key) {
    case "grandparent":
      return "Today is being handled by a grandparent — keep tasks simple and low-stress, fewer transitions, more rest.";
    case "babysitter":
      return "Today is being handled by a babysitter — give clear step-by-step instructions and easy tasks only.";
    case "dad":
      return "Today is being handled by Dad — include extra outdoor and active play.";
    case "both":
      return "Today both parents (Mom AND Dad) are handling the child together — plan extra family bonding activities, shared meals, joint playtime, and co-parenting moments. Distribute responsibilities between both parents and highlight 'family time' tasks.";
    case "mom":
    default:
      return "Today is being handled by Mom — include bonding moments and learning time.";
  }
}

export function appendHandlerToPlans(specialPlans: string, handlerKey: HandlerKey): string {
  const suffix = buildHandlerSpecialPlansSuffix(handlerKey);
  if (!specialPlans.trim()) return suffix;
  return `${specialPlans.trim()} | ${suffix}`;
}

export * from "./adaptive";
export * from "./commandCenter";
export * from "./availability";
export * from "./familyTimeline";
