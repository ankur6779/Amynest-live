/**
 * Proactive re-engagement frequency policy.
 * Transactional / time-sensitive existing jobs (routine_item, infant care)
 * are not governed by these caps.
 */

export const REENGAGEMENT_POLICY = {
  maxProactivePerDay: 1,
  maxProactivePerWeek: 4,
  recentAppOpenSuppressionMinutes: 90,
  sendWindowStartHour: 8,
  sendWindowEndHour: 20,
  preferredSendHour: 8,
  preferredSendMinute: 30,
  defaultQuietHoursStart: "22:00",
  defaultQuietHoursEnd: "07:00",
  experimentId: "reengagement_copy_v1",
  experimentVariants: ["plan_ready", "next_right_thing"] as const,
} as const;

export type ReengagementCopyVariant =
  (typeof REENGAGEMENT_POLICY.experimentVariants)[number];

/** Minimum milliseconds before the same category may fire again. */
export const CATEGORY_COOLDOWN_MS = {
  UNFINISHED_ACTION: 24 * 60 * 60 * 1000,
  TODAY_PLAN: 24 * 60 * 60 * 1000,
  CHILD_CONTEXT: 24 * 60 * 60 * 1000,
  ROUTINE_CONTINUITY: 48 * 60 * 60 * 1000,
  AMY_COMPANION: 72 * 60 * 60 * 1000,
  WEEKLY_RECAP: 6 * 24 * 60 * 60 * 1000,
  WINBACK: 5 * 24 * 60 * 60 * 1000,
  GENERIC_REMINDER: 7 * 24 * 60 * 60 * 1000,
} as const;

export type ReengagementMode = "off" | "dry_run" | "live";

export function parseReengagementMode(raw: string | undefined | null): ReengagementMode {
  const v = (raw ?? "dry_run").trim().toLowerCase();
  if (v === "off" || v === "live" || v === "dry_run") return v;
  return "dry_run";
}
