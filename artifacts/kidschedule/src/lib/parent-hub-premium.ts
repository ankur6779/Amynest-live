/**
 * Parent Hub premium visual tokens — layout-neutral styling only.
 */

import { cn } from "@/lib/utils";

export const PARENT_HUB_PAGE =
  "parent-hub-premium relative -mx-4 px-4 md:-mx-6 md:px-6";

/** Shared glass surface — all section / panel cards. */
export const HUB_GLASS_SURFACE = cn(
  "rounded-[24px] bg-[rgba(18,28,60,0.72)] backdrop-blur-[18px]",
  "transition-all duration-[220ms] ease-[ease]",
  "hover:-translate-y-0.5",
  "active:scale-[0.985]",
);

export interface HubAccentTheme {
  border: string;
  shadow: string;
  shadowHover: string;
  accentBar: string;
  emojiShell: string;
}

function accentDepth(r: number, g: number, b: number): string {
  return cn(
    `shadow-[0_0_0_1px_rgba(${r},${g},${b},0.25),0_8px_32px_rgba(${r},${g},${b},0.12),0_10px_30px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.04),0_0_24px_rgba(${r},${g},${b},0.10)]`,
  );
}

function accentDepthHover(r: number, g: number, b: number): string {
  return cn(
    `hover:shadow-[0_0_0_1px_rgba(${r},${g},${b},0.30),0_10px_38px_rgba(${r},${g},${b},0.15),0_12px_36px_rgba(0,0,0,0.30),0_0_0_1px_rgba(255,255,255,0.05),0_0_28px_rgba(${r},${g},${b},0.12)]`,
  );
}

function makeTheme(
  border: string,
  bar: string,
  barGlow: string,
  shellBorder: string,
  shellGlow: string,
  r: number,
  g: number,
  b: number,
): HubAccentTheme {
  return {
    border,
    shadow: accentDepth(r, g, b),
    shadowHover: accentDepthHover(r, g, b),
    accentBar: cn("rounded-full", bar, barGlow),
    emojiShell: cn(
      "flex items-center justify-center shrink-0 rounded-xl",
      "bg-[rgba(255,255,255,0.08)] backdrop-blur-md",
      "bg-gradient-to-br from-white/[0.14] via-white/[0.04] to-transparent",
      "border",
      shellBorder,
      "shadow-[inset_0_1px_rgba(255,255,255,0.28)]",
      shellGlow,
    ),
  };
}

/** Section 1 category groups. */
export type HubGroupKey = "today" | "learning" | "creativity" | "stories" | "support";

export const HUB_GROUP_ACCENTS: Record<HubGroupKey, HubAccentTheme> = {
  today: makeTheme(
    "border-[1.5px] border-[rgba(255,184,0,0.55)]",
    "bg-gradient-to-b from-amber-300 via-orange-400 to-amber-500",
    "shadow-[0_0_14px_rgba(255,184,0,0.50)]",
    "border-[rgba(255,184,0,0.45)]",
    "shadow-[0_0_16px_rgba(255,184,0,0.38)]",
    255,
    184,
    0,
  ),
  learning: makeTheme(
    "border-[1.5px] border-[rgba(122,92,255,0.55)]",
    "bg-gradient-to-b from-indigo-400 via-violet-500 to-purple-600",
    "shadow-[0_0_14px_rgba(122,92,255,0.50)]",
    "border-[rgba(122,92,255,0.45)]",
    "shadow-[0_0_16px_rgba(122,92,255,0.38)]",
    122,
    92,
    255,
  ),
  creativity: makeTheme(
    "border-[1.5px] border-[rgba(255,72,212,0.55)]",
    "bg-gradient-to-b from-pink-400 via-fuchsia-500 to-rose-500",
    "shadow-[0_0_14px_rgba(255,72,212,0.50)]",
    "border-[rgba(255,72,212,0.45)]",
    "shadow-[0_0_16px_rgba(255,72,212,0.38)]",
    255,
    72,
    212,
  ),
  stories: makeTheme(
    "border-[1.5px] border-[rgba(0,209,255,0.55)]",
    "bg-gradient-to-b from-cyan-400 via-sky-400 to-blue-500",
    "shadow-[0_0_14px_rgba(0,209,255,0.50)]",
    "border-[rgba(0,209,255,0.45)]",
    "shadow-[0_0_16px_rgba(0,209,255,0.38)]",
    0,
    209,
    255,
  ),
  support: makeTheme(
    "border-[1.5px] border-[rgba(255,64,140,0.55)]",
    "bg-gradient-to-b from-rose-400 via-pink-500 to-rose-600",
    "shadow-[0_0_14px_rgba(255,64,140,0.50)]",
    "border-[rgba(255,64,140,0.45)]",
    "shadow-[0_0_16px_rgba(255,64,140,0.38)]",
    255,
    64,
    140,
  ),
};

