/**
 * User-facing product branding for Amy Astro Intelligence.
 * Internal APIs, routes, analytics keys, and DB names stay "birth-sky".
 */

export const AMY_ASTRO_PRODUCT_NAME = "Amy Astro Intelligence" as const;
export const AMY_ASTRO_PRODUCT_SHORT = "Amy Astro" as const;
export const AMY_ASTRO_TAGLINE =
  "Your child's cosmic portrait · Birth Sky · Soft parenting insights" as const;
export const AMY_ASTRO_SUBLINE =
  "Premium sky intelligence for parents — reflective, optional, never a prediction." as const;
export const AMY_ASTRO_DISCLAIMER =
  "This is for awareness and reflection, not prediction." as const;
/** Optional static SVG fallback — runtime UI uses inline AmyAstroEmblem. */
export const AMY_ASTRO_ANIMATED_EMBLEM_SRC = "/amy-astro/amy-astro-animated.svg" as const;
/** Hub + in-module Amy art — transparent cutout (matches Parent Hub tile hero). */
export const AMY_ASTRO_TILE_HERO_SRC =
  "/illustrations/amy-astro/amy-astro-hero.png?v=20260727a" as const;
/** Complete 1:1 cosmic-portrait illustration used inside Birth Sky. Source PNG is unchanged. */
export const AMY_ASTRO_TILE_PORTRAIT_SRC =
  "/illustrations/amy-astro/amy-astro-portrait.png?v=20260727a" as const;
/**
 * Lossless WebP siblings of the portrait PNG (source file is not modified).
 * 384w suits the closing seal (~192 CSS px at 2x); 768w is the native hero.
 */
const AMY_ASTRO_PORTRAIT_VARIANT_V = "20260918a";
export const AMY_ASTRO_PORTRAIT_WEBP_SRCSET =
  `/illustrations/amy-astro/amy-astro-portrait-384.webp?v=${AMY_ASTRO_PORTRAIT_VARIANT_V} 384w, /illustrations/amy-astro/amy-astro-portrait-768.webp?v=${AMY_ASTRO_PORTRAIT_VARIANT_V} 768w` as const;
/** CSS sizes matching `.amy-astro-portrait-frame--*` so the browser picks 384 vs 768. */
export const AMY_ASTRO_PORTRAIT_SIZES = {
  hero: "(min-width: 1024px) 20rem, (min-width: 640px) 14rem, min(100vw - 2.5rem, 22rem)",
  closing: "12rem",
  ceremony: "min(17.5rem, 72vw)",
} as const;
/** Inline SVG fallback when the PNG illustration fails to load. */
export const AMY_ASTRO_PORTRAIT_FALLBACK_SRC =
  "/amy-astro/child-cosmic-portrait.svg" as const;
/** @deprecated Prefer AMY_ASTRO_TILE_PORTRAIT_SRC — kept for older static fallbacks. */
export const AMY_ASTRO_COSMIC_PORTRAIT_SRC = AMY_ASTRO_TILE_PORTRAIT_SRC;
