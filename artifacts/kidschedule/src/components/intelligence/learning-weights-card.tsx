/**
 * LearningWeightsCard — Phase 3 of the Adaptive Family Intelligence Engine.
 *
 * Surfaces the closed-loop learning weights derived from behaviors and per-
 * item completion. Hidden until there's enough signal (sample >= 5).
 *
 * Web counterpart of `components/intelligence/LearningWeightsCard.tsx` in the
 * mobile app.
 */

import { useTranslation } from "react-i18next";
import {
  useGetChildLearningWeights,
  getGetChildLearningWeightsQueryKey,
  useListChildren,
  getListChildrenQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

const MIN_SAMPLE = 5;
const STRONG = 0.3;

export function LearningWeightsCard({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();
  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), enabled: childId === undefined },
  });
  const list = (children ?? []) as Array<{ id: number; name: string }>;
  const activeId = childId ?? list[0]?.id ?? 0;
  const { data, isLoading } = useGetChildLearningWeights(activeId, {
    query: { enabled: activeId > 0, queryKey: getGetChildLearningWeightsQueryKey(activeId) },
  });

  if (activeId <= 0) return null;
  if (!isLoading && (!data || data.sample < MIN_SAMPLE)) return null;

  const boosts = (data?.categoryWeights ?? []).filter((c) => c.weight >= STRONG).slice(0, 3);
  const demotes = (data?.categoryWeights ?? []).filter((c) => c.weight <= -STRONG).slice(0, 3);
  const slots = (data?.slotSuccess ?? []).filter((s) => s.hour >= 6 && s.hour <= 22);
  const maxRate = Math.max(100, ...slots.map((s) => s.completionRate));

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.learning.title")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("intelligence.learning.subtitle")}
        </p>

        {isLoading && (
          <p className="text-sm text-muted-foreground">
            {t("intelligence.learning.loading")}
          </p>
        )}

        {data && data.sample >= MIN_SAMPLE && (
          <>
            {boosts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("intelligence.learning.boost_title")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {boosts.map((c) => (
                    <span
                      key={c.category}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {c.category} · +{c.positive}/−{c.negative}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {demotes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("intelligence.learning.demote_title")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {demotes.map((c) => (
                    <span
                      key={c.category}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20"
                    >
                      {c.category} · +{c.positive}/−{c.negative}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {slots.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("intelligence.learning.slot_title")}
                </p>
                <div className="flex flex-col gap-1">
                  {slots.map((s) => {
                    const widthPct = Math.round((s.completionRate / maxRate) * 100);
                    const low = s.completionRate <= 40 && s.sample >= 3;
                    return (
                      <div key={s.hour} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-muted-foreground tabular-nums">
                          {t("intelligence.learning.slot_axis_hour", {
                            hour: String(s.hour).padStart(2, "0"),
                          })}
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden border border-border">
                          <div
                            className={
                              "h-full rounded-full " +
                              (low ? "bg-destructive" : "bg-primary")
                            }
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-foreground font-medium tabular-nums">
                          {s.completionRate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
