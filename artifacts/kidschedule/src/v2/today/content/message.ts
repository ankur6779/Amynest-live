/**
 * Deterministic "Today's Message" — one short line.
 * Sole "Amy already helping" signal on Today.
 * Founder finish: ~10% fewer words; meaning intact.
 */

import type { V2GuestSession } from "@/v2/guest";
import type { FrontDoorWorryId } from "@/v2/front-door/types";

function withName(name: string | null): string {
  return name ? ` for ${name}` : "";
}

/** Exactly one short personalized message from guest fields. */
export function buildTodayMessage(
  session: Pick<V2GuestSession, "name" | "worry"> | null | undefined,
): string {
  const name = session?.name?.trim() || null;
  const who = withName(name);
  const worry = session?.worry ?? null;

  const byWorry: Record<FrontDoorWorryId, string> = {
    speech_talking: `Amy remembers talking matters${who}. Today's step is ready.`,
    sleep: `Amy remembers Sleep matters${who}. Today's step is ready.`,
    behavior: `Amy remembers Behavior matters${who}. Today's step is ready.`,
    learning_school: `Amy remembers Learning matters${who}. Today's step is ready.`,
    mornings: `Amy remembers Mornings matter${who}. Today's step is ready.`,
    feeding: `Amy remembers Feeding matters${who}. Today's step is ready.`,
    something_else: `Amy remembers what you shared${who}. Today's step is ready.`,
  };

  if (worry) return byWorry[worry];
  return `Amy is with you${who}. One clear step today.`;
}
