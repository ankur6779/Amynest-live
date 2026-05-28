import { Link } from "wouter";
import { ArrowRight, Brain, Heart, ShieldCheck } from "lucide-react";
import {
  pickRoutineForIntelligence,
  resolveFamilyIntelligenceSurface,
  type FamilyIntelligenceContext,
  type RoutineIntelligencePick,
} from "@/lib/family-intelligence-surface";

export function AmyFamilyMemoryCard({
  routines,
  ctx,
  todayKey,
  variant = "dashboard",
}: {
  routines: readonly RoutineIntelligencePick[];
  ctx?: FamilyIntelligenceContext;
  todayKey?: string;
  variant?: "dashboard" | "hub";
}) {
  const pickedRoutine = pickRoutineForIntelligence(routines, todayKey);
  const picked = resolveFamilyIntelligenceSurface({ routines, ctx, todayKey });
  if (!picked) return null;

  const href = pickedRoutine ? `/routines/${pickedRoutine.id}` : "/routines";
  const primarySignal = picked.signals[0];
  const supportSignal = picked.signals.find((signal) => signal.id === "supports");
  const subtitle =
    pickedRoutine?.childName != null
      ? `Latest family intelligence from ${pickedRoutine.childName}`
      : "Amy is learning what works for your household";

  return (
    <Link href={href} className="block">
      <div
        className={
          variant === "hub"
            ? "rounded-2xl border border-primary/20 bg-card/80 overflow-hidden hover:border-primary/35 transition-all"
            : "rounded-2xl border border-primary/20 bg-card overflow-hidden hover:border-primary/35 hover:shadow-sm transition-all"
        }
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Brain className="h-4 w-4 text-primary" />
          <div className="min-w-0">
            <span className="font-quicksand font-bold text-sm text-foreground block">Amy remembers</span>
            <span className="text-[11px] text-muted-foreground truncate block">{subtitle}</span>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">{primarySignal?.label}</p>
              <p className="mt-1 text-xs leading-snug text-muted-foreground">{primarySignal?.detail}</p>
            </div>
          </div>

          {supportSignal ? (
            <p className="rounded-xl border border-border bg-muted/45 px-3 py-2 text-xs leading-snug text-muted-foreground">
              <Heart className="h-3.5 w-3.5 mr-1 inline align-text-bottom text-primary" />
              {supportSignal.detail}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-primary">
            <span>See why Amy planned it this way</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
