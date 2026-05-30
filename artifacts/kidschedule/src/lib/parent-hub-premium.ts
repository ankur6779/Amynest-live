/**
 * Parent Hub premium visual tokens — layout-neutral styling only.
 */

import { cn } from "@/lib/utils";

export const PARENT_HUB_PAGE =
  "parent-hub-premium relative -mx-4 px-4 md:-mx-6 md:px-6";

export const HUB_GLASS_CARD = cn(
  "rounded-[24px] border border-white/[0.08]",
  "bg-[rgba(18,28,58,0.82)] backdrop-blur-[20px]",
  "shadow-[0_8px_30px_rgba(0,0,0,0.25),inset_0_1px_rgba(255,255,255,0.05)]",
  "transition-all duration-[220ms] ease-[ease]",
  "active:scale-[1.015]",
);

export const HUB_HERO_GLOW =
  "shadow-[0_0_24px_rgba(168,85,247,0.18)]";

export const HUB_INFO_BANNER = cn(
  "flex items-start gap-3 rounded-[20px] border border-white/[0.08]",
  "bg-gradient-to-br from-white/[0.04] to-white/[0.02]",
  "px-4 py-3.5 text-left",
  "transition-all duration-[220ms] ease-[ease] active:scale-[1.015]",
);

export const HUB_SECTION_TITLE =
  "font-quicksand text-[22px] font-bold tracking-tight text-foreground";

export const HUB_CARD_TITLE =
  "font-quicksand text-lg font-semibold text-foreground leading-snug";

export const HUB_BODY =
  "text-sm leading-relaxed text-muted-foreground opacity-75 mt-1";

export const HUB_TILE = cn(
  "flex items-center gap-3 rounded-xl border border-white/[0.08]",
  "bg-gradient-to-br from-white/[0.04] to-white/[0.02]",
  "px-3 py-2.5",
  "transition-all duration-[220ms] ease-[ease]",
  "hover:border-white/15 active:scale-[1.02]",
);

export const HUB_XP_GOLD = "font-semibold text-[#FFD54F] tabular-nums";

export const HUB_PROGRESS_TRACK =
  "relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]";

export const HUB_PROGRESS_FILL =
  "h-full rounded-full bg-gradient-to-r from-[#FF8A65] via-[#FFB74D] to-[#FFD54F] shadow-[0_0_18px_rgba(255,183,77,0.35)] hub-progress-fill";

export const HUB_COLLAPSIBLE = cn(
  HUB_GLASS_CARD,
  "overflow-hidden p-0 active:scale-100",
);

export const HUB_SECTION_SHELL = cn(
  HUB_GLASS_CARD,
  "overflow-hidden p-0 active:scale-100",
);

const CHIP_TINTS: Record<string, string> = {
  math: "border-violet-400/25 bg-violet-500/[0.08] shadow-[0_0_16px_rgba(168,85,247,0.12)]",
  numbers: "border-violet-400/25 bg-violet-500/[0.08] shadow-[0_0_16px_rgba(168,85,247,0.12)]",
  rhymes: "border-violet-400/25 bg-violet-500/[0.08] shadow-[0_0_16px_rgba(168,85,247,0.12)]",
  phonics: "border-sky-400/25 bg-sky-500/[0.08] shadow-[0_0_16px_rgba(56,189,248,0.12)]",
  alphabets: "border-sky-400/25 bg-sky-500/[0.08] shadow-[0_0_16px_rgba(56,189,248,0.12)]",
  speech: "border-sky-400/25 bg-sky-500/[0.08] shadow-[0_0_16px_rgba(56,189,248,0.12)]",
  stories: "border-orange-400/25 bg-orange-500/[0.08] shadow-[0_0_16px_rgba(251,146,60,0.14)]",
  puzzles: "border-emerald-400/25 bg-emerald-500/[0.08] shadow-[0_0_16px_rgba(52,211,153,0.1)]",
  worksheets: "border-amber-400/25 bg-amber-500/[0.08] shadow-[0_0_16px_rgba(251,191,36,0.1)]",
  lifeSkills: "border-rose-400/25 bg-rose-500/[0.08] shadow-[0_0_16px_rgba(244,114,182,0.1)]",
  general: "border-white/[0.08] bg-white/[0.05] shadow-[0_0_12px_rgba(255,255,255,0.04)]",
};

