import { routineDateKey, routineItems } from "@/lib/routines";

export type TodayPlanPhase = "ready" | "building" | "failed" | "empty";

export type TodayPlanRoutineLike = {
  id?: number;
  childId?: number | null;
  date?: string | null;
  routineDate?: string | null;
  items?: unknown[] | null;
};

export function persistedRoutineLocalDate(routine: TodayPlanRoutineLike): string {
  const raw = routine.date ?? routine.routineDate ?? "";
  return String(raw).slice(0, 10);
}

/** Today's routine ONLY when child and persisted local date both match. */
export function isExactChildDateRoutine(
  routine: TodayPlanRoutineLike | null | undefined,
  childId: number,
  localDate: string,
): boolean {
  if (!routine || routine.id == null || routine.id <= 0) return false;
  if (routine.childId !== childId) return false;
  return persistedRoutineLocalDate(routine) === localDate;
}

export function isExecutableTodayRoutine(
  routine: TodayPlanRoutineLike | null | undefined,
  childId: number,
  localDate: string,
): boolean {
  if (!isExactChildDateRoutine(routine, childId, localDate)) return false;
  if (!Array.isArray(routine?.items)) return true;
  return routineItems(routine).length > 0;
}

export function childHasTodayRoutine(
  routines: Array<{ childId?: number; date?: string | null }>,
  childId: number | null | undefined,
  todayKey: string,
): boolean {
  return routines.some((routine) => {
    if (routineDateKey(routine) !== todayKey) return false;
    if (childId == null) return true;
    return routine.childId === childId;
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
