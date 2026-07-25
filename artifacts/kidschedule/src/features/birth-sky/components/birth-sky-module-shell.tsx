/**
 * Amy Astro Intelligence module shell — dark luxury chassis.
 * Internal testids retain birth-sky-* for certification stability.
 */

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { AmyAstroCosmicAmbient } from "./cosmic-ambient";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import "../design/amy-astro.css";

type BirthSkyModuleShellProps = {
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  /** Hide top bar (e.g. formation later). */
  hideTopBar?: boolean;
  /** Pack 3: Back disabled during forming/soft_wait/converging. */
  backDisabled?: boolean;
  /** Pack 7: overflow / Settings entry. */
  topBarEnd?: ReactNode;
  footer?: ReactNode;
  className?: string;
  testId?: string;
  reducedMotion?: boolean;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BirthSkyModuleShell({
  title = AMY_ASTRO_PRODUCT_NAME,
  onBack,
  children,
  hideTopBar,
  backDisabled,
  topBarEnd,
  footer,
  className,
  testId = "birth-sky-module-shell",
  reducedMotion,
}: BirthSkyModuleShellProps) {
  const reduced = reducedMotion ?? prefersReducedMotion();

  return (
    <div
      className={cn("amy-astro-root relative min-h-[100dvh]", className)}
      data-testid={testId}
    >
      <AmyAstroCosmicAmbient reducedMotion={reduced} intensity="shell" showMeteor={false} />

      {!hideTopBar && (
        <header
          className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
          data-testid="birth-sky-top-bar"
        >
          <button
            type="button"
            onClick={backDisabled ? undefined : onBack}
            disabled={backDisabled || !onBack}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[hsl(40_20%_96%/0.85)] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={backDisabled ? "Back unavailable while forming" : "Back"}
            aria-disabled={backDisabled || !onBack}
            data-testid="birth-sky-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <AmyAstroEmblem
            size={36}
            reducedMotion={reduced}
            interactive={false}
            className="shrink-0"
          />
          <h1 className="amy-astro-display amy-astro-gold-text min-w-0 flex-1 text-lg font-semibold tracking-wide">
            {title}
          </h1>
          {topBarEnd ? <div className="shrink-0">{topBarEnd}</div> : null}
        </header>
      )}

      <main
        className={cn(
          "relative z-10 mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]",
          hideTopBar && "pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]",
        )}
      >
        {children}
      </main>

      {footer ? (
        <div className="relative z-10 mx-auto w-full max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

/** Persistent seal uses the same Amy Astro emblem — one visual identity. */
export function BirthSkyHorizonSeal({
  className,
  size = 96,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div className={cn("inline-flex", className)} data-testid="birth-sky-horizon-seal">
      <AmyAstroEmblem size={size} interactive={false} />
    </div>
  );
}
