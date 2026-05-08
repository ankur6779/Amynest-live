/**
 * ChildGoalsCard — Phase 1 of the Adaptive Family Intelligence Engine.
 *
 * Multi-select chip list for the 5 structured parent goals. Each click
 * toggles the goal in `parentGoals`, then PUTs the new array.
 *
 * Read/write via the generated React Query hooks
 * (`useGetChildIntelligence`, `useUpdateChildGoals`).
 */

import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetChildIntelligence,
  useUpdateChildGoals,
  getGetChildIntelligenceQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GOAL_CODES = [
  "improve_sleep",
  "reduce_tantrums",
  "improve_focus",
  "reduce_screen_time",
  "increase_independence",
] as const;
type GoalCode = (typeof GOAL_CODES)[number];

export function ChildGoalsCard({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetChildIntelligence(childId, {
    query: { enabled: childId > 0, queryKey: getGetChildIntelligenceQueryKey(childId) },
  });
  const updateGoals = useUpdateChildGoals();

  const selected = new Set<GoalCode>(((data?.parentGoals ?? []) as string[]).filter(
    (g): g is GoalCode => (GOAL_CODES as readonly string[]).includes(g),
  ));

  function toggle(code: GoalCode) {
    if (childId <= 0 || updateGoals.isPending) return;
    const next = new Set(selected);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    updateGoals.mutate(
      { childId, data: { parentGoals: Array.from(next) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetChildIntelligenceQueryKey(childId) });
          toast({ title: t("intelligence.goals.saved") });
        },
        onError: () => {
          toast({ title: t("intelligence.goals.save_failed"), variant: "destructive" });
        },
      },
    );
  }

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.goals.title")}
          </h3>
          {updateGoals.isPending && (
            <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" aria-hidden />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t("intelligence.goals.subtitle")}</p>
        <div className="flex flex-wrap gap-2">
          {GOAL_CODES.map((code) => {
            const on = selected.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                disabled={isLoading || updateGoals.isPending}
                aria-pressed={on}
                className={
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors disabled:opacity-50 " +
                  (on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-foreground border-border hover:border-primary/40")
                }
              >
                {t(`intelligence.goals.options.${code}`)}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
