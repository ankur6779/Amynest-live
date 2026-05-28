/** Semantic tokens for games — reads app CSS variables so light/dark stay in sync. */
export const gameTheme = {
  pageBg: "hsl(var(--background))",
  pageGradient: "linear-gradient(160deg, hsl(var(--background)) 0%, hsl(var(--card)) 55%, hsl(var(--background)) 100%)",
  cardBg: "hsl(var(--card))",
  cardBorder: "hsl(var(--card-border))",
  text: "hsl(var(--foreground))",
  textMuted: "hsl(var(--muted-foreground))",
  textSoft: "hsl(var(--brand-violet-300))",
  accent: "hsl(var(--brand-violet-500))",
  accentSoft: "hsl(var(--brand-violet-300))",
  success: "hsl(var(--brand-green-400))",
  successBg: "rgba(34,197,94,0.18)",
  error: "hsl(var(--brand-red-300))",
  errorBg: "rgba(239,68,68,0.18)",
  progressTrack: "hsl(var(--muted) / 0.35)",
  overlay: "hsl(var(--background) / 0.92)",
  modalBg: "linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
  fontDisplay: "Quicksand, sans-serif",
  glass: "hsl(var(--card) / 0.85)",
  glassBorder: "hsl(var(--card-border) / 0.6)",
} as const;

export type GameThemeTokens = typeof gameTheme;
