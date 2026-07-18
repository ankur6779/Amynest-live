import { cn } from "@/lib/utils";
import { HUB_GLASS_SURFACE, getHubGroupAccent } from "@/lib/parent-hub-premium";

const creativityAccent = getHubGroupAccent("creativity");

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
  /** Soft caution — prefer over harsh red for child-facing misses / limits. */
  warn: "hsl(var(--brand-amber-200))",
  warnBg: "rgba(251,191,36,0.16)",
  error: "hsl(var(--brand-red-300))",
  errorBg: "rgba(239,68,68,0.18)",
  progressTrack: "rgba(255,255,255,0.06)",
  overlay: "rgba(7,17,38,0.92)",
  modalBg: "linear-gradient(180deg, rgba(18,28,60,0.98) 0%, rgba(11,23,48,0.98) 100%)",
  fontDisplay: "Quicksand, sans-serif",
  glass: "rgba(18,28,60,0.72)",
  glassBorder: "rgba(255,255,255,0.10)",
  /** Radius scale — one family. */
  radiusCard: 16,
  radiusDialog: 24,
  radiusPill: 999,
  /** Depth */
  dialogShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
  cardShadow: "0 8px 28px rgba(0,0,0,0.28)",
  /** Primary CTA — Parent Hub amber. */
  ctaGradient: "linear-gradient(135deg, rgba(255,184,0,0.95), rgba(251,146,60,0.95))",
  playGradient: "linear-gradient(135deg, rgba(255,184,0,0.95), rgba(251,146,60,0.95))",
  playShadow: "0 4px 14px rgba(255,184,0,0.38)",
  /** Secondary accent — Parent Hub learning violet. */
  violetGradient: "linear-gradient(135deg, rgba(122,92,255,0.95), rgba(168,85,247,0.95))",
  violetShadow: "0 4px 12px rgba(122,92,255,0.35)",
  hubBorderActive: "rgba(255,184,0,0.55)",
  hubChipActive: "rgba(255,184,0,0.14)",
  /** Type rhythm */
  type: {
    hero: "clamp(1.25rem, 4.5vw, 1.5rem)",
    title: "clamp(1.05rem, 3.8vw, 1.2rem)",
    body: "clamp(0.8125rem, 3.2vw, 0.9375rem)",
    label: "0.6875rem",
    micro: "0.625rem",
  },
} as const;

export type GameThemeTokens = typeof gameTheme;

/** Sticky games header — creativity hub accent + glass depth. */
export const GAMES_HEADER_SHELL = cn(
  "sticky top-0 z-20 -mx-3 px-3 py-3.5 sm:-mx-6 sm:px-6",
  HUB_GLASS_SURFACE,
  "rounded-none border-x-0 border-t-0",
  creativityAccent.border,
  creativityAccent.shadow,
  "border-b border-white/[0.08]",
);

/** Round icon control used in games chrome — 44×44 touch target. */
export const GAMES_ICON_BUTTON = cn(
  "game-motion-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
  "border border-violet-500/25 bg-violet-500/15 text-violet-200",
  "transition-colors duration-200",
  "hover:border-fuchsia-400/40 hover:bg-fuchsia-500/15",
  "active:scale-[0.96]",
);

/** Shared glass panel — matches Parent Hub section cards. */
export const GAMES_GLASS_PANEL = cn(
  HUB_GLASS_SURFACE,
  "border border-white/[0.08]",
  creativityAccent.shadow,
);

/** Per-category accent bars + emoji shells for game cards. */
export const GAMES_CATEGORY_ACCENT: Record<
  string,
  { bar: string; shell: string; chip: string }
> = {
  brain: {
    bar: "bg-gradient-to-b from-violet-400 via-purple-500 to-violet-600 shadow-[0_0_14px_rgba(167,139,250,0.50)]",
    shell: "border-violet-400/45 shadow-[0_0_16px_rgba(167,139,250,0.38)]",
    chip: "bg-violet-500/20 text-violet-200 border-violet-400/30",
  },
  memory: {
    bar: "bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-500 shadow-[0_0_14px_rgba(96,165,250,0.50)]",
    shell: "border-sky-400/45 shadow-[0_0_16px_rgba(96,165,250,0.38)]",
    chip: "bg-sky-500/20 text-sky-200 border-sky-400/30",
  },
  math: {
    bar: "bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500 shadow-[0_0_14px_rgba(251,191,36,0.50)]",
    shell: "border-amber-400/45 shadow-[0_0_16px_rgba(251,191,36,0.38)]",
    chip: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  },
  focus: {
    bar: "bg-gradient-to-b from-emerald-400 via-teal-500 to-green-500 shadow-[0_0_14px_rgba(52,211,153,0.50)]",
    shell: "border-emerald-400/45 shadow-[0_0_16px_rgba(52,211,153,0.38)]",
    chip: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
  },
  creativity: {
    bar: "bg-gradient-to-b from-pink-400 via-fuchsia-500 to-rose-500 shadow-[0_0_14px_rgba(244,114,182,0.50)]",
    shell: "border-fuchsia-400/45 shadow-[0_0_16px_rgba(244,114,182,0.38)]",
    chip: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30",
  },
  behavior: {
    bar: "bg-gradient-to-b from-lime-400 via-green-500 to-emerald-500 shadow-[0_0_14px_rgba(74,222,128,0.50)]",
    shell: "border-green-400/45 shadow-[0_0_16px_rgba(74,222,128,0.38)]",
    chip: "bg-green-500/20 text-green-200 border-green-400/30",
  },
  action: {
    bar: "bg-gradient-to-b from-orange-400 via-amber-500 to-orange-600 shadow-[0_0_14px_rgba(251,146,60,0.50)]",
    shell: "border-orange-400/45 shadow-[0_0_16px_rgba(251,146,60,0.38)]",
    chip: "bg-orange-500/20 text-orange-200 border-orange-400/30",
  },
  puzzle: {
    bar: "bg-gradient-to-b from-indigo-400 via-violet-500 to-purple-600 shadow-[0_0_14px_rgba(129,140,248,0.50)]",
    shell: "border-indigo-400/45 shadow-[0_0_16px_rgba(129,140,248,0.38)]",
    chip: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
  },
};

/** @deprecated Prefer GameEmojiBadge — kept for any remaining className consumers. */
export function gamesEmojiShell(category: string): string {
  const accent = GAMES_CATEGORY_ACCENT[category] ?? GAMES_CATEGORY_ACCENT.brain;
  return cn(
    "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-[2rem] leading-none",
    "bg-[rgba(255,255,255,0.08)] backdrop-blur-md",
    "bg-gradient-to-br from-white/[0.16] via-white/[0.05] to-transparent",
    "border shadow-[inset_0_1px_rgba(255,255,255,0.28),0_6px_18px_rgba(0,0,0,0.22)]",
    accent.shell,
  );
}

export function gamesCategoryBar(category: string): string {
  const accent = GAMES_CATEGORY_ACCENT[category] ?? GAMES_CATEGORY_ACCENT.brain;
  return cn("w-[5px] shrink-0 self-stretch rounded-full", accent.bar);
}