export function getHubGroupAccent(key: string): HubAccentTheme {
  return HUB_GROUP_ACCENTS[key as HubGroupKey] ?? HUB_GROUP_ACCENTS.today;
}

/** @deprecated Use getHubGroupAccent — kept for call-site compat. */
export function getHubGroupStyle(key: string): HubAccentTheme {
  return getHubGroupAccent(key);
}

export function hubSectionCardClasses(theme: HubAccentTheme): string {
  return cn(
    HUB_GLASS_SURFACE,
    "relative overflow-hidden p-0 pl-0",
    theme.border,
    theme.shadow,
    theme.shadowHover,
  );
}

export function hubAccentBarClasses(theme: HubAccentTheme): string {
  return cn("w-[5px] shrink-0 self-stretch my-2 ml-1", theme.accentBar);
}

/** Outer panels above/below Section 1. */
export type HubPanelAccentKey = "today-summary" | "previous-stage" | "explore-next";

export const HUB_PANEL_ACCENTS: Record<HubPanelAccentKey, HubAccentTheme> = {
  "today-summary": HUB_GROUP_ACCENTS.today,
  "previous-stage": makeTheme(
    "border-[1.5px] border-[rgba(140,120,255,0.55)]",
    "bg-gradient-to-b from-violet-400 via-indigo-500 to-purple-600",
    "shadow-[0_0_14px_rgba(140,120,255,0.50)]",
    "border-[rgba(140,120,255,0.45)]",
    "shadow-[0_0_16px_rgba(140,120,255,0.38)]",
    140,
    120,
    255,
  ),
  "explore-next": HUB_GROUP_ACCENTS.stories,
};

export function getHubPanelAccent(key: HubPanelAccentKey): HubAccentTheme {
  return HUB_PANEL_ACCENTS[key];
}

// ─── Legacy / inner tiles (learning-progress, chips, etc.) ─────────────────

export const HUB_GLASS_CARD = HUB_GLASS_SURFACE;

export const HUB_HERO_GLOW =
  "shadow-[0_0_24px_rgba(168,85,247,0.18)]";

export const HUB_INFO_BANNER = cn(
  "flex items-start gap-3 rounded-[20px] border border-white/[0.08]",
  "bg-gradient-to-br from-white/[0.04] to-white/[0.02]",
  "px-4 py-3.5 text-left",
  "transition-all duration-[220ms] ease-[ease] active:scale-[0.985]",
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
  "hover:border-white/15 active:scale-[0.985]",
);

/** Collapsed Parent Hub feature tiles — shared header geometry for HubSection + HubLaunchCard. */
export const HUB_FEATURE_TILE_HEADER = cn(
  "w-full flex items-center justify-between gap-3 px-3 py-3 text-left",
  "transition-all duration-[220ms] ease-[ease]",
);

export const HUB_FEATURE_TILE_ICON = cn(
  "w-10 h-10 flex items-center justify-center shrink-0",
);

export const HUB_FEATURE_TILE_TEXT = "min-w-0 flex-1";

export const HUB_FEATURE_TILE_TITLE = cn(
  "font-quicksand font-bold text-[15px] leading-[1.25] text-foreground line-clamp-2 min-h-[2.5rem]",
);

