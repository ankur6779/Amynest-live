import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FixedActivitiesEditor } from "./fixed-activities-editor";
import { FixedActivitiesResultCard } from "./fixed-activities-result-card";
import { FixedActivitiesWeeklyView } from "./fixed-activities-weekly-view";
import { FixedActivitiesWeeklyInsights } from "./fixed-activities-weekly-insights";
import { FixedActivitiesBlockingActions } from "./fixed-activities-blocking-actions";
import type { FixedActivitiesResult } from "@workspace/api-client-react";
import type { FixedActivityDraft } from "@/lib/fixed-activities";
import { weekdayLabelFromRoutineDate } from "@/lib/fixed-activities-utils";

export function FixedActivitiesReviewPanel({
  date,
  childName,
  fixedActivities,
  onFixedActivitiesChange,
  result,
  blockingConfirmed,
  onBlockingConfirmedChange,
  onRegenerate,
  onSave,
  isRegenerating,
  isSaving,
}: {
  date: string;
  childName?: string;
  fixedActivities: FixedActivityDraft[];
  onFixedActivitiesChange: (next: FixedActivityDraft[]) => void;
  result: FixedActivitiesResult | null;
  blockingConfirmed: boolean;
  onBlockingConfirmedChange: (v: boolean) => void;
  onRegenerate: () => void;
  onSave: () => void;
  isRegenerating: boolean;
  isSaving: boolean;
}) {
  const { t } = useTranslation();
  const editorRef = useRef<HTMLDivElement>(null);
  const highlightDay = weekdayLabelFromRoutineDate(date);
  const hasBlocking = result?.hasBlockingConflicts ?? false;
  const showBlockingGate = hasBlocking && !blockingConfirmed;
  const canSave = !showBlockingGate;

  const scrollToEditor = () => {
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    onBlockingConfirmedChange(false);
  };

  return (
    <Card className="rounded-3xl border-2 border-primary/30 shadow-md overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="font-quicksand text-lg font-bold">
            {t("pages.routines.fixed.review_title", {
              defaultValue: "Review weekly activities",
            })}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("pages.routines.fixed.review_hint", {
              defaultValue:
                "Edit times below or regenerate the routine — no need to go back.",
            })}
          </p>
        </div>

        {result && (
          <FixedActivitiesResultCard result={result} childName={childName} />
        )}

        <FixedActivitiesWeeklyInsights
          activities={fixedActivities}
          childName={childName}
        />

        <FixedActivitiesWeeklyView activities={fixedActivities} highlightDay={highlightDay} />

        {hasBlocking && result && !blockingConfirmed && (
          <FixedActivitiesBlockingActions
            result={result}
            childName={childName}
            onAdjustTiming={scrollToEditor}
            onContinueAnyway={() => onBlockingConfirmedChange(true)}
          />
        )}

        <div ref={editorRef} id="fixed-activities-editor-anchor">
          <FixedActivitiesEditor
            value={fixedActivities}
            onChange={(next) => {
              onBlockingConfirmedChange(false);
              onFixedActivitiesChange(next);
            }}
            compact
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full flex-1"
            onClick={onRegenerate}
            disabled={isRegenerating || isSaving}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
            {t("pages.routines.fixed.regenerate", { defaultValue: "Regenerate routine" })}
          </Button>
          <Button
            type="button"
            className="rounded-full flex-1"
            onClick={onSave}
            disabled={!canSave || isSaving || isRegenerating}
          >
            <Save className="h-4 w-4 mr-2" />
            {t("pages.routines.fixed.save_routine", { defaultValue: "Save routine" })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
