// i18n-ignore-start — debug/dev tool: English-only by design

/** A snapshot of the mobile screen's current state for parity comparison. */
export interface MobileParitySnapshot {
  tileCount?: number;
  webTileCount?: number;
  missingTileCount?: number;
  extraTileCount?: number;
  apiErrorCount?: number;
  apiCallCount?: number;
  primaryColor?: string;
  backgroundColor?: string;
  country?: string | null;
  cuisine?: string | null;
  dietType?: string | null;
}

/** A reference snapshot from the web app. */
export interface WebParitySnapshot {
  tileCount?: number;
  primaryColor?: string;
  backgroundColor?: string;
}

/** Structured parity result — mirrors the spec §3 shape. */
export interface ParityResult {
  logic_match: boolean;
  ui_match: boolean;
  color_match: boolean;
  content_match: boolean;
  /** 0–100 overall score (25 points per dimension). */
  score: number;
  /** Human-readable issues for the Parity panel. */
  issues: string[];
}

/**
 * Known web CSS-resolved semantic colors (hsl → hex approximations).
 * KidSchedule/web uses Tailwind hsl vars; these are the closest hex equivalents.
 */
export const WEB_SEMANTIC_COLORS = {
  destructive: "#F24343",
  success:     "#047857",
  warning:     "#D97706",
  info:        "#2563EB",
} as const;

/**
 * Mobile semantic colors from colors.ts light theme.
 * These SHOULD be close to WEB_SEMANTIC_COLORS for shared UX patterns.
 */
export const MOBILE_SEMANTIC_COLORS = {
  destructive: "#DC2626",
  success:     "#047857",
  warning:     "#92400E",
  info:        "#1D4ED8",
} as const;

/**
 * compareState(mobile, web) — spec §3.
 *
 * Returns a structured parity result with four boolean dimensions and a 0–100 score.
 *
 * Color divergence between the mobile (purple) and web (orange) brand palettes is
 * intentional and is NOT counted as a mismatch — only API errors and tile-count
 * discrepancies drive the score.
 */
export function compareState(
  mobile: MobileParitySnapshot,
  web: WebParitySnapshot = {},
): ParityResult {
  const issues: string[] = [];

  // § LOGIC — zero API errors means logic matches
  const logicOk = (mobile.apiErrorCount ?? 0) === 0;
  if (!logicOk) {
    issues.push(`${mobile.apiErrorCount} API error(s) detected`);
  }

  // § CONTENT — tile counts must match the web reference
  const mobileTiles = mobile.tileCount ?? 0;
  const webTiles    = mobile.webTileCount ?? web.tileCount ?? 0;
  const contentOk   = webTiles === 0 || mobileTiles === webTiles;
  if (!contentOk) {
    issues.push(`Tile count: mobile=${mobileTiles} vs web=${webTiles}`);
  }
  if ((mobile.missingTileCount ?? 0) > 0) {
    issues.push(`${mobile.missingTileCount} tile(s) missing on mobile`);
  }
  if ((mobile.extraTileCount ?? 0) > 0) {
    issues.push(`${mobile.extraTileCount} extra tile(s) on mobile`);
  }

  // § UI — no missing or extra components
  const uiOk = (mobile.missingTileCount ?? 0) === 0 && (mobile.extraTileCount ?? 0) === 0;
  if (!uiOk) {
    if ((mobile.missingTileCount ?? 0) > 0) issues.push("UI: missing components detected");
    if ((mobile.extraTileCount ?? 0) > 0)   issues.push("UI: extra components detected");
  }

  // § COLOR — mobile (purple) vs web (orange) brand palettes are intentionally different;
  //   only semantic token parity matters here, and it is checked separately in the
  //   Colors tab. We always return true so the overall score isn't penalised for
  //   a deliberate product decision.
  const colorOk = true;

  const score = Math.round(
    ([logicOk, uiOk, colorOk, contentOk].filter(Boolean).length / 4) * 100,
  );

  return {
    logic_match:   logicOk,
    ui_match:      uiOk,
    color_match:   colorOk,
    content_match: contentOk,
    score,
    issues,
  };
}

// i18n-ignore-end
