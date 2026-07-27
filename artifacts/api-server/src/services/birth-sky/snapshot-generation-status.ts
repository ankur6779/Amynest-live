export type GenerationStatus = "PENDING" | "COMPUTING" | "READY" | "FAILED";

export function normalizeGenerationStatus(
  value: string | null | undefined,
): GenerationStatus {
  const s = String(value ?? "PENDING").toUpperCase();
  if (s === "PENDING" || s === "COMPUTING" || s === "READY" || s === "FAILED") {
    return s;
  }
  return "PENDING";
}

export function generationStatusToComputeStatus(
  status: GenerationStatus,
): "pending" | "computing" | "ready" | "failed" {
  switch (status) {
    case "PENDING":
      return "pending";
    case "COMPUTING":
      return "computing";
    case "READY":
      return "ready";
    case "FAILED":
      return "failed";
  }
}

/**
 * Whether a persisted isCurrent snapshot may be returned to clients.
 * FAILED/COMPUTING hide stale rows after profile edits or in-flight regen.
 * PENDING + snapshot covers pre-migration rows (default status before first recompute).
 */
export function shouldExposeCurrentSnapshot(
  generationStatus: GenerationStatus,
  hasCurrentSnapshot: boolean,
): boolean {
  if (!hasCurrentSnapshot) return false;
  if (generationStatus === "READY") return true;
  if (generationStatus === "PENDING") return true;
  return false;
}
