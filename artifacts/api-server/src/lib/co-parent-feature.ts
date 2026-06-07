/**
 * Co-parent invite/accept rollout gate. Phase 1 retirement keeps DB + access checks;
 * set CO_PARENT_FEATURE_ENABLED=1 to re-enable invite/accept endpoints.
 */
export function isCoParentFeatureEnabled(): boolean {
  const raw = process.env.CO_PARENT_FEATURE_ENABLED;
  if (raw === undefined || raw === "") return false;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** @internal test helper */
export function resetCoParentFeatureForTests(): void {
  delete process.env.CO_PARENT_FEATURE_ENABLED;
}
