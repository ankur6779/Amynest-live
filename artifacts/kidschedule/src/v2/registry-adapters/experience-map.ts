/**
 * Reverse map featureId → experienceId from Brain static refs.
 * Adapters may read Brain id maps; Brain must never import registries.
 */

import { AMY_EXPERIENCE_REFS } from "@/v2/amy-decision/policy";

let cached: ReadonlyMap<string, string> | null = null;

function buildFeatureToExperienceMap(): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const [experienceId, refs] of Object.entries(AMY_EXPERIENCE_REFS)) {
    for (const featureId of refs.featureIds) {
      // First experience wins if multiple map to same feature (deterministic).
      if (!map.has(featureId)) {
        map.set(featureId, experienceId);
      }
    }
  }
  return map;
}

export function experienceIdForFeature(featureId: string): string | null {
  if (!cached) cached = buildFeatureToExperienceMap();
  return cached.get(featureId) ?? null;
}

/** Test helper — clear memoization. */
export function clearExperienceMapCacheForTests(): void {
  cached = null;
}
