import { CheckCircle2, XCircle, MinusCircle, TrendingUp, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useRealityDashboard } from "@/hooks/use-reality-dashboard";

const SCORECARD_STYLE: Record<string, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-600" },
  partial_success: { icon: TrendingUp, className: "text-blue-600" },
  no_impact: { icon: MinusCircle, className: "text-muted-foreground" },
  negative_impact: { icon: XCircle, className: "text-red-500" },
  pending_validation: { icon: BarChart3, className: "text-amber-600" },
};

function ScorecardIcon({ scorecard }: { scorecard: string }) {
  const style = SCORECARD_STYLE[scorecard] ?? SCORECARD_STYLE.pending_validation!;
  const Icon = style.icon;
  return <Icon className={`h-4 w-4 shrink-0 ${style.className}`} aria-hidden />;
}

export function RealityDashboardPanel() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useRealityDashboard();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (isError || !data) return null;

  const { dashboard, strategyProfile } = data;
  if (dashboard.recommendationsMade === 0) return null;

  return (
    <section
      className="rounded-xl border bg-card p-4 space-y-3"
      aria-label={t("parent_hub.reality.title", "What actually worked")}
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="font-semibold text-sm">
          {t("parent_hub.reality.title", "What actually worked")}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <Stat label={t("parent_hub.reality.recommended", "Recommended")} value={dashboard.recommendationsMade} />
        <Stat label={t("parent_hub.reality.acted", "You acted")} value={dashboard.actionsCompleted} />
        <Stat label={t("parent_hub.reality.worked", "Worked")} value={dashboard.interventionsWorked} />
        <Stat label={t("parent_hub.reality.failed", "No impact")} value={dashboard.interventionsFailed} />
      </div>

      {strategyProfile?.globalBenchmarks && (
        <p className="text-xs text-muted-foreground">
          {t(
            "parent_hub.reality.benchmark",
            "Compared to {{cohort}}: routine top {{routine}}%, learning top {{learning}}%",
            {
              cohort: strategyProfile.globalBenchmarks.cohortLabel,
              routine: strategyProfile.globalBenchmarks.routinePercentile,
              learning: strategyProfile.globalBenchmarks.learningPercentile,
            },
          )}
        </p>
      )}

      {dashboard.recentValidations.length > 0 && (
        <ul className="space-y-2">
          {dashboard.recentValidations.slice(0, 4).map((v, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <ScorecardIcon scorecard={v.scorecard} />
              <div className="min-w-0">
                <p className="font-medium truncate">{v.title}</p>
                <p className="text-muted-foreground">{v.deltaSummary}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {dashboard.topEffective.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">
            {t("parent_hub.reality.best_for_you", "Best for your family")}
          </p>
          <div className="flex flex-wrap gap-1">
            {dashboard.topEffective.slice(0, 3).map((item) => (
              <span
                key={item.key}
                className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              >
                {item.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