export function hubChipTint(section: string): string {
  return CHIP_TINTS[section] ?? CHIP_TINTS.general;
}

export function hubChipTintFromEmoji(emoji: string): string {
  if (emoji.includes("🎵") || emoji.includes("🔢")) return CHIP_TINTS.numbers;
  if (emoji.includes("🔤") || emoji.includes("abc") || emoji.includes("🗣")) return CHIP_TINTS.phonics;
  if (emoji.includes("📖") || emoji.includes("📚") || emoji.includes("📘")) return CHIP_TINTS.stories;
  return CHIP_TINTS.general;
}

/** Section 1 category group — glass card + colorful accent bar + glow. */
export type HubGroupKey = "today" | "learning" | "creativity" | "stories" | "support";

export interface HubGroupStyle {
  accentBar: string;
  emojiShell: string;
  cardGlow: string;
  openGlow: string;
}

export const HUB_GROUP_STYLES: Record<HubGroupKey, HubGroupStyle> = {
  today: {
    accentBar: "bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500",
    emojiShell:
      "bg-gradient-to-br from-amber-400/35 to-orange-500/20 ring-1 ring-amber-300/30 shadow-[0_0_18px_rgba(251,146,60,0.4)]",
    cardGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(251,191,36,0.12)]",
    openGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_28px_rgba(251,146,60,0.22)]",
  },
  learning: {
    accentBar: "bg-gradient-to-b from-indigo-400 via-violet-500 to-indigo-600",
    emojiShell:
      "bg-gradient-to-br from-indigo-400/35 to-violet-600/20 ring-1 ring-indigo-300/30 shadow-[0_0_18px_rgba(129,140,248,0.4)]",
    cardGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(129,140,248,0.14)]",
    openGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_28px_rgba(168,85,247,0.22)]",
  },
  creativity: {
    accentBar: "bg-gradient-to-b from-pink-400 via-fuchsia-500 to-rose-500",
    emojiShell:
      "bg-gradient-to-br from-pink-400/35 to-fuchsia-600/20 ring-1 ring-pink-300/30 shadow-[0_0_18px_rgba(236,72,153,0.4)]",
    cardGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(236,72,153,0.14)]",
    openGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_28px_rgba(236,72,153,0.22)]",
  },
  stories: {
    accentBar: "bg-gradient-to-b from-sky-400 via-cyan-400 to-blue-500",
    emojiShell:
      "bg-gradient-to-br from-sky-400/35 to-blue-500/20 ring-1 ring-sky-300/30 shadow-[0_0_18px_rgba(56,189,248,0.4)]",
    cardGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(56,189,248,0.14)]",
    openGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_28px_rgba(56,189,248,0.22)]",
  },
  support: {
    accentBar: "bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600",
    emojiShell:
      "bg-gradient-to-br from-rose-400/35 to-pink-600/20 ring-1 ring-rose-300/30 shadow-[0_0_18px_rgba(244,114,182,0.4)]",
    cardGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(244,114,182,0.14)]",
    openGlow: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_28px_rgba(244,114,182,0.22)]",
  },
};

export function getHubGroupStyle(key: string): HubGroupStyle {
  return HUB_GROUP_STYLES[key as HubGroupKey] ?? HUB_GROUP_STYLES.today;
}

export const HUB_SECTION_LABEL =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90";

export const HUB_AGE_BADGE = cn(
  "rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0 h-5",
  "font-semibold text-[10px] text-foreground/90",
  "shadow-[0_0_12px_rgba(168,85,247,0.12)]",
);

