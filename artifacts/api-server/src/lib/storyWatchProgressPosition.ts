/**
 * Resolve the position to persist for Story Hub watch progress.
 *
 * Resume opens can race autoplay: `play` fires while currentTime is still ~0
 * before the seek to the saved mid-story position finishes. Blind writes of 0
 * must not wipe a durable resume row (Continue Watching requires positionSec > 5).
 */
export function resolveStoryWatchProgressPositionSec(input: {
  incomingPositionSec: number;
  existingPositionSec: number | null | undefined;
  isCompleted: boolean;
}): number {
  if (input.isCompleted) return 0;
  const existing = Math.max(0, Math.floor(input.existingPositionSec ?? 0));
  const incoming = Math.max(0, Math.floor(input.incomingPositionSec));
  return Math.max(existing, incoming);
}
