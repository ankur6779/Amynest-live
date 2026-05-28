import type { VisualObjectKind } from "@workspace/math-tricks";

/**
 * Visual identity for each math object kind. `glyph` is used for picture-like
 * objects (apple, candy, star); shape objects (dot, block, bubble) are drawn
 * with CSS so they tint to the per-step brand colour.
 */
export interface ObjectStyle {
  glyph?: string;
  shape: "circle" | "rounded" | "glyph";
  /** Whether the object tints to the container colour (shapes) or keeps its own look (glyphs). */
  tinted: boolean;
}

export const OBJECT_STYLES: Record<VisualObjectKind, ObjectStyle> = {
  dot: { shape: "circle", tinted: true },
  block: { shape: "rounded", tinted: true },
  bubble: { shape: "circle", tinted: true },
  star: { glyph: "⭐", shape: "glyph", tinted: false },
  candy: { glyph: "🍬", shape: "glyph", tinted: false },
  apple: { glyph: "🍎", shape: "glyph", tinted: false },
};

export function objectStyle(kind: VisualObjectKind): ObjectStyle {
  return OBJECT_STYLES[kind] ?? OBJECT_STYLES.dot;
}

/** Object pixel size scales down as a scene gets busier so it always fits. */
export function objectSizeFor(totalObjects: number): number {
  if (totalObjects <= 6) return 34;
  if (totalObjects <= 12) return 28;
  if (totalObjects <= 20) return 22;
  return 18;
}
