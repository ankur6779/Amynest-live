import { routineDateKey } from "@/lib/routines";

export type TodayPlanPhase = "ready" | "building" | "failed" | "empty";

export function childHasTodayRoutine(
  routines: Array<{ childId?: number; date?: string | null }>,
  childId: number | null | undefined,
  todayKey: string,
): boolean {
  return routines.some((routine) => {
    if (routineDateKey(routine) !== todayKey) return false;
    if (childId == null) return true;
    return routine.childId == null || routine.childId === childId;
  });
}

/** Auto-build only when this child has no today plan and we will not surprise-paywall. */
export function shouldAutoBuildTodayPlan(input: {
  hasTodayRoutine: boolean;
  generateLocked: boolean;
  bypassPaywall: boolean;
  forced: boolean;
}): boolean {
  if (input.hasTodayRoutine) return false;
  if (input.forced) return true;
  if (input.generateLocked && !input.bypassPaywall) return false;
  return true;
}
