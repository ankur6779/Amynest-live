import { Brain, Heart, Lightbulb } from "lucide-react";
import type { FamilyIntelligenceSurface, FamilyTrustSignalId } from "@/lib/family-intelligence-surface";

const TRUST_ICONS: Record<FamilyTrustSignalId, typeof Brain> = {
  remembers: Brain,
  adapts: Lightbulb,
  supports: Heart,
};

export function FamilyTrustStrip({
  surface,
  compact = false,
}: {
  surface: FamilyIntelligenceSurface;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="text-xs leading-snug text-muted-foreground">{surface.headline}</p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {surface.signals.map((signal) => {
        const Icon = TRUST_ICONS[signal.id];
        return (
          <div
            key={signal.id}
            className="rounded-2xl border border-border/70 bg-background/65 px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <p className="text-xs font-bold text-foreground">{signal.label}</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{signal.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
