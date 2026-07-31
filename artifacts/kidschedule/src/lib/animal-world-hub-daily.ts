/**
 * Mirror Animal World play events into Amy Sound World hub daily adventure.
 * No Animal World UI changes — storage-only side effect.
 */

import type { DailyAdventureTaskKind } from "@workspace/world-engine";
import { recordHubDailyAdventure } from "@/lib/discovery-worlds-hub-daily";

export function recordAnimalWorldHubDaily(
  childId: number,
  kind: DailyAdventureTaskKind,
  amount = 1,
): void {
  recordHubDailyAdventure(childId, "animal_world", kind, amount);
}
