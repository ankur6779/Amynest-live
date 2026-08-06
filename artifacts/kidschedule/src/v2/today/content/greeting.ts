/**
 * Deterministic Today greeting from guest session fields.
 * Parent-facing — never address the child as "you".
 * Living Room: focus (worry) MERGED into one hero line — no chip.
 */

import type { V2GuestSession } from "@/v2/guest";
import { FRONT_DOOR_AGE_OPTIONS } from "@/v2/front-door/age-options";
import type { FrontDoorAgeBand } from "@/v2/front-door/types";
import { worryDisplayLabel } from "./focus";

export type TodayGreeting = {
  /** Primary heading — sole emotional hero */
  headline: string;
  /** Optional age context — whispered when present */
  subline: string;
};

function ageLabel(ageBand: FrontDoorAgeBand | null | undefined): string | null {
  if (!ageBand) return null;
  return FRONT_DOOR_AGE_OPTIONS.find((o) => o.id === ageBand)?.label ?? null;
}

/** Build parent-facing greeting from Age · Name · Worry — one hero answers “What matters today?” */
export function buildTodayGreeting(
  session:
    | Pick<V2GuestSession, "name" | "ageBand" | "worry">
    | null
    | undefined,
): TodayGreeting {
  const name = session?.name?.trim() || null;
  const worry = session?.worry ?? null;
  const concern = worry ? worryDisplayLabel(worry) : null;

  let headline: string;
  if (name && concern) {
    headline = `Today for ${name} · ${concern}`;
  } else if (name) {
    headline = `Today's step for ${name}`;
  } else if (concern) {
    headline = `${concern} matters today`;
  } else {
    headline = "Here's today's step";
  }

  const bandLabel = ageLabel(session?.ageBand ?? null);
  const subline = bandLabel ? `For your ${bandLabel} child.` : "";

  return {
    headline,
    subline,
  };
}
