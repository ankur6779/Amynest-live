/**
 * Boot debug HUD is opt-in only. Never set VITE_ENABLE_BOOT_HUD on Render/production.
 * Local dev: add VITE_ENABLE_BOOT_HUD=true to .env.development (optional).
 */
export const SHOW_BOOT_HUD =
  import.meta.env.VITE_ENABLE_BOOT_HUD === "true";

/** Vite dev server (hot reload). */
export const IS_DEV = import.meta.env.DEV;

/** Production bundle from `vite build --mode production`. */
export const IS_PROD = import.meta.env.PROD;
