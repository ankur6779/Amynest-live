/**
 * Birth Sky module shell — Living Understand room when living ON.
 * Legacy Amy Astro cosmic chassis retained behind VITE_FF_BIRTH_SKY_LIVING_V1=0.
 * Engines / calculations untouched. Internal testids retain birth-sky-* for stability.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AmyAstroCosmicAmbient } from "./cosmic-ambient";
import { AmyAstroEmblem } from "./amy-astro-emblem";
import { AmyBrandAvatar } from "./amy-brand-avatar";
import { AmyAstroIcon } from "./icons/amy-astro-icons";
import { LivingSkyProvider } from "../state/living-sky-context";
import { AMY_ASTRO_PRODUCT_NAME } from "../lib/branding";
import {
  isBirthSkyLivingV1Enabled,
  livingBirthSkyProductName,
} from "@/lib/birth-sky/living-room";
import "@/components/birth-sky/birth-sky-living-room.css";
import "@/components/birth-sky/birth-sky-living-deep.css";
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
  title,
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
  const living = isBirthSkyLivingV1Enabled();
  const resolvedTitle = title ?? (living ? livingBirthSkyProductName() : AMY_ASTRO_PRODUCT_NAME);

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
          living
            ? "birth-sky-living-shell bs-living-deep relative flex min-h-[100dvh] flex-col overflow-x-clip"
            : "amy-astro-root relative flex min-h-[100dvh] flex-col overflow-x-clip",
          className,
        )}
        data-testid={testId}
        data-bs-living={living ? "1" : undefined}
      >
        {living ? (
          <div className="birth-sky-living-shell-ambient" aria-hidden="true" />
        ) : (
          <AmyAstroCosmicAmbient
            reducedMotion={reduced}
            intensity={ambientIntensity}
            showMeteor={!reduced}
            living
          />
        )}

        {!hideTopBar && (
          <header
            className={cn(
              "relative z-10 flex shrink-0 items-start gap-2.5 px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]",
              living && "birth-sky-living-topbar",
            )}
            data-testid="birth-sky-top-bar"
          >
            <button
              type="button"
              onClick={backDisabled ? undefined : onBack}
              disabled={backDisabled || !onBack}
              className={cn(
                "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40",
                living
                  ? "text-[rgba(232,212,184,0.88)] hover:bg-white/10"
                  : "amy-astro-ripple text-[hsl(40_20%_96%/0.85)] hover:bg-white/10",
              )}
              aria-label={backDisabled ? "Back unavailable while forming" : "Back"}
              aria-disabled={backDisabled || !onBack}
              data-testid="birth-sky-back"
            >
              <AmyAstroIcon name="back" size={28} reducedMotion={reduced} title="Back" />
            </button>
            {!living ? (
              <AmyAstroEmblem
                size={36}
                reducedMotion={reduced}
                interactive={false}
                className="mt-0.5 shrink-0"
              />
            ) : null}
            <h1
              className={cn(
                "min-w-0 flex-1 pt-1.5 text-lg font-semibold leading-snug tracking-wide",
                living
                  ? "text-[rgba(255,252,248,0.96)]"
                  : "amy-astro-display amy-astro-gold-text amy-astro-shell-title",
              )}
            >
              {resolvedTitle}
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

/** Persistent seal — living uses soft mark; legacy keeps Amy Astro emblem. */
export function BirthSkyHorizonSeal({
  className,
  size = 96,
}: {
  className?: string;
  size?: number;
}) {
  const living = isBirthSkyLivingV1Enabled();
  if (living) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-[rgba(232,212,184,0.28)] bg-[rgba(232,212,184,0.08)] text-[rgba(232,212,184,0.9)]",
          className,
        )}
        style={{ width: size, height: size }}
        data-testid="birth-sky-horizon-seal"
        aria-hidden
      >
        ✦
      </div>
    );
  }
  return (
    <div className={cn("inline-flex", className)} data-testid="birth-sky-horizon-seal">
      <AmyAstroEmblem size={size} interactive={false} />
    </div>
  );
}
