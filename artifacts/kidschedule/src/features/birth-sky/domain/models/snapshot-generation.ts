/**
 * Birth Sky snapshot generation lifecycle (client + API contract).
 * Snapshots rows are only persisted when READY — never as null placeholders.
 */

export const SNAPSHOT_GENERATION_STATES = [
  "PENDING",
  "COMPUTING",
  "READY",
  "FAILED",
] as const;

export type SnapshotGenerationState = (typeof SNAPSHOT_GENERATION_STATES)[number];

/** Wire/API lowercase computeStatus ↔ generation state. */
export type SnapshotComputeStatus = "pending" | "computing" | "ready" | "failed";

export function toComputeStatus(state: SnapshotGenerationState): SnapshotComputeStatus {
  switch (state) {
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

export function toGenerationState(
  status: string | null | undefined,
): SnapshotGenerationState {
  const s = String(status ?? "").toUpperCase();
  if (s === "PENDING" || s === "COMPUTING" || s === "READY" || s === "FAILED") {
    return s;
  }
  const lower = String(status ?? "").toLowerCase();
  if (lower === "pending") return "PENDING";
  if (lower === "computing") return "COMPUTING";
  if (lower === "ready") return "READY";
  if (lower === "failed") return "FAILED";
  return "PENDING";
}

/** User-facing copy only — never expose pipeline / engine terminology. */
export function userFacingGenerationMessage(
  reason?: string | null,
): string {
  switch (reason) {
    case "timeout":
    case "formation_timeout":
      return "This is taking longer than expected. You can try generating again.";
    case "offline_interrupted":
    case "network_failure":
    case "network":
      return "Connection was lost while forming your sky. Please try again.";
    case "missing_birth_data":
    case "missing_child":
    case "consent_required":
      return "Some birth details are missing. Please review and try again.";
    case "unauthorized":
    case "birth_sky_not_enabled":
      return "Amy Astro Intelligence isn’t available for this account yet.";
    default:
      return "We couldn’t finish forming the sky. Please try generating again.";
  }
}
