import { cn } from "@/lib/utils";

/* ─── Root & page shell ─────────────────────────────────────────────── */

/** App root — constrains all worksheet studio surfaces */
export const WS_ROOT = cn(
  "ws-root worksheet-studio",
  "min-h-dvh w-full min-w-0 max-w-[100vw] overflow-x-hidden",
  "font-[Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]",
  "pl-[max(env(safe-area-inset-left),0px)]",
  "pr-[max(env(safe-area-inset-right),0px)]",
);

/** Full-page background surface */
export const WS_PAGE = cn(
  WS_ROOT,
  "bg-gradient-to-b from-[#f7f4ef] via-[#faf8f5] to-[#f0ebe3]",
);

/* ─── Spacing scale (fluid) ─────────────────────────────────────────── */

export const WS_GAP = "gap-[clamp(0.75rem,2vw,1.25rem)]";
export const WS_GAP_SM = "gap-[clamp(0.375rem,1.5vw,0.625rem)]";
export const WS_GAP_LG = "gap-[clamp(1rem,3vw,1.5rem)]";
export const WS_PAD_X = "px-[clamp(0.75rem,4vw,1.25rem)]";
export const WS_PAD_Y = "py-[clamp(0.75rem,3vw,1.5rem)]";

/* ─── Typography (fluid, no clipping) ───────────────────────────────── */

export const WS_HEADING = cn(
  "font-bold leading-tight tracking-tight text-[#1e3a5f]",
  "text-[clamp(1.25rem,4.5vw,1.875rem)]",
);

export const WS_HEADING_SM = cn(
  "font-semibold leading-snug text-[#1e3a5f]",
  "text-[clamp(1rem,3.5vw,1.25rem)]",
);

export const WS_BODY = cn(
  "leading-relaxed text-[#1e3a5f]",
  "text-[clamp(0.9375rem,2.5vw,1rem)]",
);

export const WS_SECTION_LABEL = cn(
  "font-bold uppercase tracking-wider text-[#1e3a5f]",
  "text-[clamp(0.625rem,2vw,0.75rem)]",
);

export const WS_MUTED_TEXT = "text-[#3d5a73] text-[clamp(0.8125rem,2.2vw,0.875rem)] leading-relaxed";
export const WS_CAPTION = "font-medium text-[#3d5a73] text-[clamp(0.6875rem,2vw,0.75rem)] leading-normal";

/* ─── Layout containers ─────────────────────────────────────────────── */

/** Primary content column — never exceeds viewport */
export const WS_CONTAINER = cn(
  "ws-container",
  "mx-auto flex w-full min-w-0 flex-col box-border",
  "max-w-[min(32rem,100%)]",
  WS_GAP,
  WS_PAD_X,
  "pt-[max(env(safe-area-inset-top),clamp(0.75rem,3vw,1rem))]",
  "pb-[max(env(safe-area-inset-bottom),clamp(4rem,12vw,7rem))]",
);

/** Card surface — always fills parent width */
export const WS_GLASS_CARD = cn(
  "ws-card",
  "w-full min-w-0 rounded-2xl border border-[#d4cfc4]/50 bg-white/95",
  "shadow-[0_8px_32px_rgba(30,58,95,0.08)]",
  "backdrop-blur-xl backdrop-saturate-150",
);

/* ─── Grids & button rows ───────────────────────────────────────────── */

/** 2 → 3 → 4 column responsive grid */
export const WS_CHIP_GRID = cn(
  "grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4",
);

/** Chip row that wraps on narrow screens */
export const WS_CHIP_ROW = cn(
  "flex w-full min-w-0 flex-wrap gap-2",
);

/** Action buttons: 2-col mobile, inline tablet+ */
export const WS_BTN_GRID = cn(
  "grid w-full min-w-0 grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2",
);

/** Full-width primary actions on mobile */
export const WS_ACTION_STACK = cn(
  "flex w-full min-w-0 flex-col gap-3",
);

/* ─── Touch & inputs ────────────────────────────────────────────────── */

export const WS_TOUCH = "min-h-12 min-w-12 touch-manipulation";

export const WS_TEXTAREA = cn(
  "w-full min-w-0 resize-none overflow-hidden rounded-2xl",
  "border border-[#d4cfc4]/60 bg-white",
  "px-[clamp(0.75rem,3vw,1rem)] py-[clamp(0.75rem,3vw,1rem)]",
  WS_BODY,
  "shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
  "outline-none transition-all duration-200 break-words",
  "focus:border-[#1e3a5f]/45 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.12)]",
  "placeholder:text-[#3d5a73]/80",
);

/* ─── Buttons ───────────────────────────────────────────────────────── */

export const WS_OUTLINE_BTN = cn(
  "w-full min-w-0 border border-[#1e3a5f]/35 bg-white text-[#1e3a5f] font-semibold shadow-sm",
  "hover:bg-[#f7f4ef] active:scale-[0.98] touch-manipulation",
  "md:w-auto",
);

export const WS_PRIMARY_BTN = cn(
  "h-14 w-full min-w-0 rounded-2xl font-semibold",
  "text-[clamp(0.9375rem,2.5vw,1rem)]",
  "shadow-[0_4px_20px_rgba(30,58,95,0.25)]",
  "bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8a] text-white",
  "transition-all duration-200 active:scale-[0.98] touch-manipulation",
  "hover:shadow-[0_6px_28px_rgba(30,58,95,0.35)]",
);