export const HUB_FEATURE_TILE_DESC = cn(
  "text-[12px] text-muted-foreground/80 mt-0.5 line-clamp-2 leading-[1.35] min-h-[2.125rem]",
);

export const HUB_FEATURE_TILE_PREVIEW = cn(
  "px-3 pb-2.5 -mt-0.5 min-h-[1.625rem] flex items-center",
);

export const HUB_FEATURE_TILE_CHEVRON = cn(
  "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
  "border border-white/10 bg-white/[0.05] transition-transform duration-300",
);

/** Launch / link tiles — same collapsed height as HubSection header + preview row. */
export const HUB_FEATURE_TILE_LAUNCH_ROW = cn(
  "flex min-w-0 flex-1 items-center gap-3 p-3 min-h-[6.75rem]",
);

export const HUB_XP_GOLD = "font-semibold text-[#FFD54F] tabular-nums";

export const HUB_PROGRESS_TRACK =
  "relative h-2 w-full overflow-hidden rounded-full bg-white/[0.06]";

export const HUB_PROGRESS_FILL =
  "h-full rounded-full bg-gradient-to-r from-[#FF8A65] via-[#FFB74D] to-[#FFD54F] shadow-[0_0_18px_rgba(255,183,77,0.35)] hub-progress-fill";

export const HUB_COLLAPSIBLE = cn(HUB_GLASS_SURFACE, "overflow-hidden p-0");

export const HUB_SECTION_SHELL = cn(HUB_GLASS_SURFACE, "overflow-hidden p-0");

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
  "border border-white/[0.1] bg-[rgba(18,28,60,0.72)] backdrop-blur-[18px]",
  "shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_rgba(255,255,255,0.06)]",
  "transition-all duration-[220ms] ease-[ease] active:scale-[0.985]",
  "hover:border-white/20 hover:-translate-y-0.5",
);

const QUICK_CHIP_TINTS: Record<string, string> = {
  "ask-amy":
    "hover:shadow-[0_0_20px_rgba(122,92,255,0.28)] border-[rgba(122,92,255,0.35)]",
  story: "hover:shadow-[0_0_20px_rgba(0,209,255,0.25)] border-[rgba(0,209,255,0.35)]",
  routine:
    "hover:shadow-[0_0_20px_rgba(255,184,0,0.25)] border-[rgba(255,184,0,0.35)]",
  articles:
    "hover:shadow-[0_0_18px_rgba(255,64,140,0.2)] border-[rgba(255,64,140,0.30)]",
  emotional:
    "hover:shadow-[0_0_18px_rgba(255,64,140,0.2)] border-[rgba(255,64,140,0.30)]",
  phonics:
    "hover:shadow-[0_0_18px_rgba(122,92,255,0.2)] border-[rgba(122,92,255,0.30)]",
  activities:
    "hover:shadow-[0_0_18px_rgba(255,72,212,0.2)] border-[rgba(255,72,212,0.30)]",
  gaming:
    "hover:shadow-[0_0_18px_rgba(122,92,255,0.18)] border-[rgba(122,92,255,0.28)]",
  worksheets:
    "hover:shadow-[0_0_18px_rgba(255,184,0,0.18)] border-[rgba(255,184,0,0.28)]",
};

export function hubQuickChipTint(actionId: string): string {
  return QUICK_CHIP_TINTS[actionId] ?? "";
}

export const HUB_SEE_ALL_CHIP = cn(
  HUB_QUICK_CHIP,
  "text-amber-200/95 border-[rgba(255,184,0,0.45)]",
  "hover:shadow-[0_0_20px_rgba(255,184,0,0.28)]",
);

export const HUB_EXPLORE_CARD = hubSectionCardClasses(HUB_PANEL_ACCENTS["previous-stage"]);

