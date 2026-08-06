/**
 * Process-local shadow-read counters — developer health only.
 * Not production persistence. Never for UI.
 */

import type { BrainValidationStatus } from "@/v2/brain-validation/types";
import type { TodayBrainSnapshot } from "./types";

let shadowReads = 0;
let lastSnapshot: TodayBrainSnapshot | null = null;

export function recordTodayBrainShadowRead(
  snapshot: TodayBrainSnapshot,
): void {
  shadowReads += 1;
  lastSnapshot = snapshot;
}

export function getTodayBrainShadowReadCount(): number {
  return shadowReads;
}

export function getLastTodayBrainSnapshot(): TodayBrainSnapshot | null {
  return lastSnapshot;
}

export function clearTodayBrainAdapterStateForTests(): void {
  shadowReads = 0;
  lastSnapshot = null;
}

export function lastValidationStatus():
  | BrainValidationStatus
  | "UNAVAILABLE" {
  return lastSnapshot?.validationStatus ?? "UNAVAILABLE";
}

export function lastBrainAvailable(): boolean {
  return lastSnapshot?.brainAvailable ?? false;
}
