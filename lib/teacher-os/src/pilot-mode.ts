const PILOT_KEY = "teacher-os-pilot-mode-v81";

export function isPilotModeEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(PILOT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPilotModeEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (enabled) localStorage.setItem(PILOT_KEY, "1");
    else localStorage.removeItem(PILOT_KEY);
  } catch { /* */ }
}

export function isAdminToolsVisible(): boolean {
  if (isPilotModeEnabled()) return true;
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  return isLocalDev && window.location.search.includes("tos_admin=1");
}
