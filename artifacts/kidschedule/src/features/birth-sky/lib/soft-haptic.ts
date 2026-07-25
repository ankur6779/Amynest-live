/**
 * Optional soft haptic — no-op when unsupported or reduced motion.
 */

export function softHaptic(reducedMotion = false): void {
  if (reducedMotion) return;
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(12);
  } catch {
    /* ignore */
  }
}
