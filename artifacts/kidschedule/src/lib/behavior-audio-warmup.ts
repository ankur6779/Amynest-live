/**
 * Behavior-driven audio warmup — enqueue Hetzner worker jobs on module entry.
 * No app boot warmup. One job per module per browser session.
 */

import type { AuthFetchFn } from "@/lib/poll-result";

export type BehaviorWarmupModule =
  | "stories"
  | "rhymes"
  | "speech_coach"
  | "spelling"
  | "discovery_world"
  | "animal_world"
  | "study_zone"
  | "parent_hub";

export const BEHAVIOR_WARMUP_CAPS: Record<BehaviorWarmupModule, number> = {
  stories: 5,
  speech_coach: 12,
  spelling: 12,
  study_zone: 8,
  rhymes: 8,
  animal_world: 16,
  discovery_world: 20,
  parent_hub: 10,
};

export type BehaviorWarmupHints = {
  spellingWords?: string[];
  storyIds?: string[];
  discoveryWorldId?: string;
  animalCategory?: string;
  studyTexts?: string[];
  ageMonths?: number;
};

const sessionFired = new Set<BehaviorWarmupModule>();

export function wasBehaviorWarmupFired(module: BehaviorWarmupModule): boolean {
  return sessionFired.has(module);
}

/** Fire-and-forget worker warmup — shifts generation bandwidth off Render. */
export function enqueueBehaviorWarmup(
  authFetch: AuthFetchFn,
  module: BehaviorWarmupModule,
  hints?: BehaviorWarmupHints,
): void {
  if (typeof window === "undefined") return;
  if (sessionFired.has(module)) return;
  sessionFired.add(module);

  const maxAssets = BEHAVIOR_WARMUP_CAPS[module];

  void authFetch("/api/audio-warmup/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ module, maxAssets, hints }),
  }).catch((err) => {
    if (import.meta.env.DEV) {
      console.warn("[BehaviorAudioWarmup] enqueue failed", module, err);
    }
  });
}

/** Test-only reset. */
export function resetBehaviorWarmupSession(): void {
  sessionFired.clear();
}
