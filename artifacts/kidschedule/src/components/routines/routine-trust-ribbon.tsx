import { ShieldCheck } from "lucide-react";
import { HUB_INFO_BANNER } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import type { TrustRibbonItem } from "@/lib/routine-detail-premium";

type RoutineTrustRibbonProps = {
  signals: TrustRibbonItem[];
};

export function RoutineTrustRibbon({ signals }: RoutineTrustRibbonProps) {
  if (signals.length === 0) return null;

  return (
    <div
      className={cn(
        HUB_INFO_BANNER,
        "flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 px-3.5",
      )}
      role="status"
      aria-label="Routine verification"
    >
      {signals.map((signal) => (
        <span
          key={signal.id}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground/90"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden />
          {signal.label}
        </span>
      ))}
    </div>
  );
}
