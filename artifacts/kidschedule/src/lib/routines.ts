export type RoutineLike = {
  date?: string | null;
  items?: unknown[] | null;
};

export function routineItems(routine: RoutineLike): unknown[] {
  return Array.isArray(routine.items) ? routine.items : [];
}

export function routineDateKey(routine: RoutineLike): string {
  return (routine.date ?? "").slice(0, 10);
}
