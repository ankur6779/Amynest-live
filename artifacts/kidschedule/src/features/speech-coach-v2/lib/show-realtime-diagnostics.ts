/** Show Realtime Diagnostics panel only in dev or explicit debug modes. */
export function showRealtimeDiagnostics(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem("speech-coach-v2-debug") === "1"
      || new URLSearchParams(window.location.search).get("speechDebug") === "1"
    );
  } catch {
    return false;
  }
}
