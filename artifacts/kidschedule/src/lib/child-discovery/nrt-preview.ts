/**
 * Live NRT preview for Child Discovery — reuses First Experience decide-next.
 * Presentational intelligence only; never invents household facts.
 */
import {
  decideFirstExperienceNextThing,
  type DecideNextInput,
} from "@/lib/first-experience/decide-next";
import type {
  FirstExperienceAgeBand,
  FirstExperienceNextThing,
  FirstExperienceTodayContext,
} from "@/lib/first-experience/types";

export type DiscoveryNrtInput = {
  childName: string;
  ageYears: number;
  ageMonths?: number;
  todayContext: FirstExperienceTodayContext;
  /** Optional focus goal — softens copy, does not invent new engines. */
  focusGoal?: string | null;
  now?: Date;
};

export function yearsToFirstExperienceAgeBand(
  years: number,
  months = 0,
): FirstExperienceAgeBand {
  const total = years * 12 + months;
  if (total < 24) return "0-2";
  if (total < 48) return "2-4";
  if (total < 96) return "5-7";
  return "8-10";
}

export function buildDiscoveryNrtPreview(
  input: DiscoveryNrtInput,
): FirstExperienceNextThing | null {
  const name = input.childName.trim();
  if (!name || name === "your child") return null;
  if (input.ageYears < 0) return null;

  const decideInput: DecideNextInput = {
    childName: name,
    ageBand: yearsToFirstExperienceAgeBand(input.ageYears, input.ageMonths ?? 0),
    todayContext: input.todayContext,
    now: input.now,
  };
  const base = decideFirstExperienceNextThing(decideInput);

  if (!input.focusGoal) return base;

  const focusLine = focusObservation(input.focusGoal, name);
  return {
    ...base,
    basedOn: [...base.basedOn.slice(0, 3), focusLine],
    detail: `${base.detail} ${focusLine}`,
  };
}

function focusObservation(goal: string, name: string): string {
  switch (goal) {
    case "improve_sleep":
      return `Tonight’s calm matters for ${name}.`;
    case "reduce_tantrums":
      return `A smaller next step steadies ${name}.`;
    case "improve_focus":
      return `One short focus win helps ${name} today.`;
    case "reduce_screen_time":
      return `A real-world beat replaces one screen loop.`;
    case "increase_independence":
      return `${name} can own one small step today.`;
    default:
      return "Today’s focus is held gently.";
  }
}
