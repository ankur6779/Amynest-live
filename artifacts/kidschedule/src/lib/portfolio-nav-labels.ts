/**
 * Portfolio P1 — places-of-life navigation labels (presentation only).
 * Routes unchanged. Living flags gate the calm dialect.
 */

import { isAmyCoachLivingV1Enabled } from "@/lib/amy-coach/living-room";
import { isParentHubRoomsV1Enabled } from "@/lib/parent-hub/feature-flags";
import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";
import { isTodayHomeV1Enabled } from "@/lib/today-home/feature-flags";

export function livingNavHomeLabel(): string {
  return isTodayHomeV1Enabled() ? "Home" : "Dashboard";
}

export function livingNavRoutinesLabel(): string {
  return isRoutineLivingV1Enabled() ? "Today's plan" : "Routines";
}

export function livingNavHubLabel(): string {
  return isParentHubRoomsV1Enabled() ? "Rooms" : "Parenting Hub";
}

export function livingNavUsesPlacesOfLife(): boolean {
  return (
    isTodayHomeV1Enabled() ||
    isParentHubRoomsV1Enabled() ||
    isRoutineLivingV1Enabled() ||
    isAmyCoachLivingV1Enabled()
  );
}
