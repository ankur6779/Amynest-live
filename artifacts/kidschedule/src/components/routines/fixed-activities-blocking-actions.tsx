import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FixedActivitiesResult } from "@workspace/api-client-react";

export function FixedActivitiesBlockingActions({
  result,
  childName,
  onAdjustTiming,
  onContinueAnyway,
}: {
  result: FixedActivitiesResult;
  childName?: string;
  onAdjustTiming: () => void;
  onContinueAnyway: () => void;
}) {
  const { t } = useTranslation();
  const who = childName?.trim() || "your child";
  const blocking = (result.conflicts ?? []).filter((c) => c.severity === "blocking");
  const sleepRelated = blocking.filter((c) => c.kind === "sleep" || c.kind === "wake");

  return (
    <div
      className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 sm:p-5 space-y-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-2 min-w-0">
          <h4 className="font-semibold text-foreground">
            {t("pages.routines.fixed.blocking_title", {
              defaultValue: "This may affect rest time",
            })}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {sleepRelated.length > 0
              ? `${who}'s activity runs into bedtime or wake-up, which can mean less sleep or a rushed wind-down.`
              : `${who}'s activity times need a small fix before this routine is safe to save.`}
          </p>
          {blocking.map((c, i) => (
            <p key={i} className="text-xs text-foreground/80">
              <span className="font-medium">{c.warning}</span>
              {" — "}
              <span className="text-primary">{c.suggestion}</span>
            </p>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-full flex-1 border-primary/40"
          onClick={onAdjustTiming}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t("pages.routines.fixed.adjust_timing", { defaultValue: "Adjust timing" })}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="rounded-full flex-1"
          onClick={onContinueAnyway}
        >
          {t("pages.routines.fixed.continue_anyway", { defaultValue: "Continue anyway" })}
        </Button>
      </div>
    </div>
  );
}