export const HUB_QUICK_CHIP = cn(
  "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-2",
  "text-xs font-bold text-foreground",
  "border border-white/[0.1] bg-[rgba(18,28,58,0.72)] backdrop-blur-[16px]",
  "shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_rgba(255,255,255,0.06)]",
  "transition-all duration-[220ms] ease-[ease] active:scale-[1.03]",
  "hover:border-white/20 hover:shadow-[0_0_18px_rgba(168,85,247,0.18)]",
);

const QUICK_CHIP_TINTS: Record<string, string> = {
  "ask-amy":
    "hover:shadow-[0_0_20px_rgba(168,85,247,0.28)] border-violet-400/25 bg-violet-500/[0.08]",
  story: "hover:shadow-[0_0_20px_rgba(56,189,248,0.25)] border-sky-400/25 bg-sky-500/[0.08]",
  routine:
    "hover:shadow-[0_0_20px_rgba(251,146,60,0.25)] border-amber-400/25 bg-amber-500/[0.08]",
  articles:
    "hover:shadow-[0_0_18px_rgba(244,114,182,0.2)] border-rose-400/20 bg-rose-500/[0.06]",
  emotional:
    "hover:shadow-[0_0_18px_rgba(244,114,182,0.2)] border-rose-400/20 bg-rose-500/[0.06]",
  phonics:
    "hover:shadow-[0_0_18px_rgba(129,140,248,0.2)] border-indigo-400/20 bg-indigo-500/[0.06]",
  activities:
    "hover:shadow-[0_0_18px_rgba(236,72,153,0.2)] border-pink-400/20 bg-pink-500/[0.06]",
  gaming:
    "hover:shadow-[0_0_18px_rgba(52,211,153,0.18)] border-emerald-400/20 bg-emerald-500/[0.06]",
  worksheets:
    "hover:shadow-[0_0_18px_rgba(251,191,36,0.18)] border-amber-400/20 bg-amber-500/[0.06]",
};

export function hubQuickChipTint(actionId: string): string {
  return QUICK_CHIP_TINTS[actionId] ?? "";
}

export const HUB_SEE_ALL_CHIP = cn(
  HUB_QUICK_CHIP,
  "text-amber-200/95 border-amber-400/35 bg-amber-500/[0.08]",
  "hover:shadow-[0_0_20px_rgba(251,191,36,0.28)]",
);

export const HUB_EXPLORE_CARD = cn(
  HUB_GLASS_CARD,
  "overflow-hidden p-0 active:scale-100",
  "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_18px_rgba(168,85,247,0.12)]",
);

export const HUB_BOTTOM_CTA = cn(
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
  "text-amber-200/95 border border-amber-400/30",
  "bg-gradient-to-r from-amber-500/15 to-orange-500/10",
  "shadow-[0_0_20px_rgba(251,146,60,0.15)]",
  "transition-all duration-[220ms] ease-[ease] hover:shadow-[0_0_24px_rgba(251,146,60,0.28)] active:scale-[1.02]",
);

/** Outer panels above/below Section 1 groups. */
export type HubPanelAccentKey = "today-summary" | "previous-stage" | "explore-next";

export const HUB_PANEL_ACCENTS: Record<
  HubPanelAccentKey,
  { bar: string; shell: string; emojiShell: string }
> = {
  "today-summary": {
    bar: "bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500",
    shell:
      "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_22px_rgba(251,191,36,0.16)]",
    emojiShell:
      "bg-gradient-to-br from-amber-400/35 to-orange-500/20 ring-1 ring-amber-300/30 shadow-[0_0_16px_rgba(251,146,60,0.35)]",
  },
  "previous-stage": {
    bar: "bg-gradient-to-b from-slate-400 via-violet-500 to-indigo-600",
    shell:
      "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_22px_rgba(129,140,248,0.16)]",
    emojiShell:
      "bg-gradient-to-br from-slate-400/30 to-violet-600/20 ring-1 ring-violet-300/25 shadow-[0_0_16px_rgba(168,85,247,0.3)]",
  },
  "explore-next": {
    bar: "bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500",
    shell:
      "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_22px_rgba(56,189,248,0.14)]",
    emojiShell:
      "bg-gradient-to-br from-cyan-400/35 to-blue-500/20 ring-1 ring-cyan-300/30 shadow-[0_0_16px_rgba(56,189,248,0.32)]",
  },
};

