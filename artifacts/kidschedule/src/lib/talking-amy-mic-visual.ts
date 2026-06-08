/**
 * Mic-reactive visual helpers for Talking Amy — clamped, reduced-motion aware.
 */

export function clampMicLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(1, Math.max(0, level));
}

/** Smooth mic level for 60fps UI (exponential moving average). */
export function smoothMicLevel(prev: number, next: number, alpha = 0.28): number {
  const clamped = clampMicLevel(next);
  return clampMicLevel(prev + (clamped - prev) * alpha);
}

export function micLevelToHaloScale(
  level: number,
  opts?: { reducedMotion?: boolean; base?: number },
): number {
  const base = opts?.base ?? 1;
  const gain = opts?.reducedMotion ? 0.04 : 0.14;
  return base + clampMicLevel(level) * gain;
}

export function micLevelToGlowOpacity(
  level: number,
  opts?: { reducedMotion?: boolean; base?: number },
): number {
  const base = opts?.base ?? 0.45;
  const gain = opts?.reducedMotion ? 0.12 : 0.5;
  return Math.min(1, base + clampMicLevel(level) * gain);
}

export function micLevelToParticleCount(
  level: number,
  max: number,
  reducedMotion: boolean,
): number {
  const cap = reducedMotion ? Math.max(2, Math.floor(max * 0.45)) : max;
  const min = reducedMotion ? 1 : 2;
  const count = min + Math.round(clampMicLevel(level) * (cap - min));
  return Math.min(cap, Math.max(min, count));
}
