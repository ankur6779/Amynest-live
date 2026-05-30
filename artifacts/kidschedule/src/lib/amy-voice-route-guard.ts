import { amyVoiceController } from "@/lib/amy-voice-controller";
import { isSameRoute, normalizeRoutePath } from "@/lib/navigation-stack";

/** Main Amy Coach wins screen — the only surface with win listen-aloud. */
export function isAmyCoachWinsRoute(path: string): boolean {
  return normalizeRoutePath(path) === "/amy-coach";
}

/** Stop coach win read-aloud when the user navigates away from the wins screen. */
export function pauseAmyVoiceOnAmyCoachLeave(from: string, to: string): void {
  const fromNorm = normalizeRoutePath(from);
  const toNorm = normalizeRoutePath(to);
  if (isSameRoute(fromNorm, toNorm)) return;
  if (!isAmyCoachWinsRoute(fromNorm)) return;
  amyVoiceController.pause();
}
