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
