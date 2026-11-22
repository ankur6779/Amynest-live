/**
 * Position to report on Story Hub session-start (`startedSession`).
 *
 * Autoplay can fire `play` before the resume seek finishes, so currentTime is
 * still ~0 while a saved mid-story position exists. Prefer the saved resume
 * until the element has actually seeked forward.
 */
export function resolveStorySessionStartPositionSec(
  currentTimeSec: number,
  savedPositionSec: number | null | undefined,
): number {
  const saved = savedPositionSec ?? 0;
  const current = Number.isFinite(currentTimeSec) ? currentTimeSec : 0;
  if (saved > 5 && current < saved - 1) {
    return saved;
  }
  return current;
}
