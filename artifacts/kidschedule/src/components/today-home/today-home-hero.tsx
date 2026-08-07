/**
 * Today Home Hero — ONE hero only.
 * Hierarchy: NRT → Why today → Begin → one supporting insight.
 * Structure frozen — Apple micro-craft only.
 */
import { ArrowRight, Sparkles } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import type { TodayNrtDecision } from "@/lib/today-home/resolve-today-nrt";
import type { SupportingInsight } from "@/lib/today-home/supporting-insight";

type Props = {
  decision: TodayNrtDecision;
  insight?: SupportingInsight | null;
  onBegin: () => void;
};

export function TodayHomeHero({ decision, insight, onBegin }: Props) {
  const restMode = decision.cta.kind === "rest";
  const whyId = "today-home-why-text";

  return (
    <section
      aria-label="Today’s next right thing"
      data-testid="today-home-hero"
      className="px-0"
    >
      <DashboardGlassCard
        tintRgb={DASHBOARD_TINTS.timeline}
        rounded="3xl"
        className="th-hero-card border-[rgba(232,212,184,0.22)] bg-gradient-to-br from-[rgba(244,238,230,0.08)] via-amber-500/10 to-transparent"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/85"
              data-testid="today-home-kicker"
            >
              Today’s next right thing
            </p>
            {decision.childName && decision.childName !== "your child" ? (
              <p className="mt-1 text-xs text-white/55" data-testid="today-home-child">
                For {decision.childName}
              </p>
            ) : null}
            <h1
              className="mt-2 font-quicksand text-2xl font-bold leading-snug text-white sm:text-[1.75rem]"
              data-testid="today-home-title"
            >
              {decision.title}
            </h1>
            <p
              id={whyId}
              className="mt-2 text-sm leading-relaxed text-white/75"
              data-testid="today-home-why"
            >
              <span className="font-semibold text-amber-100/90">Why today · </span>
              {decision.why}
            </p>
            {decision.detail ? (
              <p className="mt-2 text-sm leading-relaxed text-white/60" data-testid="today-home-detail">
                {decision.detail}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onBegin}
            data-testid="today-home-begin"
            aria-describedby={whyId}
            className={
              restMode
                ? "flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-3.5 text-base font-bold text-white/90 transition hover:bg-white/[0.12] active:scale-[0.98] motion-reduce:active:scale-100"
                : "flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3.5 text-base font-bold text-[#0a1024] shadow-lg shadow-amber-500/25 transition hover:bg-amber-400 active:scale-[0.98] motion-reduce:active:scale-100"
            }
          >
            {!restMode ? <Sparkles className="h-5 w-5" aria-hidden /> : null}
            {decision.cta.label}
            {!restMode ? <ArrowRight className="h-5 w-5" aria-hidden /> : null}
          </button>

          {insight?.text ? (
            <p
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[13px] leading-snug text-white/70"
              data-testid="today-home-insight"
              data-insight-kind={insight.kind}
            >
              {insight.text}
            </p>
          ) : null}
        </div>
      </DashboardGlassCard>
    </section>
  );
}
