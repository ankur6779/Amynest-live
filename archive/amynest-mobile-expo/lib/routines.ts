import type { RoutineItem } from "@/hooks/useTodayRoutine";

export type RoutineLike = {
  date?: string | null;
  items?: RoutineItem[] | null;
};

export function routineItems(routine: RoutineLike): RoutineItem[] {
  return Array.isArray(routine.items) ? routine.items : [];
}

export function routineDateKey(routine: RoutineLike): string {
  return (routine.date ?? "").slice(0, 10);
}

export function normalizeRoutineList<T extends RoutineLike>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as T;
    return { ...row, items: routineItems(row) };
  });
}
