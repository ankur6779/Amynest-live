/** List `/routines` date contract — persisted local YYYY-MM-DD only.
 *  Applied from GET /routines (list). Does not change generation timing. */

export const ROUTINE_LOCAL_DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export function parseRoutineListDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !ROUTINE_LOCAL_DATE_RE.test(value)) return undefined;
  return value;
}

export function routineMatchesListQuery(
  routine: { childId: number; date: string },
  query: { childId?: number; date?: string },
): boolean {
  if (query.childId != null && routine.childId !== query.childId) return false;
  if (query.date && routine.date !== query.date) return false;
  return true;
}
