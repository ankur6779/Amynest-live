/**
 * Event Prep Zone — visual tokens aligned with Parent Hub premium glass theme.
 */

import { cn } from "@/lib/utils";
import {
  getHubFeatureTileAccent,
  HUB_GLASS_SURFACE,
  HUB_INFO_BANNER,
  HUB_SECTION_TITLE,
  HUB_SECTION_LABEL,
  HUB_AGE_BADGE,
  HUB_FEATURE_TILE_CHEVRON,
  HUB_PAGE_CHIP_ACTIVE,
  HUB_PAGE_CHIP_INACTIVE,
  hubSectionCardClasses,
  type HubAccentTheme,
} from "@/lib/parent-hub-premium";
import { PAGE_STICKY_HEADER_BASE } from "@/lib/page-sticky-header";

export const EVENT_PREP_ACCENT = getHubFeatureTileAccent("event-prep");

export const EVENT_PREP_PAGE = "event-prep-zone-premium flex min-h-dvh w-full flex-col";

export const EVENT_PREP_HEADER = cn(
  PAGE_STICKY_HEADER_BASE,
  "border-white/[0.08] bg-[rgba(7,17,38,0.88)]",
);

export const EVENT_PREP_MAIN =
  "scroll-safe mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4";

export const EVENT_PREP_SECTION_TITLE = HUB_SECTION_TITLE;

export const EVENT_PREP_SECTION_LABEL = HUB_SECTION_LABEL;

export const EVENT_PREP_HINT_BANNER = HUB_INFO_BANNER;

export function eventPrepGlassCard(
  theme: HubAccentTheme = EVENT_PREP_ACCENT,
  interactive = true,
): string {
  return cn(
    hubSectionCardClasses(theme),
    interactive && "cursor-pointer",
  );
}

export function eventPrepPanelCard(theme: HubAccentTheme = EVENT_PREP_ACCENT): string {
  return hubSectionCardClasses(theme);
}

export function eventPrepEmojiShell(theme: HubAccentTheme = EVENT_PREP_ACCENT): string {
  return cn(
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl",
    theme.emojiShell,
  );
}

export const EVENT_PREP_ICON_SHELL = cn(
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
  "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  "shadow-[0_0_16px_rgba(255,184,0,0.35)]",
);

export const EVENT_PREP_BACK_BTN = cn(
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
  "border border-white/[0.12] bg-[rgba(18,28,60,0.65)] text-foreground",
  "transition-all duration-[220ms] active:scale-[0.96]",
);

export const EVENT_PREP_CHIP_ACTIVE = HUB_PAGE_CHIP_ACTIVE;
export const EVENT_PREP_CHIP_INACTIVE = HUB_PAGE_CHIP_INACTIVE;

export const EVENT_PREP_AGE_BADGE = HUB_AGE_BADGE;

export const EVENT_PREP_CHEVRON = HUB_FEATURE_TILE_CHEVRON;

export const EVENT_PREP_SEARCH = cn(
  "rounded-full border-white/10 bg-white/[0.04] pl-9",
  "focus-visible:ring-amber-400/30 focus-visible:border-amber-400/40",
);

export const EVENT_PREP_ACTION_TILE = cn(
  HUB_GLASS_SURFACE,
  "group cursor-pointer overflow-hidden rounded-[20px] border-[1.5px]",
  "border-[rgba(255,184,0,0.35)]",
  "shadow-[0_0_12px_rgba(255,184,0,0.12)]",
  "transition-all duration-[220ms] ease-[ease]",
  "hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(255,184,0,0.22)]",
  "active:scale-[0.985]",
);

export const EVENT_PREP_ACTION_ICON = cn(
  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
  "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
  "shadow-[0_0_16px_rgba(255,184,0,0.30)]",
);

/** Age-aware child avatar for picker tiles. */
export function eventPrepChildEmoji(age: number): string {
  if (age <= 3) return "👶";
  if (age <= 7) return "🧒";
  if (age <= 12) return "👧";
  return "🧑";
}
