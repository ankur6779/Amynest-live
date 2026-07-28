/**
 * Amy Astro Intelligence module shell — dark luxury chassis + Living Sky.
 * Internal testids retain birth-sky-* for certification stability.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AmyAstroCosmicAmbient } from "./cosmic-ambient";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { AmyBrandAvatar } from "./amy-brand-avatar";
import { AmyAstroIcon } from "./icons/amy-astro-icons";
import { LivingSkyProvider } from "../state/living-sky-context";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import "../design/amy-astro.css";

type BirthSkyModuleShellProps = {
  title?: string;
  onBack?: () => void;
  children: ReactNode;
  hideTopBar?: boolean;
  backDisabled?: boolean;
  topBarEnd?: ReactNode;
  footer?: ReactNode;
  className?: string;
  testId?: string;
  reducedMotion?: boolean;
  childName?: string;
  /** Living Sky ambient richness — cinematic screens use "full". */
  ambientIntensity?: "shell" | "full" | "static";
  /** Living Sky inputs — presentation only */
  sunSign?: string | null;
  moonSign?: string | null;
  birthTime?: string | null;
  timePrecision?: string | null;
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
  childName,
  ambientIntensity = "shell",
  sunSign,
  moonSign,
  birthTime,
  timePrecision,
}: BirthSkyModuleShellProps) {
  const reduced = reducedMotion ?? prefersReducedMotion();

  return (
    <LivingSkyProvider
      input={{
        childName,
        sunSign,
        moonSign,
        birthTime,
        timePrecision,
      }}
    >
      <div
        className={cn(
          "amy-astro-root relative flex min-h-[100dvh] flex-col overflow-x-clip",
          className,
        )}
        data-testid={testId}
      >
        <AmyAstroCosmicAmbient
          reducedMotion={reduced}
          intensity={ambientIntensity}
          showMeteor={!reduced}
          living
        />

        {!hideTopBar && (
          <header
            className="relative z-10 flex shrink-0 items-start gap-2.5 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
            data-testid="birth-sky-top-bar"
          >
            <button
              type="button"
              onClick={backDisabled ? undefined : onBack}
              disabled={backDisabled || !onBack}
              className="amy-astro-ripple inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-[hsl(40_20%_96%/0.85)] hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={backDisabled ? "Back unavailable while forming" : "Back"}
              aria-disabled={backDisabled || !onBack}
              data-testid="birth-sky-back"
            >
              <AmyAstroIcon name="back" size={28} reducedMotion={reduced} title="Back" />
            </button>
            <AmyAstroEmblem
              size={36}
              reducedMotion={reduced}
              interactive={false}
              className="mt-0.5 shrink-0"
            />
            <h1 className="amy-astro-display amy-astro-gold-text amy-astro-shell-title min-w-0 flex-1 pt-1.5 text-lg font-semibold leading-snug tracking-wide">
              {title}
            </h1>
            <AmyBrandAvatar
              childName={childName ?? "Amy"}
              size={36}
              reducedMotion={reduced}
              className="mt-0.5 shrink-0"
            />
            {topBarEnd ? <div className="mt-0.5 shrink-0">{topBarEnd}</div> : null}
          </header>
        )}

        <main
          className={cn(
            "relative z-10 mx-auto w-full max-w-lg flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+2.75rem)]",
            hideTopBar && "pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]",
          )}
        >
          {children}
        </main>

        {footer ? (
          <div className="relative z-10 mx-auto w-full max-w-lg shrink-0 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
            {footer}
          </div>
        ) : null}
      </div>
    </LivingSkyProvider>
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
