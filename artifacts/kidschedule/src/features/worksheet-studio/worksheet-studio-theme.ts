import { cn } from "@/lib/utils";

/** LPS Worksheet Studio — premium design tokens */
export const WS_PAGE = cn(
  "worksheet-studio min-h-dvh w-full",
  "bg-gradient-to-b from-[#f7f4ef] via-[#faf8f5] to-[#f0ebe3]",
);

export const WS_GLASS_CARD = cn(
  "rounded-2xl border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(30,58,95,0.08)]",
  "backdrop-blur-xl backdrop-saturate-150",
);

export const WS_HERO_GRADIENT = cn(
  "bg-gradient-to-br from-[#1e3a5f] via-[#2a4f7a] to-[#c9a227]",
  "bg-clip-text text-transparent",
);

export const WS_PRIMARY_BTN = cn(
  "h-14 rounded-2xl text-base font-semibold shadow-[0_4px_20px_rgba(30,58,95,0.25)]",
  "bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8a] text-white",
  "transition-all duration-200 active:scale-[0.98] touch-manipulation",
  "hover:shadow-[0_6px_28px_rgba(30,58,95,0.35)]",
);

export const WS_CHIP_ACTIVE = cn(
  "min-h-12 rounded-xl border-2 border-[#1e3a5f] bg-[#1e3a5f] px-4 text-sm font-semibold text-white",
  "shadow-[0_2px_12px_rgba(30,58,95,0.2)] transition-all duration-150",
);

export const WS_CHIP = cn(
  "min-h-12 rounded-xl border border-[#d4cfc4]/80 bg-white/80 px-4 text-sm font-medium text-[#1e3a5f]",
  "shadow-sm transition-all duration-150 active:scale-[0.97] touch-manipulation",
  "hover:border-[#1e3a5f]/30 hover:bg-white",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40",
);

export const WS_PROMPT_BOX = cn(
  "w-full resize-none rounded-2xl border border-[#d4cfc4]/60 bg-white/90 px-5 py-4",
  "text-base leading-relaxed shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]",
  "outline-none transition-shadow duration-200",
  "focus:border-[#1e3a5f]/40 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.12)]",
  "placeholder:text-muted-foreground/60 touch-manipulation",
);

export const WS_EDITOR_HEADER = cn(
  "sticky top-0 z-30 flex items-center gap-2",
  "border-b border-white/20 bg-[rgba(255,255,255,0.82)] px-3 py-2.5 backdrop-blur-xl",
  "pt-[max(env(safe-area-inset-top),0.5rem)]",
);

export const WS_PAPER_SHADOW = cn(
  "rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_40px_rgba(30,58,95,0.12)]",
  "ring-1 ring-[#d4cfc4]/40 transition-shadow duration-300",
);

export const WS_TOOLBAR = cn(
  "fixed inset-x-0 bottom-0 z-40",
  "border-t border-white/30 bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl",
  "pb-[max(env(safe-area-inset-bottom),0.5rem)]",
  "shadow-[0_-8px_32px_rgba(30,58,95,0.08)]",
);

export const WS_FAB = cn(
  "fixed bottom-36 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full",
  "bg-gradient-to-br from-[#c9a227] to-[#e8c547] text-[#1e3a5f] shadow-[0_6px_24px_rgba(201,162,39,0.45)]",
  "transition-transform duration-200 active:scale-95 touch-manipulation",
);

export const WS_SECTION_LABEL = "text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60";

export const WS_ONBOARDING_KEY = "worksheet-studio-onboarded-v2";
