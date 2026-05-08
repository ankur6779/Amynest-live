/**
 * DailySignalLogger — Phase 1 of the Adaptive Family Intelligence Engine.
 *
 * Compact card to log today's mood / focus / sleep_quality (1–5 scale)
 * for the selected child. Each scale is rendered as 5 emoji+label buttons;
 * tapping one POSTs the signal and gives toast feedback.
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

/** Per-field emoji for each rating 1–5. Emojis are universal, labels come from i18n. */
const FIELD_EMOJIS: Record<ScaleField, [string, string, string, string, string]> = {
  mood:         ["😢", "😟", "😐", "😊", "😄"],
  focusScore:   ["😵", "😕", "😐", "🎯", "🔥"],
  sleepQuality: ["😩", "😪", "😐", "😌", "⭐"],
};

/** Selected-state accent colours per field (bg / text / border). */
const FIELD_ACCENT: Record<ScaleField, string> = {
  mood:         "bg-violet-500 text-white border-violet-500", // audit-ok: intentional per-field signal accent
  focusScore:   "bg-indigo-500 text-white border-indigo-500", // audit-ok: intentional per-field signal accent
  sleepQuality: "bg-sky-500   text-white border-sky-500",     // audit-ok: intentional per-field signal accent
};

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
          const emojis = FIELD_EMOJIS[field];
          const accent = FIELD_ACCENT[field];

          return (
            <div key={field} className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t(`intelligence.signal.fields.${field}`)}
              </span>
              <div className="flex gap-1.5">
                {([1, 2, 3, 4, 5] as const).map((n) => {
                  const on = cur === n;
                  const emoji = emojis[n - 1];
                  const label = t(`intelligence.signal.scale.${field}.${n}`);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => send(field, n)}
                      disabled={logSignal.isPending}
                      aria-pressed={on}
                      aria-label={`${label} (${n}/5)`}
                      className={
                        "flex-1 py-1.5 rounded-xl flex flex-col items-center gap-0.5 border transition-all disabled:opacity-50 " +
                        (on
                          ? accent + " shadow-md scale-105"
                          : "bg-muted text-foreground border-border hover:border-primary/40 hover:scale-105")
                      }
                    >
                      <span className="text-xl leading-none">{emoji}</span>
                      <span className="text-[10px] font-semibold leading-tight text-center w-full px-0.5 truncate">
                        {label}
                      </span>
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