const HUB_TILE_ACCENT_BARS: Record<string, string> = {
  "smart-study": "bg-gradient-to-b from-indigo-400 via-violet-500 to-blue-600",
  "smart-math-tricks": "bg-gradient-to-b from-orange-400 via-amber-400 to-orange-500",
  abacus: "bg-gradient-to-b from-teal-400 via-cyan-400 to-teal-600",
  phonics: "bg-gradient-to-b from-blue-400 via-indigo-400 to-blue-600",
  "spelling-mastery": "bg-gradient-to-b from-emerald-400 via-green-400 to-teal-500",
  "gaming-rewards": "bg-gradient-to-b from-violet-400 via-purple-500 to-fuchsia-600",
  olympiad: "bg-gradient-to-b from-yellow-400 via-amber-400 to-orange-500",
  "amy-ai": "bg-gradient-to-b from-violet-400 via-purple-500 to-fuchsia-600",
  "daily-tips": "bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500",
  "tomorrow-forecast": "bg-gradient-to-b from-sky-400 via-cyan-400 to-blue-500",
  articles: "bg-gradient-to-b from-blue-400 via-indigo-500 to-indigo-600",
  emotional: "bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600",
  "new-parent-tips": "bg-gradient-to-b from-rose-300 via-pink-400 to-rose-500",
  activities: "bg-gradient-to-b from-emerald-400 via-green-400 to-emerald-600",
  "art-craft": "bg-gradient-to-b from-orange-400 via-red-400 to-orange-600",
  worksheets: "bg-gradient-to-b from-sky-400 via-indigo-400 to-blue-500",
  "story-hub": "bg-gradient-to-b from-purple-400 via-fuchsia-500 to-purple-600",
  "speech-coach": "bg-gradient-to-b from-violet-400 via-fuchsia-500 to-pink-500",
  "ptm-prep": "bg-gradient-to-b from-slate-400 via-blue-500 to-indigo-600",
  "life-skills": "bg-gradient-to-b from-emerald-400 via-cyan-400 to-teal-500",
  "coloring-books": "bg-gradient-to-b from-pink-400 via-rose-400 to-pink-600",
  "fun-sheets": "bg-gradient-to-b from-lime-400 via-green-400 to-emerald-500",
  "event-prep": "bg-gradient-to-b from-amber-400 via-orange-400 to-amber-600",
  "command-center": "bg-gradient-to-b from-fuchsia-400 via-purple-500 to-violet-600",
  "generate-routine": "bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-500",
};

const HUB_TILE_GLOW: Record<string, string> = {
  "smart-study":
    "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(129,140,248,0.22)]",
  "smart-math-tricks":
    "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(251,146,60,0.18)]",
  abacus: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(45,212,191,0.18)]",
  phonics: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(96,165,250,0.18)]",
  olympiad: "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_20px_rgba(250,204,21,0.18)]",
};

export function getHubTileAccentBar(tileId: string): string {
  return HUB_TILE_ACCENT_BARS[tileId] ?? "bg-gradient-to-b from-indigo-400 via-violet-500 to-indigo-600";
}

export function getHubTileGlow(tileId: string): string {
  return (
    HUB_TILE_GLOW[tileId] ??
    "shadow-[0_8px_30px_rgba(0,0,0,0.25),0_0_16px_rgba(168,85,247,0.12)]"
  );
}

export const HUB_TILE_SHELL_BASE = cn(
  "relative overflow-hidden rounded-[24px] border border-white/[0.08]",
  "backdrop-blur-[20px] transition-all duration-[220ms] ease-[ease]",
  "hover:shadow-[0_0_20px_rgba(168,85,247,0.12)]",
);

export const HUB_LAUNCH_CARD_BASE = cn(
  "group block rounded-[24px] border border-white/[0.12] p-4",
  "backdrop-blur-[20px] transition-all duration-[220ms] ease-[ease]",
  "hover:border-white/25 active:scale-[1.015]",
);
