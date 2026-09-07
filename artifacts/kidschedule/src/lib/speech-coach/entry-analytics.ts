/**
 * First-party Speech Coach landing entry — existing analytics track() only.
 * Measures discover/open, not live-session start or subscription events.
 */
import { track } from "@/lib/analytics";
import { getSanitizedPreviousRoute } from "@/lib/route-history-manager";
import {
  isSpeechCoachLivingV1Enabled,
  isSpeechCoachModulePath,
} from "@/lib/speech-coach/living-room";

export function speechCoachEntrySource(previousPath: string | null): string {
  if (!previousPath) return "direct";
  if (previousPath === "/dashboard") return "today-home";
  if (previousPath.startsWith("/parenting-hub")) return "rooms";
  if (previousPath === "/assistant") return "amy";
  return "in-app";
}

let lastFireAt = 0;
let lastFireKey = "";

/** Reset in-memory dedupe for unit tests. */
export function resetSpeechCoachEntryForTests(): void {
  lastFireAt = 0;
  lastFireKey = "";
}

/**
 * Fire once when the user enters `/speech-coach` from outside the module.
 * Skips remounts, live-session ↔ landing hops, and invisible re-renders.
 */
export function trackSpeechCoachLandingEntry(input: {
  childId?: number | null;
  living?: boolean;
}): void {
  const prev = getSanitizedPreviousRoute();
  if (isSpeechCoachModulePath(prev)) return;
  const source = speechCoachEntrySource(prev);
  const key = `${source}:${input.childId ?? "none"}`;
  const now = Date.now();
  if (key === lastFireKey && now - lastFireAt < 1500) return;
  lastFireKey = key;
  lastFireAt = now;
  track("speech_coach_entry", {
    source,
    child_id: input.childId ?? undefined,
    living: input.living ?? isSpeechCoachLivingV1Enabled(),
  });
}
