/**
 * Child Discovery beat machine — one question per screen.
 * Canonical analytics step ids preserved for funnel compatibility.
 */
import type { OnboardingStep } from "@/lib/onboarding-chat-types";
import type { FirstExperienceTodayContext } from "@/lib/first-experience/types";
import { shouldAskInfantCare, shouldAskTodayWorld } from "./infer";

export type DiscoveryBeat =
  | "arrival"
  | "place"
  | "child-name"
  | "child-age"
  | "today-world"
  | "infant-feeding"
  | "infant-sleep"
  | "rhythm"
  | "focus"
  | "earned"
  | "saving"
  | "done";

/** Map Discovery beats → existing onboarding funnel step ids. */
export function beatToAnalyticsStep(beat: DiscoveryBeat): OnboardingStep {
  switch (beat) {
    case "arrival":
      return "intro";
    case "place":
      return "country-confirm";
    case "child-name":
      return "child-name";
    case "child-age":
      return "child-dob";
    case "today-world":
      return "child-education-stage";
    case "infant-feeding":
      return "infant-feeding";
    case "infant-sleep":
      return "infant-sleep";
    case "rhythm":
      return "child-wake";
    case "focus":
      return "parent-goals";
    case "earned":
      return "parent-allergies";
    case "saving":
      return "saving";
    case "done":
      return "done";
  }
}

export type DiscoveryContext = {
  hasCountry: boolean;
  hasName: boolean;
  hasAge: boolean;
  todayContext: FirstExperienceTodayContext | null;
  years: number;
  months: number;
  feedingType?: string | null;
  sleepPattern?: string | null;
  rhythmConfirmed: boolean;
  focusResolved: boolean; // answered or skipped
};

export function resolveNextBeat(
  current: DiscoveryBeat,
  ctx: DiscoveryContext,
): DiscoveryBeat {
  const order = buildBeatOrder(ctx);
  const idx = order.indexOf(current);
  if (idx < 0) return order[0] ?? "arrival";
  return order[idx + 1] ?? "earned";
}

export function buildBeatOrder(ctx: DiscoveryContext): DiscoveryBeat[] {
  const beats: DiscoveryBeat[] = ["arrival"];
  if (!ctx.hasCountry) beats.push("place");
  if (!ctx.hasName) beats.push("child-name");
  // Always confirm age when missing; when present, confirm beat still shown as confirm UI
  beats.push("child-age");
  if (shouldAskTodayWorld(ctx.todayContext)) beats.push("today-world");
  if (ctx.hasAge && shouldAskInfantCare(ctx.years, ctx.months)) {
    if (!ctx.feedingType) beats.push("infant-feeding");
    if (!ctx.sleepPattern) beats.push("infant-sleep");
  }
  if (!ctx.rhythmConfirmed) beats.push("rhythm");
  if (!ctx.focusResolved) beats.push("focus");
  beats.push("earned", "saving", "done");
  return beats;
}

export const FOCUS_OPTIONS = [
  { id: "improve_sleep", label: "Better sleep" },
  { id: "reduce_tantrums", label: "Calmer days" },
  { id: "improve_focus", label: "More focus" },
  { id: "reduce_screen_time", label: "Less screen time" },
  { id: "increase_independence", label: "More independence" },
] as const;

export const AGE_OPTIONS = [
  { id: "under_1", years: 0, months: 6, label: "Under 1" },
  { id: "y1", years: 1, months: 0, label: "1" },
  { id: "y2", years: 2, months: 0, label: "2" },
  { id: "y3", years: 3, months: 0, label: "3" },
  { id: "y4", years: 4, months: 0, label: "4" },
  { id: "y5", years: 5, months: 0, label: "5" },
  { id: "y6", years: 6, months: 0, label: "6" },
  { id: "y7", years: 7, months: 0, label: "7" },
  { id: "y8_plus", years: 8, months: 0, label: "8+" },
] as const;
