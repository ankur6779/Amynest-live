import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { AmyIcon } from "@/components/amy-icon";

type Severity = "good" | "caution" | "risk";
type Indicator = { label: string; emoji: string; severity: Severity };

type Prediction = {
  generatedAt: string;
  forDate: string;
  childId: number | null;
  childName: string | null;
  mood: Indicator;
  energy: Indicator;
  sleep: Indicator;
  risk: Indicator;
  confidence: "Low" | "Medium" | "High";
  suggestions: string[];
  message: string;
  dataPoints: {
    behaviorsConsidered: number;
    routinesConsidered: number;
    avgRoutineCompletion: number;
    daysOfData: number;
  };
};

const SEV_BG: Record<Severity, string> = {
  good: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  caution: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
  risk: "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300",
};

const SEV_DOT: Record<Severity, string> = {
  good: "bg-emerald-500",
  caution: "bg-amber-500",
  risk: "bg-rose-500",
};

const CONF_BG: Record<Prediction["confidence"], string> = {
  Low: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  Medium: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  High: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
};

const CONF_KEY: Record<Prediction["confidence"], "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
};

interface FuturePredictorProps {
  childId?: number | null;
  variant?: "full" | "compact";
}

export function FuturePredictor({
  childId,
  variant = "full",
}: FuturePredictorProps) {
  const authFetch = useAuthFetch();
  const { t } = useTranslation();

  const queryKey = ["future-predictor", childId ?? null];

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Prediction>({
    queryKey,
    queryFn: async () => {
      const url = childId
        ? `/api/future-predictor?childId=${childId}`
        : `/api/future-predictor`;
      const r = await authFetch(url);
      if (!r.ok) throw new Error(`Failed: ${r.status}`);
      return r.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  if (isLoading) {
    return (
      <Card className="rounded-3xl border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-amber-500/5 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <AmyIcon size={36} ring />
            <div className="flex-1">
              <div className="h-4 w-40 bg-white/20 rounded animate-pulse mb-2" />
              <div className="h-3 w-56 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return null; // silently hide if no children / error
  }

  const indicators: { key: string; title: string; ind: Indicator }[] = [
    { key: "mood", title: t("parent_hub.predictor.indicators.mood"), ind: data.mood },
    { key: "energy", title: t("parent_hub.predictor.indicators.energy"), ind: data.energy },
    { key: "sleep", title: t("parent_hub.predictor.indicators.sleep"), ind: data.sleep },
    { key: "risk", title: t("parent_hub.predictor.indicators.risk"), ind: data.risk },
  ];

  return (
    <Card
      data-testid="card-future-predictor"
      className="rounded-3xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-amber-500/10 backdrop-blur-xl shadow-[0_8px_30px_-8px_rgba(168,85,247,0.35)] overflow-hidden"
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <AmyIcon size={42} ring bounce />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {t("parent_hub.predictor.title")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.childName
                ? t("parent_hub.predictor.for_child", { name: data.childName })
                : t("parent_hub.predictor.family_forecast")}{" "}
              · {data.forDate}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t("parent_hub.predictor.refresh_aria")}
            className="shrink-0 h-8 w-8 rounded-full bg-white/40 dark:bg-white/10 hover:bg-white/60 dark:hover:bg-white/20 flex items-center justify-center transition disabled:opacity-50"
            data-testid="button-refresh-predictor"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Amy message — message text comes from the AI backend (out of scope) */}
        <p className="text-sm sm:text-base font-medium leading-relaxed text-foreground/90 italic">
          "{data.message}"
        </p>

        {/* Indicators grid */}
        <div className="grid grid-cols-2 gap-2">
          {indicators.map((it) => (
            <div
              key={it.key}
              className={`rounded-2xl border px-3 py-2.5 ${SEV_BG[it.ind.severity]}`}
              data-testid={`indicator-${it.key}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase tracking-wide font-bold opacity-70">
                  {it.title}
                </span>
                <span className={`h-2 w-2 rounded-full ${SEV_DOT[it.ind.severity]}`} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg leading-none">{it.ind.emoji}</span>
                <span className="text-sm font-semibold leading-tight">{it.ind.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        {variant === "full" && data.suggestions.length > 0 && (
          <div className="rounded-2xl bg-white/40 dark:bg-white/[0.04] border border-white/40 dark:border-white/10 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {t("parent_hub.predictor.suggestions_title")}
            </p>
            <ul className="space-y-1.5">
              {data.suggestions.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug">
                  <span className="text-purple-500 font-bold">·</span>
                  <span className="text-foreground/85">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer: confidence + data points */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
          <span
            className={`px-2.5 py-1 rounded-full border font-bold ${CONF_BG[data.confidence]}`}
          >
            {t(`parent_hub.predictor.confidence.${CONF_KEY[data.confidence]}`)}
            {t("parent_hub.predictor.confidence.suffix")}
          </span>
          <span className="text-muted-foreground">
            {t("parent_hub.predictor.footer", {
              days: data.dataPoints.daysOfData,
              logs: data.dataPoints.behaviorsConsidered,
              routines: data.dataPoints.routinesConsidered,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
