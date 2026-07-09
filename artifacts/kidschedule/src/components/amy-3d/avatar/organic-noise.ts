// Tiny 2D simplex-style noise for organic facial / idle motion.
//
// No dependency — value-noise with smooth Hermite interpolation is enough for
// low-frequency "alive" drift and avoids metronomic sine stacks.
// Every animation layer gets its own seed so phases never lock together.

/** Deterministic hash → [0,1). */
function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return s - Math.floor(s);
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Classic value noise in 2D → roughly [-1, 1]. */
export function valueNoise2D(x: number, y: number, seed = 0): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = fade(x - x0);
  const fy = fade(y - y0);
  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);
  const nx0 = lerp(n00, n10, fx);
  const nx1 = lerp(n01, n11, fx);
  return lerp(nx0, nx1, fy) * 2 - 1;
}

/**
 * Fractal Brownian motion — 2–3 octaves of low-frequency noise.
 * Returns roughly [-1, 1]. Cheap enough for per-frame avatar use.
 */
export function fbm2D(
  x: number,
  y: number,
  seed: number,
  octaves = 3,
): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise2D(x * freq, y * freq, seed + i * 19.1) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return norm > 0 ? sum / norm : 0;
}

/** Independent random phase offsets so layers never start together. */
export interface OrganicPhases {
  breath: number;
  sway: number;
  smile: number;
  eyes: number;
  head: number;
  blink: number;
}

export function createOrganicPhases(): OrganicPhases {
  return {
    breath: Math.random() * 1000,
    sway: Math.random() * 1000,
    smile: Math.random() * 1000,
    eyes: Math.random() * 1000,
    head: Math.random() * 1000,
    blink: Math.random() * 1000,
  };
}

/** Sample a slow organic signal in [-1, 1] with independent phase. */
export function organic(
  t: number,
  phase: number,
  /** Cycles per second — keep low (0.05–0.4) for Pixar-subtle life. */
  hz: number,
  seed: number,
): number {
  return fbm2D(t * hz + phase * 0.01, phase * 0.17, seed, 3);
}
