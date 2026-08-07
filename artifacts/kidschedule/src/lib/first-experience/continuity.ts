import { ageBandToApproxDob } from "@/lib/onboarding-keyboard-free";
import type {
  FirstExperienceAgeBand,
  FirstExperienceNextThing,
  FirstExperienceState,
  FirstExperienceTodayContext,
} from "./types";

const CONTINUITY_KEY = "amynest_first_experience_continuity_v1";
const SESSION_KEY = "amynest_first_experience_v1";
const HOME_SURFACED_KEY = "amynest_fe_home_continuity_surfaced_v1";
const HOME_GREETING_SESSION_KEY = "amynest_fe_home_greeting_session_v1";

export type FirstExperienceCompletionKind = "done" | "similar" | "later";

export type FirstExperienceContinuity = {
  version: 1;
  childName: string;
  ageBand: FirstExperienceAgeBand;
  todayContext: FirstExperienceTodayContext;
  nextThing: FirstExperienceNextThing;
  completedAt: string | null;
  valueEarned: boolean;
  completionKind: FirstExperienceCompletionKind | null;
  emotionalContext: string;
  source: "first-experience";
  savedAt: string;
};

export type HomeContinuityGreeting = {
  title: string;
  subtitle: string;
};

/** Midpoints for FE age bands — estimated, never invents a birthday claim. */
export function ageBandToApproxYears(band: FirstExperienceAgeBand): number {
  if (band === "0-2") return 1;
  if (band === "2-4") return 3;
  if (band === "5-7") return 6;
  return 9;
}

/** Map FE bands onto onboarding chip IDs so age never restarts as a blank ask. */
export function ageBandToOnboardingId(band: FirstExperienceAgeBand): string {
  if (band === "0-2") return "y1";
  if (band === "2-4") return "y3";
  if (band === "5-7") return "y6";
  return "y8_plus";
}

export function emotionalContextFromState(state: FirstExperienceState): string {
  if (state.todayContext === "school") return "Today already has a direction.";
  if (state.todayContext === "home") return "Today feels unhurried.";
  if (state.todayContext === "unsure") return "Today is still open.";
  return "Today is still open.";
}

export function buildContinuityFromState(state: FirstExperienceState): FirstExperienceContinuity | null {
  if (!state.valueEarned || !state.nextThing || !state.ageBand || !state.todayContext) return null;
  return {
    version: 1,
    childName: state.childName.trim() || "your child",
    ageBand: state.ageBand,
    todayContext: state.todayContext,
    nextThing: state.nextThing,
    completedAt: state.completedAt,
    valueEarned: true,
    completionKind: state.completionKind ?? null,
    emotionalContext: emotionalContextFromState(state),
    source: "first-experience",
    savedAt: new Date().toISOString(),
  };
}

export function saveFirstExperienceContinuity(continuity: FirstExperienceContinuity): void {
  try {
    localStorage.setItem(CONTINUITY_KEY, JSON.stringify(continuity));
  } catch {
    /* ignore quota */
  }
}

function continuityFromSessionFallback(): FirstExperienceContinuity | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as FirstExperienceState;
    return buildContinuityFromState(state);
  } catch {
    return null;
  }
}

export function loadFirstExperienceContinuity(): FirstExperienceContinuity | null {
  try {
    const raw = localStorage.getItem(CONTINUITY_KEY);
    if (!raw) return continuityFromSessionFallback();
    const parsed = JSON.parse(raw) as FirstExperienceContinuity;
    if (!parsed || parsed.version !== 1 || !parsed.valueEarned || !parsed.nextThing) {
      return continuityFromSessionFallback();
    }
    return parsed;
  } catch {
    return continuityFromSessionFallback();
  }
}

export function clearFirstExperienceContinuity(): void {
  try {
    localStorage.removeItem(CONTINUITY_KEY);
  } catch {
    /* ignore */
  }
}

/** Seed for authenticated onboarding — never restarts the story. */
export function peekFirstExperienceOnboardingSeed(): {
  name: string;
  age: number;
  ageMonths: number;
  dob: string;
  dobIsEstimated: true;
  selectedAgeBand: string;
  isSchoolGoing: boolean;
} | null {
  const c = loadFirstExperienceContinuity();
  if (!c?.childName || c.childName === "your child" || !c.ageBand) return null;
  const age = ageBandToApproxYears(c.ageBand);
  return {
    name: c.childName,
    age,
    ageMonths: 0,
    dob: ageBandToApproxDob(age, 0),
    dobIsEstimated: true,
    selectedAgeBand: ageBandToOnboardingId(c.ageBand),
    isSchoolGoing: c.todayContext === "school",
  };
}

export function hasDurableFirstExperienceMemory(): boolean {
  return Boolean(loadFirstExperienceContinuity()?.valueEarned);
}

export function wasHomeContinuitySurfaced(): boolean {
  try {
    return localStorage.getItem(HOME_SURFACED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHomeContinuitySurfaced(): void {
  try {
    localStorage.setItem(HOME_SURFACED_KEY, "1");
  } catch {
    /* ignore */
  }
}

/**
 * Premium waits until the first home memory has been felt.
 * Trust precedes subscription asks.
 */
export function shouldDeferMonetizationForFirstExperience(): boolean {
  return hasDurableFirstExperienceMemory() && !wasHomeContinuitySurfaced();
}

function buildHomeContinuityGreeting(
  c: FirstExperienceContinuity,
): HomeContinuityGreeting {
  const name = c.childName.trim() || "your child";
  if (c.completionKind === "later") {
    return {
      title: `${name} is still held from yesterday`,
      subtitle: `${c.emotionalContext} ${c.nextThing.title} is waiting when you are ready.`,
    };
  }
  if (c.completionKind === "similar") {
    return {
      title: `Yesterday already counted for ${name}`,
      subtitle: `${c.emotionalContext} Today can continue from that same quiet win.`,
    };
  }
  if (c.completedAt) {
    return {
      title: `${name}'s first success is still here`,
      subtitle: `${c.emotionalContext} ${c.nextThing.title} — today’s step can follow naturally.`,
    };
  }
  return {
    title: `Today continues for ${name}`,
    subtitle: `${c.emotionalContext} The next step is already known.`,
  };
}

/** Quiet home continuation — never surveillance, never streak guilt. */
export function peekHomeContinuityGreeting(): HomeContinuityGreeting | null {
  try {
    const cached = sessionStorage.getItem(HOME_GREETING_SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as HomeContinuityGreeting;
      if (parsed?.title && parsed?.subtitle) return parsed;
    }
  } catch {
    /* ignore */
  }
  if (wasHomeContinuitySurfaced()) return null;
  const c = loadFirstExperienceContinuity();
  if (!c?.valueEarned || !c.nextThing) return null;
  return buildHomeContinuityGreeting(c);
}

/**
 * Take the home greeting for this browser session (Strict Mode safe).
 * Marks monetization deferral as complete — trust has been felt on home.
 */
export function consumeHomeContinuityGreeting(): HomeContinuityGreeting | null {
  const greeting = peekHomeContinuityGreeting();
  if (!greeting) return null;
  try {
    sessionStorage.setItem(HOME_GREETING_SESSION_KEY, JSON.stringify(greeting));
  } catch {
    /* ignore */
  }
  markHomeContinuitySurfaced();
  return greeting;
}
