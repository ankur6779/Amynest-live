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
  "/illustrations/amy-astro/amy-astro-hero.png?v=20260726c" as const;
/** Soft circular portrait derived from the same tile Amy art. */
export const AMY_ASTRO_TILE_PORTRAIT_SRC =
  "/illustrations/amy-astro/amy-astro-portrait.png?v=20260726c" as const;
/** @deprecated Prefer AMY_ASTRO_TILE_PORTRAIT_SRC — kept for older static fallbacks. */
export const AMY_ASTRO_COSMIC_PORTRAIT_SRC = AMY_ASTRO_TILE_PORTRAIT_SRC;
