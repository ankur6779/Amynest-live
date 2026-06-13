/**
 * Shared sticky page headers for immersive routes (layout mobile header hidden).
 * Always include safe-area-inset-top on the sticky element — parent padding is not
 * enough because position:sticky snaps to the viewport top when scrolling.
 */
import { cn } from "@/lib/utils";

export const PAGE_STICKY_HEADER_BASE = cn(
  "sticky top-0 z-50 shrink-0",
  "border-b border-border/80 bg-background/95 backdrop-blur-md",
  "pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3",
  "pl-[max(1rem,env(safe-area-inset-left,0px))]",
  "pr-[max(1rem,env(safe-area-inset-right,0px))]",
);

/** Top inset only — for full-bleed immersive pages with a non-sticky header row. */
export const PAGE_SAFE_TOP = "pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]";

export const PAGE_STICKY_HEADER_INNER = "flex min-w-0 items-center gap-3";

export const PAGE_BACK_BTN = cn(
  "page-back-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
  "border border-border bg-card text-foreground shadow-sm",
  "active:scale-95 transition-transform",
);
