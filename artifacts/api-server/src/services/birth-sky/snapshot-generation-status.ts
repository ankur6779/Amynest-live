/**
 * Generation-status helpers for Birth Sky snapshot visibility.
 *
 * After profile birth-data edits, a prior isCurrent snapshot can disagree with
 * the profile until regenerate completes. Hide it while COMPUTING/FAILED.
 */

import {
  normalizeGenerationStatus,
  type GenerationStatus,
} from "./snapshot-service.js";

export type { GenerationStatus };

/**
 * Whether GET/clients may expose the isCurrent snapshot for this profile.
 * READY always; PENDING kept for pre-migration rows that already have a sky.
 * FAILED/COMPUTING hide stale rows after profile edits or in-flight regen.
 */
export function shouldExposeCurrentSnapshot(
  generationStatus: GenerationStatus,
  hasSnapshot: boolean,
): boolean {
  if (!hasSnapshot) return false;
  if (generationStatus === "READY") return true;
  if (generationStatus === "PENDING") return true;
  return false;
}

/**
 * Whether PDF / AI / JSON export may use the isCurrent astronomy row.
 * Same gate as GET — otherwise exports mix updated birth fields with a stale sky.
 */
export function mayUseCurrentSnapshotForExport(
  generationStatus: string | null | undefined,
  hasSnapshot: boolean,
): { ok: true; generationStatus: GenerationStatus } | { ok: false; generationStatus: GenerationStatus } {
  const status = normalizeGenerationStatus(generationStatus);
  if (!shouldExposeCurrentSnapshot(status, hasSnapshot)) {
    return { ok: false, generationStatus: status };
  }
  return { ok: true, generationStatus: status };
}
