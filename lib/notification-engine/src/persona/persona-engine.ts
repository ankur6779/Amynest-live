import type { ActivitySignals, OutcomeSignals } from "../outcomes/types.js";

export type ParentPersona =
  | "ROUTINE_PARENT"
  | "SPEECH_PARENT"
  | "NUTRITION_PARENT"
  | "LEARNING_PARENT"
  | "EXPLORER_PARENT"
  | "WEEKEND_PARENT"
  | "PREMIUM_POWER_USER"
  | "OCCASIONAL_USER";

export interface PersonaProfile {
  primary: ParentPersona;
  /** Secondary leaning, if one is clearly present. */
  secondary: ParentPersona | null;
  /** 0–1 confidence in the primary inference. */
  confidence: number;
  /** Preferred topics (notification categories) for this persona. */
  preferredTopics: string[];
  /** Frequency bias multiplier applied to normal cadence (0.5–1.2). */
  frequencyBias: number;
  /** Whether conversion messaging suits this persona right now. */
  conversionReceptive: boolean;
}

/**
 * Infer a parent persona purely from behavior — never from manual labels.
 *
 * The dominant activity domain drives the persona; breadth vs. depth
 * distinguishes Explorer (broad, shallow) from focused personas. Low overall
 * activity yields Occasional. Premium + high activity yields Power User.
 */
export function inferParentPersona(s: OutcomeSignals): PersonaProfile {
  const a = normalizeActivity(s.activity);
  const total =
    a.routinesCompleted7d +
    a.lessonsCompleted7d +
    a.speechSessions7d +
    a.nutritionPlans7d +
    a.storiesPlayed7d +
    a.worksheetsCompleted7d +
    a.coachInteractions7d;

  // Occasional: barely any activity this week.
  if (total <= 1 && s.sessionsLast7d <= 2) {
    return profile("OCCASIONAL_USER", null, 0.6, ["engagement", "parenting_tips"], 0.6, false);
  }

  // Premium power user: paying + broad, deep activity.
  const activeDomains = countDomains(a);
  if (s.isPremium && total >= 12 && activeDomains >= 3) {
    return profile(
      "PREMIUM_POWER_USER",
      dominantPersona(a),
      0.85,
      ["insights", "learning_activity", "milestone"],
      1.1,
      false,
    );
  }

  // Weekend parent: activity concentrated on weekends.
  if (a.weekendActiveDays7d >= 2 && a.weekdayActiveDays7d <= 1) {
    return profile("WEEKEND_PARENT", dominantPersona(a), 0.7, ["story_time", "learning_activity", "engagement"], 0.9, true);
  }

  // Explorer: broad but shallow (many domains, low per-domain depth).
  if (activeDomains >= 4) {
    return profile("EXPLORER_PARENT", dominantPersona(a), 0.65, ["parenting_tips", "learning_activity", "story_time"], 1.0, true);
  }

  // Focused personas by dominant domain.
  const dom = dominantPersona(a);
  if (dom) {
    const confidence = round2(Math.min(0.9, 0.5 + depthShare(a, dom) * 0.5));
    return profile(dom, secondaryPersona(a, dom), confidence, topicsFor(dom), 1.0, true);
  }

  // Fallback.
  return profile("EXPLORER_PARENT", null, 0.5, ["parenting_tips", "engagement"], 1.0, true);
}

function normalizeActivity(a: ActivitySignals | undefined): Required<ActivitySignals> {
  return {
    routinesCompleted7d: a?.routinesCompleted7d ?? 0,
    lessonsCompleted7d: a?.lessonsCompleted7d ?? 0,
    speechSessions7d: a?.speechSessions7d ?? 0,
    nutritionPlans7d: a?.nutritionPlans7d ?? 0,
    storiesPlayed7d: a?.storiesPlayed7d ?? 0,
    worksheetsCompleted7d: a?.worksheetsCompleted7d ?? 0,
    coachInteractions7d: a?.coachInteractions7d ?? 0,
    weekdayActiveDays7d: a?.weekdayActiveDays7d ?? 0,
    weekendActiveDays7d: a?.weekendActiveDays7d ?? 0,
  };
}

type DomainKey = "routine" | "speech" | "nutrition" | "learning";

function domainCounts(a: Required<ActivitySignals>): Record<DomainKey, number> {
  return {
    routine: a.routinesCompleted7d,
    speech: a.speechSessions7d,
    nutrition: a.nutritionPlans7d,
    learning: a.lessonsCompleted7d + a.worksheetsCompleted7d,
  };
}

function countDomains(a: Required<ActivitySignals>): number {
  const c = domainCounts(a);
  let n = 0;
  for (const k of Object.keys(c) as DomainKey[]) if (c[k] > 0) n++;
  if (a.storiesPlayed7d > 0) n++;
  return n;
}

function dominantPersona(a: Required<ActivitySignals>): ParentPersona | null {
  const c = domainCounts(a);
  const entries: Array<[DomainKey, number]> = Object.entries(c) as Array<[DomainKey, number]>;
  entries.sort((x, y) => y[1] - x[1]);
  const [key, val] = entries[0]!;
  if (val <= 0) return null;
  return domainToPersona(key);
}

function secondaryPersona(a: Required<ActivitySignals>, exclude: ParentPersona): ParentPersona | null {
  const c = domainCounts(a);
  const entries: Array<[DomainKey, number]> = Object.entries(c) as Array<[DomainKey, number]>;
  entries.sort((x, y) => y[1] - x[1]);
  for (const [key, val] of entries) {
    if (val <= 0) continue;
    const p = domainToPersona(key);
    if (p !== exclude) return p;
  }
  return null;
}

function depthShare(a: Required<ActivitySignals>, persona: ParentPersona): number {
  const c = domainCounts(a);
  const total = c.routine + c.speech + c.nutrition + c.learning;
  if (total === 0) return 0;
  const key = personaToDomain(persona);
  if (!key) return 0;
  return c[key] / total;
}

function domainToPersona(key: DomainKey): ParentPersona {
  switch (key) {
    case "routine": return "ROUTINE_PARENT";
    case "speech": return "SPEECH_PARENT";
    case "nutrition": return "NUTRITION_PARENT";
    case "learning": return "LEARNING_PARENT";
  }
}

function personaToDomain(p: ParentPersona): DomainKey | null {
  switch (p) {
    case "ROUTINE_PARENT": return "routine";
    case "SPEECH_PARENT": return "speech";
    case "NUTRITION_PARENT": return "nutrition";
    case "LEARNING_PARENT": return "learning";
    default: return null;
  }
}

function topicsFor(p: ParentPersona): string[] {
  switch (p) {
    case "ROUTINE_PARENT": return ["routine", "routine_item", "good_night"];
    case "SPEECH_PARENT": return ["learning_activity", "insights", "milestone"];
    case "NUTRITION_PARENT": return ["nutrition", "insights"];
    case "LEARNING_PARENT": return ["learning_activity", "phonics", "story_time"];
    default: return ["engagement", "parenting_tips"];
  }
}

function profile(
  primary: ParentPersona,
  secondary: ParentPersona | null,
  confidence: number,
  preferredTopics: string[],
  frequencyBias: number,
  conversionReceptive: boolean,
): PersonaProfile {
  return { primary, secondary, confidence: round2(confidence), preferredTopics, frequencyBias, conversionReceptive };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
