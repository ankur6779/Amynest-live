/**
 * V2 lighting — Constitution §5 (P0.5).
 * Morning · Evening · Night only. Illumination, not animation.
 */

import "./nest-presence-system.css";
import "./v2-lighting.css";
import {
  V2_LIGHT,
  type V2LightPreset,
} from "./constitution";

export { V2_LIGHT, type V2LightPreset };

/** Nest field ambient layer (applied on shells). */
export const V2_LIGHT_FIELD = "v2-light-field";

/** Bloom CTA — light escaping warm surface. */
export const V2_BLOOM_LIGHT = "v2-bloom-light";

/** Orb ambient emit — no neon halo. */
export const V2_ORB_EMIT = "v2-orb-emit";

/** Sheet Glass catch light. */
export const V2_SHEET_LIGHT = "v2-sheet-light";

/** Hero hierarchy explained by light. */
export const V2_HERO_LIGHT = "v2-hero-light";

/** Focus rim from active preset. */
export const V2_FOCUS_LIGHT = "v2-focus-light";

/**
 * Resolve hour → preset. Same world, different hour.
 * Morning 05–11 · Evening 12–18 · Night 19–04.
 */
export function resolveV2LightPreset(now: Date = new Date()): V2LightPreset {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return V2_LIGHT.morning;
  if (hour >= 12 && hour < 19) return V2_LIGHT.evening;
  return V2_LIGHT.night;
}

let sessionPreset: V2LightPreset | null = null;

/** One preset per session — light does not flicker mid-journey. */
export function getV2SessionLightPreset(): V2LightPreset {
  if (!sessionPreset) {
    sessionPreset = resolveV2LightPreset();
  }
  return sessionPreset;
}

/** Test-only reset. */
export function resetV2SessionLightForTests(): void {
  sessionPreset = null;
}

/** Install preset on documentElement for CSS variable cascade. */
export function installV2Light(preset: V2LightPreset = getV2SessionLightPreset()): V2LightPreset {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-v2-light", preset);
  }
  sessionPreset = preset;
  return preset;
}

/**
 * Shell props — lighting field + data attribute.
 * Does not alter spacing / materials / type tokens.
 */
export function v2LitProps(
  className: string,
  preset: V2LightPreset = getV2SessionLightPreset(),
): {
  className: string;
  "data-v2-light": V2LightPreset;
} {
  installV2Light(preset);
  const withField = className.includes(V2_LIGHT_FIELD)
    ? className
    : `${className} ${V2_LIGHT_FIELD}`;
  return {
    className: withField,
    "data-v2-light": preset,
  };
}
