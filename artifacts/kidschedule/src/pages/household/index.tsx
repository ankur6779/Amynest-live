// Household tab — simplified family-day view for parents

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useGetHouseholdConflicts,
  useOrchestrateHousehold,
  getGetHouseholdConflictsQueryKey,
} from "@workspace/api-client-react";
import type {
  HouseholdConflict,
  HouseholdResolution,
  HouseholdRoutineState,
  HouseholdTimelineSlot,
} from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Users,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  buildSimplifiedTimeline,
  householdBalanceMessage,
} from "@/lib/schedule-insights";
import { ViewDetailsCollapsible } from "@/components/schedule/view-details-collapsible";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function conflictAction(
  conflict: HouseholdConflict,
  t: (k: string, o?: { defaultValue?: string }) => string,
): string {
  if (conflict.kind === "shared_activity_opportunity") {
    return t("schedule.household_action_opportunity", {
      defaultValue: "Block a shared family activity — everyone can join in.",
    });
  }
  return conflict.explanation.split(".")[0] + (conflict.explanation.includes(".") ? "." : "");
}

function DetailedTimelinePanel({
  slots,
  t,
}: {
  slots: HouseholdTimelineSlot[];
  t: (k: string) => string;
}) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("household.no_timeline")}</p>;
  }
  return (
    <div className="space-y-2">
      {slots.map((slot, i) => (
        <div
          key={i}
          className={`rounded-lg p-3 border ${slot.hasConflict ? "border-amber-300 bg-amber-50 dark:bg-amber-950/20" : "border-slate-200 dark:border-slate-800"}`}
        >
          <p className="text-sm font-semibold mb-2">
            {slot.startTime} – {slot.endTime}
          </p>
          <div className="space-y-1">
            {slot.entries.map((e, j) => (
              <div key={j} className="flex justify-between text-sm gap-2">
                <span className="text-muted-foreground shrink-0">{e.childName}</span>
                <span className="text-right">{e.item.activity}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HouseholdPage() {
  const { t } = useTranslation();
  const [date] = useState<string>(todayIso());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useGetHouseholdConflicts({ date });
  const orchestrate = useOrchestrateHousehold();
  const state = data as HouseholdRoutineState | undefined;

  const resolutionsByConflict = useMemo(() => {
    const map = new Map<string, HouseholdResolution>();
    state?.resolutions?.forEach((r) => map.set(r.conflictId, r));
    return map;
  }, [state?.resolutions]);

  const simplifiedBlocks = useMemo(
    () => (state ? buildSimplifiedTimeline(state.timeline) : []),
    [state?.timeline],
  );

  const balanceMessage = state
    ? householdBalanceMessage(state.summary.overallScore)
    : "";

  const topConflicts = state?.conflicts.filter((c) => c.kind !== "shared_activity_opportunity").slice(0, 3) ?? [];
  const opportunities =
    state?.conflicts.filter((c) => c.kind === "shared_activity_opportunity").slice(0, 2) ?? [];

  const handleApply = async (conflictId: string) => {
    if (!state) return;
    try {
      await orchestrate.mutateAsync({
        data: {
          date,
          dryRun: false,
          routines: state.originalRoutines,
          caregivers: [
            { caregiver: "mom", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
            { caregiver: "dad", capacity: 1, windows: [{ start: "06:00", end: "22:00" }] },
          ],
        },
      });
      setAppliedIds((prev) => new Set(prev).add(conflictId));
      await queryClient.invalidateQueries({ queryKey: getGetHouseholdConflictsQueryKey({ date }) });
      void refetch();
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t("household.title")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("schedule.household_subtitle", {
            defaultValue: "How the whole family's day fits together.",
          })}
        </p>
      </div>

      <Card className="border border-border/60">
        <CardContent className="p-4 flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{date}</span>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">{t("common.error_generic")}</CardContent>
        </Card>
      )}

      {state && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 flex items-start gap-3">
              <Heart className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-lg font-bold text-foreground">{balanceMessage}</p>
                {state.summary.totalConflicts > 0 ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("schedule.household_conflicts_count", {
                      defaultValue: "{{count}} items to review below",
                      count: state.summary.totalConflicts,
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("household.no_conflicts")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {simplifiedBlocks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("schedule.household_day_overview", { defaultValue: "Your day at a glance" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {simplifiedBlocks.map((block) => (
                  <div key={block.part}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-foreground">{block.label}</p>
                      {block.hasConflict && (
                        <Badge variant="outline" className="text-amber-700 border-amber-400 text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t("household.conflict")}
                        </Badge>
                      )}
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {block.activities.map((a, i) => (
                        <li
                          key={i}
                          className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border border-border text-foreground"
                        >
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(topConflicts.length > 0 || opportunities.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("schedule.what_to_do", { defaultValue: "What you can do" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topConflicts.map((c) => {
                  const resolution = resolutionsByConflict.get(c.id);
                  return (
                    <div
                      key={c.id}
                      className="rounded-xl border border-border/60 bg-card p-3 space-y-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {t(`household.kind.${c.kind}`, { defaultValue: c.kind })}
                      </p>
                      <p className="text-sm text-muted-foreground">{conflictAction(c, t)}</p>
                      {resolution && resolution.strategy !== "no_action" && (
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={orchestrate.isPending || appliedIds.has(c.id)}
                          onClick={() => handleApply(c.id)}
                        >
                          {appliedIds.has(c.id) ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("household.applied")}
                            </>
                          ) : (
                            t("household.apply_resolution")
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
                {opportunities.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3"
                  >
                    <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      {t("household.opportunity")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{conflictAction(c, t)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <ViewDetailsCollapsible>
            <DetailedTimelinePanel slots={state.timeline} t={t} />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{t("household.summary.sleep")}</p>
                  <p className="text-xl font-bold">{state.summary.sleepIntegrityScore}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">{t("household.summary.shared")}</p>
                  <p className="text-xl font-bold">{state.summary.sharedActivityWindows}</p>
                </CardContent>
              </Card>
            </div>
          </ViewDetailsCollapsible>
        </>
      )}
    </div>
  );
}
