/**
 * Delight completion — Amy congratulates after deep exploration.
 */

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { useFocusTrap } from "../lib/focus-trap";
import "../design/amy-astro.css";

const STORAGE = "amynest:amy-astro:explored:v1:";

export function markExplorationMemory(profileId: string): void {
  try {
    localStorage.setItem(STORAGE + profileId, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function hasExplorationMemory(profileId: string): boolean {
  try {
    return Boolean(localStorage.getItem(STORAGE + profileId));
  } catch {
    return false;
  }
}

type Props = {
  childName: string;
  open: boolean;
  reducedMotion?: boolean;
  onClose: () => void;
};

export function AmyAstroExplorationDelight({
  childName,
  open,
  reducedMotion = false,
  onClose,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(rootRef, open, onClose);
  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[55] flex items-end justify-center bg-black/55 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Exploration complete"
      tabIndex={-1}
      data-testid="amy-astro-exploration-delight"
    >
      <div
        className={cn(
          "amy-astro-glass w-full max-w-md rounded-3xl p-6 text-center",
          !reducedMotion && "amy-astro-enter",
        )}
      >
        <AmyAstroEmblem size={96} reducedMotion={reducedMotion} />
        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.75)]">
          A tiny constellation for you
        </p>
        <h2 className="amy-astro-display amy-astro-gold-text mt-2 text-2xl font-semibold">
          Beautifully explored
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[hsl(40_20%_96%/0.75)]">
          Amy is quietly proud of the care you brought to{" "}
          <span className="inline-block max-w-[12rem] truncate align-bottom">{childName}</span>
          &apos;s sky. A memory of this exploration is saved on this device — return anytime for
          wonder.
        </p>
        <svg
          className="mx-auto mt-4 h-12 w-40 opacity-80"
          viewBox="0 0 160 48"
          aria-hidden
        >
          <g stroke="hsl(42 70% 70%)" strokeWidth="0.8" fill="hsl(42 90% 80%)">
            <line x1="10" y1="30" x2="40" y2="12" />
            <line x1="40" y1="12" x2="70" y2="28" />
            <line x1="70" y1="28" x2="110" y2="10" />
            <line x1="110" y1="10" x2="150" y2="26" />
            <circle cx="10" cy="30" r="2" />
            <circle cx="40" cy="12" r="2.2" />
            <circle cx="70" cy="28" r="2" />
            <circle cx="110" cy="10" r="2.4" />
            <circle cx="150" cy="26" r="2" />
          </g>
        </svg>
        <button
          type="button"
          className="mt-5 min-h-11 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] text-sm font-semibold text-white"
          onClick={onClose}
          data-testid="amy-astro-delight-close"
        >
          Continue with wonder
        </button>
      </div>
    </div>
  );
}
