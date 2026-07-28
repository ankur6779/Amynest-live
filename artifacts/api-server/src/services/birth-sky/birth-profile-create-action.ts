/**
 * Decide how POST /birth-sky/create should apply a profile row.
 *
 * Soft-delete sets deletedAt but the unique (userId, childId) index still
 * covers those rows — recreate must resurrect, never INSERT a second row.
 */
export type BirthProfileCreateAction = "insert" | "update" | "resurrect";

export function birthProfileCreateAction(
  existing: { deletedAt: Date | null } | null | undefined,
): BirthProfileCreateAction {
  if (!existing) return "insert";
  if (existing.deletedAt != null) return "resurrect";
  return "update";
}
