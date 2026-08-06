/**
 * Founder Observation Mode — DEV opt-in only.
 * Never visible to parents. Never ships capture in production builds.
 */

const STORAGE_KEY = "__amynest_founder_observe";

export function isFounderObservationBuildEnabled(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/**
 * Explicit opt-in while in DEV.
 * `?founderObserve=1` or localStorage `__amynest_founder_observe=1`
 */
export function isFounderObservationEnabled(): boolean {
  if (!isFounderObservationBuildEnabled()) return false;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("founderObserve") === "0") return false;
    if (params.get("founderObserve") === "1") return true;
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setFounderObservationPreferred(enabled: boolean): void {
  if (!isFounderObservationBuildEnabled()) return;
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
