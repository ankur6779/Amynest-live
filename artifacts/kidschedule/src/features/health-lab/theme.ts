import { cn } from "@/lib/utils";

/** Amy Health Lab™ visual tokens — Science Lab + Space Academy */
export const HEALTH_LAB_THEME = {
  pageBg:
    "bg-gradient-to-b from-[#0a0f2e] via-[#121a45] to-[#0d1230]",
  heroGradient:
    "bg-gradient-to-br from-violet-600/40 via-indigo-600/30 to-cyan-500/20",
  cardGlass:
    "rounded-2xl border border-white/[0.12] bg-white/[0.06] backdrop-blur-xl shadow-[0_12px_40px_-12px_rgba(99,102,241,0.4)]",
  cardGlow:
    "shadow-[0_0_24px_-4px_rgba(139,92,246,0.45)]",
  ctaPrimary:
    "bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-white font-bold shadow-[0_4px_20px_-4px_rgba(251,146,60,0.55)] active:scale-[0.97] transition-transform",
  ctaSecondary:
    "bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/15 active:scale-[0.97] transition-all",
  textPrimary: "text-white",
  textMuted: "text-violet-200/70",
  accentViolet: "text-violet-300",
  accentAmber: "text-amber-300",
  metricFocus: "from-violet-500 to-purple-600",
  metricBalance: "from-pink-500 to-rose-500",
  metricCalm: "from-teal-400 to-cyan-500",
  metricCoord: "from-amber-400 to-orange-500",
  metricConsistency: "from-indigo-400 to-blue-500",
} as const;

export const HEALTH_LAB_SHELL = cn(
  "relative min-h-[100dvh] overflow-x-hidden",
  HEALTH_LAB_THEME.pageBg,
  "text-white",
);

export const HEALTH_LAB_HERO = cn(
  HEALTH_LAB_THEME.cardGlass,
  HEALTH_LAB_THEME.heroGradient,
  HEALTH_LAB_THEME.cardGlow,
  "p-5 sm:p-6",
);

export const HEALTH_LAB_GAME_BTN = cn(
  "relative overflow-hidden rounded-[1.25rem] p-4 text-left",
  "border transition-all duration-300 ease-out",
  "active:scale-[0.985]",
  "min-h-[92px] touch-manipulation",
);

export const HEALTH_LAB_SECTION_TITLE = cn(
  "text-sm font-semibold tracking-tight text-white",
);

export const HEALTH_LAB_SECTION_EYEBROW = cn(
  "text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/60",
);

export const HEALTH_LAB_TOUCH_TARGET = "min-h-[48px] min-w-[48px] touch-manipulation";
