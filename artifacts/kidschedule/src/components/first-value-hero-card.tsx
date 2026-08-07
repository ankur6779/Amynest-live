import { Sparkles, ArrowRight, Clock } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";

type Props = {
  childName?: string | null;
  onGenerate: () => void;
  /** Inherited first-experience success — continue the story, never restart. */
  continuityLine?: string | null;
};

/**
 * Primary first-value CTA — shown when parent has no routine for today.
 * Production evidence: only 18% of dashboard users reached /routines/generate.
 */
export function FirstValueHeroCard({ childName, onGenerate, continuityLine }: Props) {
  const continuing = Boolean(continuityLine?.trim());
  const label = continuing
    ? childName
      ? `Continue with ${childName} today`
      : "Continue with today"
    : childName
      ? `See today’s plan for ${childName}`
      : "See today’s plan";

  return (
    <DashboardGlassCard
      tintRgb={DASHBOARD_TINTS.timeline}
      className="border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5"
      data-testid="first-value-hero-card"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20"
            aria-hidden
          >
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200/80">
              {continuing ? "Still with you" : "Your next step"}
            </p>
            <h2 className="font-quicksand text-lg font-bold leading-snug text-white sm:text-xl">
              {label}
            </h2>
            <p className="mt-1 text-sm text-white/70">
              {continuing
                ? continuityLine
                : "A clear day for meals, rest, play, and bedtime — shaped around your child."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          data-testid="first-value-generate-btn"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3.5 text-base font-bold text-[#0a1024] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[0.98]"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
          {continuing ? "Continue today’s plan" : "See today’s plan"}
          <ArrowRight className="h-5 w-5" aria-hidden />
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-white/50">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {continuing
            ? "Yesterday mattered. Today continues when you are ready."
            : "Most parents finish in under 10 minutes"}
        </p>
      </div>
    </DashboardGlassCard>
  );
}
