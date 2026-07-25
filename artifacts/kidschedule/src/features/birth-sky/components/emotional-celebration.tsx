/**
 * Soft emotional celebrations — never gamification.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "../lib/focus-trap";
import "../design/amy-astro.css";

type Props = {
  open: boolean;
  message: string;
  reducedMotion?: boolean;
  onClose: () => void;
};

export function AmyAstroEmotionalCelebration({
  open,
  message,
  reducedMotion = false,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open, onClose);
  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[62] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="A beautiful memory"
      data-testid="amy-astro-emotional-celebration"
      tabIndex={-1}
    >
      <div
        className={cn(
          "amy-astro-glass w-full max-w-sm rounded-3xl p-5 text-center",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        <svg
          className={cn("mx-auto h-14 w-40", !reducedMotion && "amy-astro-constellation-draw")}
          viewBox="0 0 160 56"
          aria-hidden
        >
          <g stroke="hsl(42 75% 70%)" strokeWidth="0.9" fill="hsl(42 90% 82%)">
            <polyline points="12,40 36,18 58,34 88,12 120,30 148,16" fill="none" />
            <circle cx="12" cy="40" r="2.2" />
            <circle cx="36" cy="18" r="2.4" />
            <circle cx="58" cy="34" r="2" />
            <circle cx="88" cy="12" r="2.6" />
            <circle cx="120" cy="30" r="2.2" />
            <circle cx="148" cy="16" r="2" />
          </g>
        </svg>
        <p className="amy-astro-display amy-astro-gold-text mt-3 text-xl">
          A beautiful memory
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[hsl(40_20%_96%/0.78)]">
          {message}
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 w-full rounded-xl border border-[hsl(42_50%_60%/0.3)] bg-white/5 text-sm font-semibold"
          onClick={onClose}
        >
          Hold it gently
        </button>
      </div>
    </div>
  );
}
