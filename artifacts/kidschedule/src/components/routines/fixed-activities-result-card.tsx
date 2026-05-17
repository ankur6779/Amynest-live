import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FixedActivitiesResult } from "@workspace/api-client-react";
import { personalizeFixedSummary } from "@/lib/fixed-activities";

export function FixedActivitiesResultCard({
  result,
  childName,
  defaultAdvanced,
}: {
  result: FixedActivitiesResult | null | undefined;
  childName?: string;
  defaultAdvanced?: boolean;
}) {
  const { t } = useTranslation();
  const [advanced, setAdvanced] = useState(defaultAdvanced ?? false);

  if (!result?.fixedActivitiesApplied) return null;

  const conflicts = result.conflicts ?? [];
  const blocking = conflicts.filter((c) => c.severity === "blocking");
  const nonBlocking = conflicts.filter((c) => c.severity !== "blocking");
  const shifts = result.shiftsApplied ?? [];
  const adjusted = (result.conflicts?.length ?? 0) > 0 || shifts.length > 0;
  const summary =
    result.summaryMessage ??
    personalizeFixedSummary(childName, adjusted);

  return (
    <Card
      className={`rounded-3xl border-none shadow-sm bg-card ${
        result.hasBlockingConflicts
          ? "border-l-4 border-l-destructive"
          : "border-l-4 border-l-primary"
      }`}
    >
      <CardContent className="p-5 sm:p-6 space-y-3">
        <div className="flex items-start gap-2">
          {result.hasBlockingConflicts ? (
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
              <h3 className="font-quicksand text-base font-bold">
                {t("pages.routines.fixed.result_title", {
                  defaultValue: "Weekly activities",
                })}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{summary}</p>
            {result.activitiesForToday && result.activitiesForToday.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("pages.routines.fixed.applied_today", {
                  defaultValue: "Today:",
                })}{" "}
                <strong className="text-foreground">
                  {result.activitiesForToday.join(", ")}
                </strong>
              </p>
            )}
          </div>
        </div>

        {nonBlocking.length > 0 && (
          <ul className="space-y-2">
            {nonBlocking.map((c, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm rounded-xl bg-primary/5 border border-primary/20 px-3 py-2"
              >
                <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{c.warning}</p>
                  <p className="text-primary text-xs mt-1 font-medium">{c.suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {result.hasBlockingConflicts && blocking.length > 0 && (
          <ul className="space-y-2" role="alert">
            {blocking.map((c, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2"
              >
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden />
                <div>
                  <p className="font-medium text-foreground">{c.warning}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{c.suggestion}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {shifts.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            onClick={() => setAdvanced((v) => !v)}
          >
            {advanced ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                {t("pages.routines.fixed.hide_details", { defaultValue: "Hide details" })}
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                {t("pages.routines.fixed.show_details", { defaultValue: "Show timing changes" })}
              </>
            )}
          </Button>
        )}

        {advanced && shifts.length > 0 && (
          <ul className="space-y-1 pt-1 border-t border-border/50">
            {shifts.map((s, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{s.activity}</span>
                {s.from && s.to ? ` · ${s.from} → ${s.to}` : null}
                {s.reason ? ` — ${s.reason}` : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
