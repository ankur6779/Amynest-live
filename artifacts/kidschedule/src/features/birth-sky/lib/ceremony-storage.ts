/** First-view skip memory for the cinematic reveal ceremony (local only). */

const KEY = "amynest:amy-astro:ceremony-seen:v1:";

export function hasSeenRevealCeremony(profileId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(KEY + profileId) === "1";
  } catch {
    return false;
  }
}

export function markRevealCeremonySeen(profileId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY + profileId, "1");
  } catch {
    /* ignore quota */
  }
}
