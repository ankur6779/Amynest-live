import type { HubGroupKey } from "@/lib/parent-hub-premium";

export type HubSectionHeaderTheme = {
  tintRgb: string;
  watermark: string;
};

/** Collapsed Parent Hub section header accents — navigation cards only. */
export const HUB_SECTION_HEADER_THEMES: Record<HubGroupKey, HubSectionHeaderTheme> = {
  today: { tintRgb: "255,184,0", watermark: "☀️" },
  learning: { tintRgb: "122,92,255", watermark: "📚" },
  creativity: { tintRgb: "255,72,212", watermark: "🎨" },
  stories: { tintRgb: "251,146,60", watermark: "💬" },
  health: { tintRgb: "52,211,153", watermark: "❤️" },
  parent: { tintRgb: "168,85,247", watermark: "🎮" },
  support: { tintRgb: "96,165,250", watermark: "👨‍👩‍👧" },
};

export function getHubSectionHeaderTheme(key: HubGroupKey): HubSectionHeaderTheme {
  return HUB_SECTION_HEADER_THEMES[key];
}

export function parseSectionTintRgb(tintRgb: string): [number, number, number] {
  const parts = tintRgb.split(",").map((s) => Number(s.trim()));
  const r = parts[0] ?? 129;
  const g = parts[1] ?? 140;
  const b = parts[2] ?? 248;
  return softenSectionAccent(r, g, b);
}

/** Reduce chroma ~15% and lift luminance for elegant, non-neon accents. */
export function softenSectionAccent(r: number, g: number, b: number): [number, number, number] {
  const gray = (r + g + b) / 3;
  const desat = 0.85;
  const lift = 0.06;
  return [
    Math.round(Math.min(255, gray + (r - gray) * desat + (255 - r) * lift)),
    Math.round(Math.min(255, gray + (g - gray) * desat + (255 - g) * lift)),
    Math.round(Math.min(255, gray + (b - gray) * desat + (255 - b) * lift)),
  ];
}
