/** Semantic tokens for games — aligned with Parent Hub premium glass surfaces. */
export const gameTheme = {
  pageBg: "transparent",
  pageGradient: "transparent",
  cardBg: "rgba(18,28,60,0.72)",
  cardBorder: "rgba(122,92,255,0.35)",
  text: "hsl(var(--foreground))",
  textMuted: "hsl(var(--muted-foreground))",
  textSoft: "rgba(167,139,250,0.9)",
  accent: "rgba(122,92,255,1)",
  accentSoft: "rgba(167,139,250,0.85)",
  accentAmber: "rgba(255,184,0,1)",
  success: "hsl(var(--brand-green-400))",
  successBg: "rgba(34,197,94,0.18)",
  error: "hsl(var(--brand-red-300))",
  errorBg: "rgba(239,68,68,0.18)",
  progressTrack: "rgba(255,255,255,0.06)",
  overlay: "rgba(7,17,38,0.92)",
  modalBg: "linear-gradient(180deg, rgba(18,28,60,0.98) 0%, rgba(11,23,48,0.98) 100%)",
  fontDisplay: "Quicksand, sans-serif",
  glass: "rgba(18,28,60,0.72)",
  glassBorder: "rgba(255,255,255,0.08)",
  /** Primary CTA — Parent Hub amber. */
  ctaGradient: "linear-gradient(135deg, rgba(255,184,0,0.95), rgba(251,146,60,0.95))",
  playGradient: "linear-gradient(135deg, rgba(255,184,0,0.95), rgba(251,146,60,0.95))",
  playShadow: "0 4px 12px rgba(255,184,0,0.35)",
  /** Secondary accent — Parent Hub learning violet. */
  violetGradient: "linear-gradient(135deg, rgba(122,92,255,0.95), rgba(168,85,247,0.95))",
  violetShadow: "0 4px 12px rgba(122,92,255,0.35)",
  hubBorderActive: "rgba(255,184,0,0.55)",
  hubChipActive: "rgba(255,184,0,0.14)",
} as const;

export type GameThemeTokens = typeof gameTheme;
