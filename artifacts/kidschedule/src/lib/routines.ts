export type RoutineLike = {
  date?: string | null;
  items?: unknown[] | null;
};

export function routineItems<T = unknown>(routine: RoutineLike): T[] {
  return Array.isArray(routine.items) ? (routine.items as T[]) : [];
}

export function routineDateKey(routine: RoutineLike): string {
  return (routine.date ?? "").slice(0, 10);
}

export function asRoutineList<T extends RoutineLike>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = r as T;
    return { ...row, items: routineItems(row) };
  });
}
