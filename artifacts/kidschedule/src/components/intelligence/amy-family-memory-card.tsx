import { Link } from "wouter";
import { ArrowRight, Brain, Heart, ShieldCheck } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_SECTION_BODY, DASHBOARD_SECTION_HEADER, DASHBOARD_TINTS } from "@/lib/dashboard-premium";
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

  // P0-4: only claim memory when the gated memory signal is backed by real
  // completion evidence (its label contains "remembers"). Otherwise stay honest
  // with "Amy is learning" so we never imply learning that hasn't happened.
  const memorySignal = picked.signals.find((signal) => signal.id === "remembers");
  const memoryBacked = /\bremembers\b/i.test(memorySignal?.label ?? "");
  const cardTitle = memoryBacked ? "Amy remembers" : "Amy is learning";
  const subtitle =
    pickedRoutine?.childName != null
      ? `Latest family intelligence from ${pickedRoutine.childName}`
      : "Amy is learning what works for your household";

  return (
    <Link href={href} className="block">
      {variant === "hub" ? (
        <div className="rounded-xl border border-primary/20 bg-card overflow-hidden hover:border-primary/35 transition-all">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-muted/20">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <div className="min-w-0">
              <span className="font-quicksand font-bold text-xs text-foreground block">{cardTitle}</span>
              <span className="text-[10px] text-muted-foreground truncate block">{subtitle}</span>
            </div>
          </div>
          <div className="p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">{primarySignal?.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">{primarySignal?.detail}</p>
              </div>
            </div>
            {supportSignal ? (
              <p className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
                <Heart className="h-3 w-3 mr-1 inline align-text-bottom text-primary" />
                {supportSignal.detail}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-primary">
              <span>See why Amy planned it this way</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </div>
      ) : (
        <DashboardGlassCard tintRgb={DASHBOARD_TINTS.memory}>
          <div className={DASHBOARD_SECTION_HEADER}>
            <Brain className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
            <div className="min-w-0">
              <span className="font-quicksand font-bold text-xs text-white block">{cardTitle}</span>
              <span className="text-[10px] text-white/55 truncate block">{subtitle}</span>
            </div>
          </div>
          <div className={`${DASHBOARD_SECTION_BODY} space-y-2`}>
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-200 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">{primarySignal?.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/65 line-clamp-2">{primarySignal?.detail}</p>
              </div>
            </div>
            {supportSignal ? (
              <p className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] leading-snug text-white/60 line-clamp-2">
                <Heart className="h-3 w-3 mr-1 inline align-text-bottom text-rose-300" />
                {supportSignal.detail}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-amber-300">
              <span>See why Amy planned it this way</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </div>
          </div>
        </DashboardGlassCard>
      )}
    </Link>
  );
}
