import { Lock } from "lucide-react";
import type { AgeBand } from "@/lib/age-bands";
import { bandLowerLabel, bandRangeLabel } from "@/lib/age-bands";

/**
 * Wraps a HubSection (or any section card) to give it the "Coming Next" look:
 * slightly dimmed, premium border, and a "Coming Next · For Age X+" pill.
 *
 * Content stays interactive — parents can preview, but the visual treatment
 * makes it clear this is a future stage. This is intentionally a thin
 * decorator so we don't fork every existing section component.
 */
export function ComingNextWrapper({
  band,
  children,
}: {
  band: AgeBand;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group/coming-next">
      {/* Coming Next pill — sits above the card */}
      <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-rose-100 dark:from-amber-500/20 dark:to-rose-500/20 border border-amber-300/60 dark:border-amber-400/30 px-2.5 py-0.5 shadow-sm">
        <Lock className="h-2.5 w-2.5 text-amber-700 dark:text-amber-300" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
          Coming next · For age {bandLowerLabel(band)}
        </span>
      </div>

      {/* Dimmed surface — content stays interactive (preview allowed) */}
      <div
        className={[
          "rounded-2xl transition-all duration-300",
          "ring-1 ring-amber-200/60 dark:ring-amber-400/20",
          "opacity-75 saturate-75 hover:opacity-100 hover:saturate-100",
          "shadow-[0_2px_18px_-10px_rgba(245,158,11,0.35)]",
        ].join(" ")}
        title={`Preview — unlocks fully at ${bandRangeLabel(band)}`}
      >
        {children}
      </div>
    </div>
  );
}
