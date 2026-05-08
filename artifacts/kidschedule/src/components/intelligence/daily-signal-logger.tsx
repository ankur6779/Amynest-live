/**
 * DailySignalLogger — Phase 1 of the Adaptive Family Intelligence Engine.
 *
 * Compact card to log today's mood / focus / sleep_quality (1–5 scale)
 * for the selected child. Each scale is rendered as 5 buttons; tapping
 * one POSTs the signal and gives toast feedback.
 *
 * Designed to live on the routines index page so parents can drop a quick
 * morning signal that immediately improves the next routine generation.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListChildren,
  useGetChildIntelligence,
  useLogChildDailySignal,
  getListChildrenQueryKey,
  getGetChildIntelligenceQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ScaleField = "mood" | "focusScore" | "sleepQuality";

function todayStr(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function DailySignalLogger() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = (children ?? []) as Array<{ id: number; name: string }>;
  const [childId, setChildId] = useState<number | null>(null);
  const activeId = childId ?? list[0]?.id ?? null;

  const { data: snap } = useGetChildIntelligence(activeId ?? 0, {
    query: {
      enabled: !!activeId,
      queryKey: getGetChildIntelligenceQueryKey(activeId ?? 0),
    },
  });
  const logSignal = useLogChildDailySignal();

  const today = todayStr();
  const todaysSignal = (snap?.recentSignals ?? []).find((s: any) => s.date === today) as
    | { mood: number | null; focusScore: number | null; sleepQuality: number | null }
    | undefined;

  function send(field: ScaleField, value: number) {
    if (!activeId) return;
    logSignal.mutate(
      { childId: activeId, data: { date: today, [field]: value } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetChildIntelligenceQueryKey(activeId) });
          toast({ title: t("intelligence.signal.saved") });
        },
        onError: () => {
          toast({ title: t("intelligence.signal.save_failed"), variant: "destructive" });
        },
      },
    );
  }

  if (list.length === 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.signal.title")}
          </h3>
          {logSignal.isPending && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" aria-hidden />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t("intelligence.signal.subtitle")}</p>

        {list.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {list.map((c) => {
              const on = (childId ?? list[0]?.id) === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChildId(c.id)}
                  aria-pressed={on}
                  className={
                    "px-2.5 py-1 rounded-full text-xs font-semibold border " +
                    (on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border")
                  }
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {(["mood", "focusScore", "sleepQuality"] as const).map((field) => {
          const cur = todaysSignal?.[field] ?? null;
          return (
            <div key={field} className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t(`intelligence.signal.fields.${field}`)}
              </span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const on = cur === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => send(field, n)}
                      disabled={logSignal.isPending}
                      aria-pressed={on}
                      aria-label={t(`intelligence.signal.scale.${n}`)}
                      className={
                        "flex-1 py-2 rounded-xl text-sm font-bold border transition-colors disabled:opacity-50 " +
                        (on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground border-border hover:border-primary/40")
                      }
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
