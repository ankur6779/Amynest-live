/** Show legacy Speech Coach hub cards (Start Live Session, Talk with Amy). */
export function showSpeechCoachLegacyCards(remoteLegacyVisible = false): boolean {
  if (remoteLegacyVisible) return true;
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem("speech-coach-legacy") === "1"
      || new URLSearchParams(window.location.search).get("speechLegacy") === "1"
    );
  } catch {
    return false;
  }
}
