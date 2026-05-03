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
      <div className="absolute -top-2.5 left-3 z-10 flex items-center gap-1.5 rounded-full bg-card border border-border px-2.5 py-0.5 shadow-sm">
        <Lock className="h-2.5 w-2.5 text-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
          Coming next · For age {bandLowerLabel(band)}
        </span>
      </div>

      {/* Dimmed surface — content stays interactive (preview allowed) */}
      <div
        className={[
          "rounded-2xl transition-all duration-300",
          "ring-1 ring-primary",
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
