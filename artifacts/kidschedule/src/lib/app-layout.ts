/** Compact mobile header content row (px) — safe-area inset is additive. */
export const APP_HEADER_HEIGHT_FALLBACK_PX = 56;

/** Extra gap between fixed header and scroll content (px). */
export const APP_HEADER_CONTENT_GAP_PX = 8;

export const APP_HEADER_HEIGHT_CSS_VAR = "--app-header-height";

/** Use in fixed/absolute shells that must start below the mobile app header. */
export const APP_HEADER_HEIGHT_OFFSET = `var(${APP_HEADER_HEIGHT_CSS_VAR}, 3.5rem)`;
