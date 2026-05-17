// Explain tab — parent-friendly "Why this routine?" insights

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useExplainRoutine,
  useGetExplainHistory,
  useListRoutines,
  getListRoutinesQueryKey,
} from "@workspace/api-client-react";
import type { ExplanationResponse, ExplanationAuditEntry } from "@workspace/api-zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Lightbulb, CheckCircle2 } from "lucide-react";
import { getLastGenSettings } from "@/pages/routines/generate";
import {
  insightBulletsFromExplanation,
  keyFactorLabels,
  parentActionFromExplanation,
} from "@/lib/schedule-insights";
import { ViewDetailsCollapsible } from "@/components/schedule/view-details-collapsible";
import { WhyCard } from "./why-card";

export { WhyCard } from "./why-card";

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function factorBadgeLabel(key: string, t: (k: string, o?: { defaultValue?: string }) => string): string {
  const map: Record<string, string> = {
    mood: t("schedule.factors.mood", { defaultValue: "Mood" }),
    weather: t("schedule.factors.weather", { defaultValue: "Weather" }),
    school: t("schedule.factors.school", { defaultValue: "School" }),
    sleep: t("schedule.factors.sleep", { defaultValue: "Sleep" }),
  };
  return map[key] ?? key;
}

function RoutineInsightsView({ data }: { data: ExplanationResponse }) {
  const { t } = useTranslation();
  const action = parentActionFromExplanation(data);
  const bullets = insightBulletsFromExplanation(data);
  const factors = keyFactorLabels(data);

  return (
    <div className="space-y-4">
      <Card className="border border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            {t("schedule.why_routine_title", { defaultValue: "Why this routine?" })}
          </h2>
          <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>

          <div className="flex flex-wrap gap-2">
            {factors.map((f) => (
              <Badge key={f} variant="secondary" className="text-xs font-semibold">
                {factorBadgeLabel(f, t)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-600 shrink-0" />
            {t("schedule.what_amy_considered", { defaultValue: "What Amy considered" })}
          </p>
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2 leading-snug">
                <span className="text-primary font-bold shrink-0">•</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="p-5">
          <p className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            {t("schedule.what_to_do", { defaultValue: "What you can do" })}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{action}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditRow({ entry }: { entry: ExplanationAuditEntry }) {
  return (
    <div className="py-2 border-b last:border-0 text-sm">
      <p className="text-xs text-foreground line-clamp-2">{entry.summary}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {new Date(entry.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

export default function ExplainPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<ExplanationResponse | undefined>();
  const explainMutation = useExplainRoutine();
  const historyQuery = useGetExplainHistory({ limit: 10 });
  const { data: routines } = useListRoutines(undefined, {
    query: { queryKey: getListRoutinesQueryKey() },
  });

  useEffect(() => {
    const last = getLastGenSettings();
    const today = todayStr();
    const todayRoutine = (routines as { date?: string; adaptations?: string[] }[] | undefined)?.find(
      (r) => r.date?.slice(0, 10) === today,
    );

    const context: Record<string, unknown> = {};
    if (last?.mood) context.mood = last.mood;
    if (last?.weatherOutdoor) context.weatherOutdoor = last.weatherOutdoor;
    if (last?.caregiver) context.caregiver = last.caregiver;
    if (todayRoutine?.adaptations?.length) context.adaptations = todayRoutine.adaptations;

    explainMutation.mutate(
      { data: { context, sourceEngine: "hybrid", withNarrative: false } },
      {
        onSuccess: (data) => {
          setResult(data as ExplanationResponse);
          historyQuery.refetch();
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when routines available
  }, [routines?.length]);

  const loading = explainMutation.isPending && !result;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("explain.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("schedule.why_subtitle", {
            defaultValue: "Plain-language insight into today's plan — no forms required.",
          })}
        </p>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      )}

      {result && <RoutineInsightsView data={result} />}

      {!loading && !result && explainMutation.isError && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("schedule.why_unavailable", {
              defaultValue: "Generate a routine first — Amy will explain how it was built.",
            })}
          </CardContent>
        </Card>
      )}

      {result && (
        <ViewDetailsCollapsible>
          <WhyCard data={result} defaultOpen />
          {historyQuery.data && historyQuery.data.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-bold text-muted-foreground mb-2">
                  {t("explain.history_heading")}
                </p>
                {(historyQuery.data as ExplanationAuditEntry[]).map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          )}
        </ViewDetailsCollapsible>
      )}
    </div>
  );
}
