/**
 * Gaming Hub layout design tokens — replace magic numbers in game UIs.
 * All play surfaces should size from these + measured container width.
 */

export const GAME_LAYOUT = {
  /** Play modal max width (px). */
  modalMaxWidth: 440,
  /** Horizontal padding inside modal content (px). */
  modalPaddingX: 18,
  /** Vertical padding inside modal (px). */
  modalPaddingY: 16,
  /** Overlay inset around modal (px) — also use with safe-area. */
  overlayPadding: 16,
  /** Minimum interactive touch target (px) — WCAG 2.5.5 / Apple HIG. */
  touchMin: 44,
  /** Comfortable choice target for limited motor control (px). */
  touchComfort: 48,
  /** Comfortable minimum for dense puzzle cells when space is tight. */
  cellMinDense: 28,
  /** Preferred puzzle cell size when space allows. */
  cellMaxComfort: 56,
  /** Gap between grid cells (px). */
  gridGap: 6,
  /** Inner padding around a puzzle grid (px). */
  gridPadding: 6,
  /** Stack dual panels (e.g. Spot Diff) below this content width. */
  stackPanelsBelow: 360,
  /** Target Tap arena height bounds (px) and viewport fraction. */
  arenaMinHeight: 180,
  arenaMaxHeight: 320,
  arenaHeightVh: 0.42,
  /** Choice / answer grids max fraction of content width. */
  choiceGridMaxFraction: 0.92,
  choiceGridMaxPx: 300,
  /** Pattern / sequence chip preferred size. */
  chipMin: 40,
  chipMax: 48,
  /** Progress bar track height. */
  progressHeight: 6,
  /** Modal close control size. */
  closeButton: 44,
  /** Breakpoints used for hub / game responsive checks (px). */
  breakpoints: {
    xs: 320,
    sm: 360,
    md: 375,
    lg: 390,
    xl: 412,
    xxl: 430,
    tablet: 768,
  },
} as const;

export type GameLayoutTokens = typeof GAME_LAYOUT;

/** Fit equal square cells into a container without overflow. */
export function fitGridCellSize(opts: {
  containerWidth: number;
  columns: number;
  gap?: number;
  padding?: number;
  minCell?: number;
  maxCell?: number;
  /** Extra chrome (borders) subtracted from usable width. */
  chrome?: number;
}): number {
  const {
    containerWidth,
    columns,
    gap = GAME_LAYOUT.gridGap,
    padding = GAME_LAYOUT.gridPadding,
    minCell = GAME_LAYOUT.cellMinDense,
    maxCell = GAME_LAYOUT.cellMaxComfort,
    chrome = 0,
  } = opts;
  if (columns <= 0 || !Number.isFinite(containerWidth) || containerWidth <= 0) {
    return minCell;
  }
  const usable = Math.max(0, containerWidth - padding * 2 - chrome - gap * (columns - 1));
  const raw = Math.floor(usable / columns);
  return Math.max(minCell, Math.min(maxCell, raw));
}

/** Arena height that never exceeds the viewport fraction. */
export function fitArenaHeight(opts?: {
  viewportHeight?: number;
  min?: number;
  max?: number;
  vhFraction?: number;
}): number {
  const vh =
    opts?.viewportHeight ??
    (typeof window !== "undefined" ? window.innerHeight : 640);
  const min = opts?.min ?? GAME_LAYOUT.arenaMinHeight;
  const max = opts?.max ?? GAME_LAYOUT.arenaMaxHeight;
  const fraction = opts?.vhFraction ?? GAME_LAYOUT.arenaHeightVh;
  return Math.round(Math.max(min, Math.min(max, vh * fraction)));
}

/** Cap a choice/answer grid to content width. */
export function fitChoiceGridMaxWidth(
  containerWidth: number,
  preferredMax: number = GAME_LAYOUT.choiceGridMaxPx,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return preferredMax;
  return Math.min(preferredMax, Math.floor(containerWidth * GAME_LAYOUT.choiceGridMaxFraction));
}

/** Font size scaled to cell size (emoji / glyph tiles). */
export function fitCellFontSize(cellSize: number, ratio = 0.48): number {
  return Math.max(12, Math.round(cellSize * ratio));
}

/** Ensure a control meets minimum touch target via padding box. */
export function touchBoxStyle(min = GAME_LAYOUT.touchMin): {
  minWidth: number;
  minHeight: number;
} {
  return { minWidth: min, minHeight: min };
}
