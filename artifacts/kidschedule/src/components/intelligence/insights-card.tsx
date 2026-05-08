/**
 * InsightsCard — Phase 2 of the Adaptive Family Intelligence Engine.
 *
 * Surfaces:
 *   1. Risk windows  — hour-of-day buckets where negative behaviours cluster,
 *      with a preemptive activity suggestion.
 *   2. Correlations  — routine activity categories ranked by the +/- behaviour
 *      counts they precede in the next 2 hours.
 *
 * When neither dataset has any rows, the card hides entirely so we don't
 * pollute the child detail page on day one.
 */

import { useTranslation } from "react-i18next";
import {
  useGetChildIntelligenceInsights,
  getGetChildIntelligenceInsightsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Link2, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmtHour(h: number): string {
  const hh = ((h + 11) % 12) + 1;
  const ap = h < 12 ? "AM" : "PM";
  return `${hh} ${ap}`;
}

export function InsightsCard({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useGetChildIntelligenceInsights(childId, {
    query: {
      enabled: childId > 0,
      queryKey: getGetChildIntelligenceInsightsQueryKey(childId),
    },
  });

  if (childId <= 0) return null;
  if (isLoading) return null;

  const risk = data?.riskWindows ?? [];
  const corr = data?.correlations ?? [];
  if (risk.length === 0 && corr.length === 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-4">
        {risk.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-quicksand text-base font-bold text-foreground">
                {t("intelligence.insights.risk.title")}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("intelligence.insights.risk.subtitle")}
            </p>
            <ul className="flex flex-col gap-2 pt-1">
              {risk.map((w, i) => (
                <li
                  key={`${w.startHour}-${i}`}
                  className="text-sm text-foreground bg-muted rounded-xl px-3 py-2 border border-border flex flex-col gap-1"
                >
                  <span className="font-medium">
                    {fmtHour(w.startHour)} – {fmtHour(w.endHour)} ·{" "}
                    {t("intelligence.insights.risk.events", { count: w.negativeCount })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(`intelligence.insights.risk.suggestions.${w.suggestion}`, {
                      defaultValue: w.suggestion,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {corr.length > 0 && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-quicksand text-base font-bold text-foreground">
                {t("intelligence.insights.correlations.title")}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("intelligence.insights.correlations.subtitle")}
            </p>
            <ul className="flex flex-col gap-2 pt-1">
              {corr.map((c) => (
                <li
                  key={c.category}
                  className="text-sm bg-muted rounded-xl px-3 py-2 border border-border flex items-center justify-between"
                >
                  <span className="text-foreground capitalize">{c.category}</span>
                  <span className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-primary">
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      {c.positive}
                    </span>
                    <span className="flex items-center gap-1 text-destructive">
                      <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
                      {c.negative}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
