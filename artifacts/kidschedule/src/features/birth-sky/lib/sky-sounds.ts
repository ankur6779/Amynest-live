/**
 * Soft sky sound effects — Web Audio only (no asset download).
 * Honors preferences.skySounds and prefers-reduced-motion.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tone(
  freq: number,
  startAt: number,
  duration: number,
  gainPeak: number,
  type: OscillatorType = "sine",
): void {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export type SkySoundKind = "chime" | "success" | "soft_tap" | "reveal";

/** Play a short premium sky cue when sounds are enabled. */
export function playSkySound(
  kind: SkySoundKind,
  options?: { enabled?: boolean; reducedMotion?: boolean },
): void {
  const enabled = options?.enabled !== false;
  if (!enabled) return;
  if (options?.reducedMotion ?? prefersReducedMotion()) return;
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  const t0 = ctx.currentTime + 0.01;
  switch (kind) {
    case "soft_tap":
      tone(520, t0, 0.12, 0.03, "triangle");
      break;
    case "chime":
      tone(660, t0, 0.35, 0.045, "sine");
      tone(990, t0 + 0.06, 0.4, 0.03, "sine");
      break;
    case "success":
      tone(523.25, t0, 0.28, 0.05, "sine");
      tone(659.25, t0 + 0.1, 0.32, 0.04, "sine");
      tone(783.99, t0 + 0.2, 0.45, 0.035, "sine");
      break;
    case "reveal":
      tone(392, t0, 0.5, 0.04, "sine");
      tone(523.25, t0 + 0.15, 0.55, 0.035, "triangle");
      tone(783.99, t0 + 0.35, 0.7, 0.03, "sine");
      break;
    default:
      break;
  }
}
