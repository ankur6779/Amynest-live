/**
 * Today's Focus — presentation only from existing guest.worry.
 * No Brain · No routing · No new state.
 */

import type { V2GuestSession } from "@/v2/guest";
import { FRONT_DOOR_WORRY_OPTIONS } from "@/v2/front-door/worry-options";
import type { FrontDoorWorryId } from "@/v2/front-door/types";

/** Human label for a Front Door worry id. */
export function worryDisplayLabel(worry: FrontDoorWorryId): string {
  return (
    FRONT_DOOR_WORRY_OPTIONS.find((o) => o.id === worry)?.label ?? "your concern"
  );
}

/** Memory banner — e.g. "Today's focus: Sleep". Null when no worry. */
export function buildTodayFocusBanner(
  session: Pick<V2GuestSession, "worry"> | null | undefined,
): string | null {
  const worry = session?.worry ?? null;
  if (!worry) return null;
  return `Today's focus: ${worryDisplayLabel(worry)}`;
}

/**
 * One why-line under the Mission card — honors concern, frames the step as calm support.
 * Does not invent a new mission type.
 */
export function buildMissionWhyLine(
  session:
    | Pick<V2GuestSession, "name" | "worry">
    | null
    | undefined,
): string | null {
  const worry = session?.worry ?? null;
  if (!worry) return null;

  const name = session?.name?.trim() || null;
  const who = name ? ` for ${name}` : "";
  const label = worryDisplayLabel(worry);

  const byWorry: Record<FrontDoorWorryId, string> = {
    speech_talking: `Talking is on your mind${who} — this quiet step builds confidence gently.`,
    sleep: `Sleep is on your mind${who} — Amy kept today's step soft and short.`,
    behavior: `Behavior is on your mind${who} — this calm step steadies the day.`,
    learning_school: `Learning is on your mind${who} — this clear step opens the door a little.`,
    mornings: `Mornings are on your mind${who} — this gentle step eases the start.`,
    feeding: `Feeding is on your mind${who} — this warm step keeps connection close.`,
    something_else: `${label} is on your mind${who} — Amy kept one clear step ready.`,
  };

  return byWorry[worry];
}
