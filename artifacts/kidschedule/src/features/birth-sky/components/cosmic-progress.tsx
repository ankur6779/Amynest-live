/**
 * Cosmic Journey progress — discovery only, never XP/points.
 * Living ON: gentle noticing (same data, quieter face).
 */

import { cn } from "@/lib/utils";
import {
  isBirthSkyLivingV1Enabled,
  livingProgressAria,
  livingProgressNextLabel,
  livingProgressTitle,
} from "@/lib/birth-sky/living-room";
import "../design/amy-astro.css";

type Props = {
  percent: number;
  nextLabel: string;
  memoryLines: string[];
  reducedMotion?: boolean;
  className?: string;
};

export function AmyAstroCosmicProgress({
  percent,
  nextLabel,
  memoryLines,
  reducedMotion = false,
  className,
}: Props) {
  const living = isBirthSkyLivingV1Enabled();
  return (
    <section
      className={cn(
        "amy-astro-glass amy-astro-breathe rounded-3xl p-4",
        !reducedMotion && "amy-astro-enter",
        className,
      )}
      data-testid="amy-astro-cosmic-progress"
      aria-label={living ? livingProgressAria() : "Cosmic journey progress"}
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(42_60%_70%/0.75)]">
            {living ? livingProgressTitle() : "Cosmic Journey"}
          </p>
          <p
            className={cn(
              "mt-1 font-semibold tabular-nums",
              living ? "bs-living-deep-title text-2xl" : "amy-astro-display amy-astro-gold-text text-3xl",
            )}
          >
            {percent}%
          </p>
        </div>
        <p className="max-w-[12rem] text-right text-[11px] leading-snug text-[hsl(40_20%_96%/0.55)]">
          {living ? livingProgressNextLabel() : "Next discovery"}
          <br />
          <span className="font-semibold text-[hsl(42_70%_78%)]">{nextLabel}</span>
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[hsl(275_55%_48%)] via-[hsl(42_70%_55%)] to-[hsl(42_90%_72%)] transition-[width] duration-700"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      {memoryLines.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {memoryLines.map((line) => (
            <li
              key={line}
              className="text-xs leading-relaxed text-[hsl(40_20%_96%/0.65)]"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[hsl(40_20%_96%/0.55)]">
          Every chapter you open becomes part of their remembered sky.
        </p>
      )}
    </section>
  );
}