export const WS_CHIP_ACTIVE = cn(
  "min-h-12 min-w-0 rounded-xl border-2 border-[#1e3a5f] bg-[#1e3a5f]",
  "px-[clamp(0.5rem,2vw,1rem)] text-sm font-semibold text-white",
  "shadow-[0_2px_12px_rgba(30,58,95,0.2)] transition-all duration-150",
);

export const WS_CHIP = cn(
  "min-h-12 min-w-0 rounded-xl border border-[#d4cfc4]/80 bg-white",
  "px-[clamp(0.5rem,2vw,1rem)] text-sm font-semibold text-[#1e3a5f]",
  "shadow-sm transition-all duration-150 active:scale-[0.97] touch-manipulation",
  "hover:border-[#1e3a5f]/30 hover:bg-white",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40",
);

/* ─── Overlays, dialogs, sheets ─────────────────────────────────────── */

export const WS_OVERLAY = cn(
  "fixed inset-0 z-50 flex items-end justify-center sm:items-center",
  "overflow-hidden",
  "p-[max(env(safe-area-inset-top),clamp(0.75rem,3vw,1rem))]",
  "pl-[max(env(safe-area-inset-left),clamp(0.75rem,3vw,1rem))]",
  "pr-[max(env(safe-area-inset-right),clamp(0.75rem,3vw,1rem))]",
  "pb-[max(env(safe-area-inset-bottom),clamp(0.75rem,3vw,1rem))]",
);

export const WS_DIALOG = cn(
  "ws-dialog",
  "w-full min-w-0 max-w-[min(28rem,calc(100vw-2rem))]",
  "max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]",
  "overflow-x-hidden overflow-y-auto rounded-2xl",
  "p-[clamp(1rem,4vw,1.5rem)]",
);

export const WS_SHEET = cn(
  "ws-sheet",
  "w-full min-w-0 max-w-[100vw] overflow-x-hidden overflow-y-auto",
  "max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]",
  "rounded-t-2xl",
  "pb-[max(env(safe-area-inset-bottom),clamp(0.75rem,3vw,1rem))]",
  "pl-[max(env(safe-area-inset-left),0px)]",
  "pr-[max(env(safe-area-inset-right),0px)]",
);

export const WS_SCROLL_Y = "overflow-y-auto overflow-x-hidden";

/* ─── Editor-specific (canvas may scroll internally) ────────────────── */

export const WS_HERO_GRADIENT = cn(
  "bg-gradient-to-br from-[#1e3a5f] via-[#2a4f7a] to-[#c9a227]",
  "bg-clip-text text-transparent",
);

export const WS_PROMPT_BOX = cn(
  "w-full min-w-0 resize-none rounded-2xl border border-[#d4cfc4]/60 bg-white/90",
  "px-5 py-4 text-base leading-relaxed shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)]",
  "outline-none transition-shadow duration-200",
  "focus:border-[#1e3a5f]/40 focus:shadow-[0_0_0_3px_rgba(30,58,95,0.12)]",
  "placeholder:text-[#3d5a73]/70 touch-manipulation",
);

export const WS_EDITOR_HEADER = cn(
  "sticky top-0 z-30 flex w-full min-w-0 flex-wrap items-center gap-1",
  "border-b border-white/20 bg-[rgba(255,255,255,0.82)] px-2 py-2 backdrop-blur-xl sm:gap-2 sm:px-3",
  "pt-[max(env(safe-area-inset-top),0.5rem)]",
  "overflow-x-hidden",
);

/** A4 preview — scales down on narrow phones */
export const WS_EDITOR_CANVAS = cn(
  "relative w-full min-w-0 max-w-[min(30rem,100%)]",
);

export const WS_EDITOR_VIEWPORT = cn(
  "flex w-full min-w-0 flex-1 justify-center",
  "overflow-x-hidden overflow-y-auto",
  "px-[clamp(0.5rem,3vw,0.75rem)] py-4",
  "pb-[max(env(safe-area-inset-bottom),12rem)]",
);

export const WS_PAPER_SHADOW = cn(
  "rounded-2xl shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_40px_rgba(30,58,95,0.12)]",
  "ring-1 ring-[#d4cfc4]/40 transition-shadow duration-300",
);

export const WS_TOOLBAR = cn(
  "fixed inset-x-0 bottom-0 z-40 w-full min-w-0 max-w-[100vw]",
  "border-t border-white/30 bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl",
  "pb-[max(env(safe-area-inset-bottom),0.5rem)]",
  "pl-[max(env(safe-area-inset-left),0px)]",
  "pr-[max(env(safe-area-inset-right),0px)]",
  "shadow-[0_-8px_32px_rgba(30,58,95,0.08)]",
  "overflow-x-hidden",
);

export const WS_FAB = cn(
  "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full",
  "bottom-[max(calc(env(safe-area-inset-bottom)+9rem),10rem)]",
  "right-[max(env(safe-area-inset-right),1rem)]",
  "bg-gradient-to-br from-[#c9a227] to-[#e8c547] text-[#1e3a5f]",
  "shadow-[0_6px_24px_rgba(201,162,39,0.45)]",
  "transition-transform duration-200 active:scale-95 touch-manipulation",
);

export const WS_CONTEXT_MENU = cn(
  "fixed z-50 w-max max-w-[min(calc(100vw-2rem),12rem)] rounded-xl border bg-white p-1 shadow-xl",
);

export const WS_ONBOARDING_KEY = "worksheet-studio-onboarded-v2";
