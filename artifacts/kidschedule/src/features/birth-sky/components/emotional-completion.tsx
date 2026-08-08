/**
 * Emotional completion — stars gather into a constellation when exploration ripens.
 */

import { useEffect, useRef } from "react";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { useFocusTrap } from "../lib/focus-trap";
import { cn } from "@/lib/utils";
import {
  isBirthSkyLivingV1Enabled,
  livingCompletionLine,
} from "@/lib/birth-sky/living-room";
import "../design/amy-astro.css";

type Props = {
  open: boolean;
  childName: string;
  reducedMotion?: boolean;
  onClose: () => void;
};

export function AmyAstroEmotionalCompletion({
  open,
  childName,
  reducedMotion = false,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onClose, reducedMotion ? 4000 : 7200);
    return () => window.clearTimeout(t);
  }, [open, onClose, reducedMotion]);

  if (!open) return null;

  const living = isBirthSkyLivingV1Enabled();

  return (
    <div
      ref={rootRef}
      className="amy-astro-root fixed inset-0 z-[60] flex items-center justify-center bg-[hsl(228_48%_5%/0.82)] p-6"
      role="dialog"
      aria-modal="true"
      aria-label="A beautiful understanding"
      data-testid="amy-astro-emotional-completion"
      tabIndex={-1}
    >
      <div
        className={cn(
          "amy-astro-glass w-full max-w-md rounded-[2rem] p-6 text-center",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        {!living ? (
          <svg
            className={cn("mx-auto h-24 w-56", !reducedMotion && "amy-astro-constellation-draw")}
            viewBox="0 0 224 96"
            aria-hidden
          >
            <g stroke="hsl(42 75% 70%)" strokeWidth="0.9" fill="hsl(42 90% 82%)">
              <polyline
                points="16,70 48,28 84,52 118,18 152,44 188,22 208,58"
                fill="none"
                className={!reducedMotion ? "amy-astro-constellation-draw" : undefined}
              />
              {[
                [16, 70],
                [48, 28],
                [84, 52],
                [118, 18],
                [152, 44],
                [188, 22],
                [208, 58],
              ].map(([cx, cy], i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={2.4}
                  className={!reducedMotion ? "amy-astro-aspect-pulse" : undefined}
                  style={!reducedMotion ? { animationDelay: `${i * 0.12}s` } : undefined}
                />
              ))}
            </g>
          </svg>
        ) : null}

        <div className="mt-2 flex justify-center">
          <AmyAstroEmblem size={living ? 48 : 64} reducedMotion={reducedMotion} />
        </div>

        <p
          className={cn(
            "mt-4 line-clamp-3 text-2xl leading-snug",
            living ? "bs-living-deep-title" : "amy-astro-display amy-astro-gold-text",
          )}
        >
          {living ? (
            livingCompletionLine(childName)
          ) : (
            <>
              You now understand another beautiful part of{" "}
              <span className="inline-block max-w-full break-words align-bottom">{childName}</span>
              &apos;s universe.
            </>
          )}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.7)]">
          Nothing to collect. Nothing to finish. Only a softer knowing — held gently.
        </p>
        <button
          type="button"
          className="mt-5 min-h-12 w-full rounded-xl border border-[hsl(42_50%_60%/0.3)] bg-white/5 text-sm font-semibold"
          onClick={onClose}
        >
          Keep this quietly
        </button>
      </div>
    </div>
  );
}
