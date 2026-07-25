/**
 * Birth Sky module shell chassis (Pack 1 Part 2) — IM-0 slot structure.
 */

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

export function BirthSkyModuleShell({
  title = "Birth Sky",
  onBack,
  children,
  hideTopBar,
  backDisabled,
  topBarEnd,
  footer,
  className,
  testId = "birth-sky-module-shell",
}: BirthSkyModuleShellProps) {
  return (
    <div
      className={cn(
        "relative min-h-[100dvh] bg-[hsl(222_40%_8%)] text-[hsl(40_20%_96%)]",
        className,
      )}
      data-testid={testId}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,hsl(220_40%_18%/0.9),transparent_55%)]"
        aria-hidden
      />

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
          <h1 className="min-w-0 flex-1 font-quicksand text-lg font-bold tracking-tight">
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

/** Horizon Seal mark (Phase 1 Design Freeze §3) — geometric, non-zodiac. */
export function BirthSkyHorizonSeal({
  className,
  size = 96,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-[hsl(40_30%_88%)]", className)}
      role="img"
      aria-label="Birth Sky"
      data-testid="birth-sky-horizon-seal"
    >
      <circle
        cx="48"
        cy="48"
        r="36"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.85"
      />
      <path
        d="M18 58c10-6 20-9 30-9s20 3 30 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.75"
      />
      <circle cx="48" cy="56" r="7" fill="currentColor" opacity="0.92" />
      <circle cx="64" cy="38" r="1.5" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
