/**
 * Soft emotional celebrations — never gamification.
 * Stars gather, constellation grows, orb brightens (Living Sky pulse).
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "../lib/focus-trap";
import { useLivingSky } from "../state/living-sky-context";
import { playSkySound } from "../lib/sky-sounds";
import "../design/amy-astro.css";

type Props = {
  open: boolean;
  message: string;
  reducedMotion?: boolean;
  /** When false, skip soft sky chime (Settings → Sky sounds). */
  soundsEnabled?: boolean;
  onClose: () => void;
};

export function AmyAstroEmotionalCelebration({
  open,
  message,
  reducedMotion = false,
  soundsEnabled = true,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const livingSky = useLivingSky();
  const skyRef = useRef(livingSky);
  skyRef.current = livingSky;
  useFocusTrap(rootRef, open, onClose);

  useEffect(() => {
    if (!open || reducedMotion) return;
    const sky = skyRef.current;
    sky?.pulseOrb();
    sky?.setAmyGazeUp(true);
    playSkySound("success", { enabled: soundsEnabled, reducedMotion });
    const t = window.setTimeout(() => sky?.setAmyGazeUp(false), 1600);
    return () => window.clearTimeout(t);
  }, [open, reducedMotion, soundsEnabled]);

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
          "amy-astro-glass amy-astro-milestone-celebrate w-full max-w-sm rounded-3xl p-5 text-center",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        <svg
          className={cn(
            "mx-auto h-14 w-40",
            !reducedMotion && "amy-astro-constellation-draw amy-astro-stars-gather",
          )}
          viewBox="0 0 160 56"
          aria-hidden
        >
          <g stroke="hsl(42 75% 70%)" strokeWidth="0.9" fill="hsl(42 90% 82%)">
            <polyline points="12,40 36,18 58,34 88,12 120,30 148,16" fill="none" />
            <circle cx="12" cy="40" r="2.2" className="amy-astro-star-gather" />
            <circle cx="36" cy="18" r="2.4" className="amy-astro-star-gather" />
            <circle cx="58" cy="34" r="2" className="amy-astro-star-gather" />
            <circle cx="88" cy="12" r="2.6" className="amy-astro-star-gather" />
            <circle cx="120" cy="30" r="2.2" className="amy-astro-star-gather" />
            <circle cx="148" cy="16" r="2" className="amy-astro-star-gather" />
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
