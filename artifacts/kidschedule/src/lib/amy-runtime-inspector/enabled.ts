/**
 * Amy Runtime Inspector — enablement gates.
 * Production bundles must never activate capture (zero overhead).
 */

export function isAmyRuntimeInspectorBuildEnabled(): boolean {
  return Boolean(import.meta.env?.DEV);
}

/**
 * Explicit opt-in only while in DEV.
 * Wave E: never auto-enable on parent paths (default OFF).
 */
export function isAmyRuntimeInspectorEnabled(): boolean {
  if (!isAmyRuntimeInspectorBuildEnabled()) return false;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("runtimeInspector") === "0") return false;
    if (params.get("runtimeInspector") === "1") return true;
    return localStorage.getItem("__amynest_runtime_inspector") === "1";
  } catch {
    return false;
  }
}

export function setAmyRuntimeInspectorPreferred(enabled: boolean): void {
  if (!isAmyRuntimeInspectorBuildEnabled()) return;
  try {
    if (enabled) localStorage.setItem("__amynest_runtime_inspector", "1");
    else localStorage.removeItem("__amynest_runtime_inspector");
  } catch {
    /* ignore */
  }
}
