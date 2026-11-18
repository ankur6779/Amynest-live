/**
 * Nutrition daily-score sync — Last-Write-Wins (LWW) merge rules.
 *
 * ## Per-day conflict (local store vs server log)
 * 1. Compare `dayUpdatedAt[dateKey]` (local ms) vs server `updatedAt` (ISO → ms).
 * 2. If local > server → keep local checklist; enqueue PUT (no local overwrite).
 * 3. If server > local → apply server checklist into `dayChecklists` + `history`.
 * 4. If equal → server wins (deterministic tie-break for multi-device same-ms edits).
 *
 * ## Child-level META_KEY (`amynest:nutrition-sync-meta:{childId}`)
 * Tracks the latest local mutation timestamp for the child. Used to:
 * - Skip redundant server pulls when local is strictly newer than last hydrate.
 * - Advance after successful flush so duplicate PUTs are avoided.
 *
 * ## Offline / queue
 * - Local edits always win until flushed; queue holds `{ dateKey, enqueuedAt }`.
 * - Flush GETs the day, applies the same LWW rules as hydrate, then PUTs only when
 *   local is strictly newer — never blind-overwrites a newer server checklist.
 * - PUT includes `clientUpdatedAt` so the server can reject stale writers.
 * - Failed PUTs remain queued; online listener hydrates (LWW) then flushes.
 *
 * ## Multi-device
 * - Each device maintains local `dayUpdatedAt`; server `updatedAt` is authoritative
 *   when newer. Devices converge on next hydrate / flush after the winning write lands.
 */

export type MergeOutcome = "applied_server" | "kept_local" | "skipped_empty";

export function resolveLwwWinner(
  localUpdatedAtMs: number,
  serverUpdatedAtMs: number,
): "local" | "server" | "none" {
  if (localUpdatedAtMs <= 0 && serverUpdatedAtMs <= 0) return "none";
  if (localUpdatedAtMs > serverUpdatedAtMs) return "local";
  return "server";
}

export function shouldPushLocalToServer(
  localUpdatedAtMs: number,
  serverUpdatedAtMs: number,
  hasLocalChecklist: boolean,
): boolean {
  return hasLocalChecklist && localUpdatedAtMs > serverUpdatedAtMs;
}

export function shouldApplyServerToLocal(
  localUpdatedAtMs: number,
  serverUpdatedAtMs: number,
  hasServerChecklist: boolean,
): boolean {
  if (!hasServerChecklist) return false;
  return resolveLwwWinner(localUpdatedAtMs, serverUpdatedAtMs) === "server";
}
