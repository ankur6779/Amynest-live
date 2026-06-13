/**
 * Smart Study Zone — visual tokens aligned with Parent Hub premium glass theme.
 */

import { cn } from "@/lib/utils";
import { PAGE_STICKY_HEADER_BASE } from "@/lib/page-sticky-header";
import {
  getHubFeatureTileAccent,
  HUB_GLASS_SURFACE,
  HUB_INFO_BANNER,
  hubSectionCardClasses,
  type HubAccentTheme,
} from "@/lib/parent-hub-premium";

export const STUDY_ACCENT = getHubFeatureTileAccent("smart-study");

export const STUDY_PAGE = "study-zone-premium flex min-h-dvh w-full flex-col";

export const STUDY_HEADER = cn(
  PAGE_STICKY_HEADER_BASE,
  "border-white/[0.08] bg-[rgba(7,17,38,0.88)]",
);

export const STUDY_MAIN =
  "scroll-safe mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-4";

export const STUDY_SECTION_TITLE =
  "font-quicksand text-xl font-bold text-foreground flex items-center gap-2";

export const STUDY_HINT_BANNER = HUB_INFO_BANNER;

export function studyGlassCard(
  theme: HubAccentTheme = STUDY_ACCENT,
  interactive = true,
): string {
  return cn(
    hubSectionCardClasses(theme),
    interactive && "cursor-pointer",
  );
}

export function studyPanelCard(theme: HubAccentTheme = STUDY_ACCENT): string {
  return hubSectionCardClasses(theme);
}

export function studyEmojiShell(theme: HubAccentTheme = STUDY_ACCENT): string {
  return cn(
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl",
    theme.emojiShell,
  );
}

export function studyPlayTile(done: boolean): string {
  return cn(
    HUB_GLASS_SURFACE,
    "group relative rounded-[20px] border-[1.5px] p-4 text-left",
    "transition-all duration-[220ms] ease-[ease]",
    "hover:-translate-y-0.5 active:scale-[0.985]",
    done
      ? "border-[rgba(52,211,153,0.55)] shadow-[0_0_16px_rgba(52,211,153,0.18)]"
      : "border-[rgba(192,38,211,0.42)] shadow-[0_0_12px_rgba(192,38,211,0.14)]",
  );
}

export const STUDY_ICON_SHELL = cn(
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
  "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white",
  "shadow-[0_0_16px_rgba(192,38,211,0.35)]",
);

export const STUDY_BACK_BTN = cn(
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
  "border border-white/[0.12] bg-[rgba(18,28,60,0.65)] text-foreground",
  "transition-all duration-[220ms] active:scale-[0.96]",
);
