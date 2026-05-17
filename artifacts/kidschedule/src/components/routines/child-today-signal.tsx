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
import { Button } from "@/components/ui/button";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DailySignalLogger } from "@/components/intelligence/daily-signal-logger";
import {
  CHILD_TODAY_SIGNAL_MAP,
  inferChildTodayState,
  type ChildTodayState,
} from "@/lib/child-today-signal";

function todayStr(): string {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

const OPTIONS: {
  value: ChildTodayState;
  emoji: string;
  labelKey: string;
  labelDefault: string;
}[] = [
  { value: "energetic", emoji: "⚡", labelKey: "intelligence.signal.child_today.energetic", labelDefault: "Energetic" },
  { value: "balanced", emoji: "😊", labelKey: "intelligence.signal.child_today.balanced", labelDefault: "Balanced" },
  { value: "low_energy", emoji: "😴", labelKey: "intelligence.signal.child_today.low_energy", labelDefault: "Low energy" },
  { value: "needs_calming", emoji: "🌿", labelKey: "intelligence.signal.child_today.needs_calming", labelDefault: "Needs calming" },
];

export function ChildTodaySignal() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = (children ?? []) as Array<{ id: number; name: string }>;
  const [childId, setChildId] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeId = childId ?? list[0]?.id ?? null;

  const { data: snap } = useGetChildIntelligence(activeId ?? 0, {
    query: {
      enabled: !!activeId,
      queryKey: getGetChildIntelligenceQueryKey(activeId ?? 0),
    },
  });
  const logSignal = useLogChildDailySignal();

  const today = todayStr();
  const todaysSignal = (snap?.recentSignals ?? []).find((s: { date: string }) => s.date === today) as
    | { mood: number | null; focusScore: number | null; sleepQuality: number | null }
    | undefined;

  const selected = inferChildTodayState(
    todaysSignal?.mood,
    todaysSignal?.focusScore,
    todaysSignal?.sleepQuality,
  );

  function select(state: ChildTodayState) {
    if (!activeId) return;
    const mapped = CHILD_TODAY_SIGNAL_MAP[state];
    logSignal.mutate(
      {
        childId: activeId,
        data: { date: today, ...mapped },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetChildIntelligenceQueryKey(activeId),
          });
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.signal.child_today.title", {
              defaultValue: "How is your child today?",
            })}
          </h3>
          {logSignal.isPending && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" aria-hidden />
          )}
        </div>

        {list.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {list.map((c) => {
              const on = activeId === c.id;
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

        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((opt) => {
            const active = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={logSignal.isPending}
                onClick={() => select(opt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all ${
                  active
                    ? "border-primary bg-primary/10 shadow-sm scale-[1.02]"
                    : "border-border bg-muted/30 hover:border-primary/40"
                }`}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span
                  className={`text-xs font-bold text-center leading-tight ${
                    active ? "text-primary" : "text-foreground"
                  }`}
                >
                  {t(opt.labelKey, { defaultValue: opt.labelDefault })}
                </span>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          {advancedOpen ? (
            <ChevronUp className="h-3.5 w-3.5 mr-1" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 mr-1" />
          )}
          {t("intelligence.signal.child_today.advanced", { defaultValue: "Advanced" })}
        </Button>

        {advancedOpen && activeId != null && (
          <div className="pt-1 border-t border-border">
            <DailySignalLogger embedded childId={activeId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