export const HUB_BOTTOM_CTA = cn(
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
  "text-amber-200/95 border border-amber-400/30",
  "bg-gradient-to-r from-amber-500/15 to-orange-500/10",
  "shadow-[0_0_20px_rgba(251,146,60,0.15)]",
  "transition-all duration-[220ms] ease-[ease] hover:shadow-[0_0_24px_rgba(251,146,60,0.28)] active:scale-[0.985]",
);

const HUB_FEATURE_TILE_ACCENTS: Record<string, HubAccentTheme> = {
  "smart-study": HUB_GROUP_ACCENTS.learning,
  "smart-math-tricks": HUB_GROUP_ACCENTS.today,
  abacus: HUB_GROUP_ACCENTS.stories,
  phonics: HUB_GROUP_ACCENTS.learning,
  "spelling-mastery": makeTheme(
    "border-[1.5px] border-[rgba(52,211,153,0.50)]",
    "bg-gradient-to-b from-emerald-400 via-green-400 to-teal-500",
    "shadow-[0_0_14px_rgba(52,211,153,0.45)]",
    "border-[rgba(52,211,153,0.40)]",
    "shadow-[0_0_14px_rgba(52,211,153,0.32)]",
    52,
    211,
    153,
  ),
  olympiad: HUB_GROUP_ACCENTS.today,
  "amy-ai": HUB_GROUP_ACCENTS.learning,
  "daily-tips": HUB_GROUP_ACCENTS.today,
  "tomorrow-forecast": HUB_GROUP_ACCENTS.stories,
  articles: HUB_GROUP_ACCENTS.learning,
  emotional: HUB_GROUP_ACCENTS.support,
  activities: makeTheme(
    "border-[1.5px] border-[rgba(52,211,153,0.50)]",
    "bg-gradient-to-b from-emerald-400 via-green-400 to-emerald-600",
    "shadow-[0_0_14px_rgba(52,211,153,0.45)]",
    "border-[rgba(52,211,153,0.40)]",
    "shadow-[0_0_14px_rgba(52,211,153,0.32)]",
    52,
    211,
    153,
  ),
  "gaming-rewards": HUB_GROUP_ACCENTS.learning,
  "art-craft": HUB_GROUP_ACCENTS.today,
  worksheets: HUB_GROUP_ACCENTS.stories,
  "story-hub": HUB_GROUP_ACCENTS.creativity,
  "speech-coach": HUB_GROUP_ACCENTS.creativity,
  "ptm-prep": HUB_PANEL_ACCENTS["previous-stage"],
  "life-skills": HUB_GROUP_ACCENTS.stories,
  "coloring-books": HUB_GROUP_ACCENTS.support,
  "fun-sheets": makeTheme(
    "border-[1.5px] border-[rgba(163,230,53,0.50)]",
    "bg-gradient-to-b from-lime-400 via-green-400 to-emerald-500",
    "shadow-[0_0_14px_rgba(163,230,53,0.40)]",
    "border-[rgba(163,230,53,0.38)]",
    "shadow-[0_0_14px_rgba(163,230,53,0.30)]",
    163,
    230,
    53,
  ),
  "event-prep": HUB_GROUP_ACCENTS.today,
  "command-center": HUB_GROUP_ACCENTS.creativity,
  "generate-routine": HUB_GROUP_ACCENTS.stories,
};

export function getHubFeatureTileAccent(tileId: string): HubAccentTheme {
  return HUB_FEATURE_TILE_ACCENTS[tileId] ?? HUB_GROUP_ACCENTS.learning;
}

/** @deprecated */
export function getHubTileAccentBar(tileId: string): string {
  return hubAccentBarClasses(getHubFeatureTileAccent(tileId));
}

/** @deprecated */
export function getHubTileGlow(tileId: string): string {
  return hubSectionCardClasses(getHubFeatureTileAccent(tileId));
}

export const HUB_TILE_SHELL_BASE = hubSectionCardClasses(HUB_GROUP_ACCENTS.learning);

export const HUB_LAUNCH_CARD_BASE = cn(
  HUB_GLASS_SURFACE,
  "group block overflow-hidden p-0 pl-0",
);
