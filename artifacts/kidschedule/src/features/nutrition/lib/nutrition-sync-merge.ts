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
 * - Flush sends canonical `dayChecklists[dateKey]` — never count-derived payloads.
 * - Failed PUTs remain queued; online listener retries.
 *
 * ## Multi-device
 * - Each device maintains local `dayUpdatedAt`; server `updatedAt` is authoritative
 *   when newer. Devices converge on next hydrate after the winning write lands.
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
