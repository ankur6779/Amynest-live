import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, ChevronUp, Pencil, Plus, Sparkles } from "lucide-react";
import { useUpdateChild, getListChildrenQueryKey, getGetChildQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FixedActivitiesEditor } from "@/components/routines/fixed-activities-editor";
import {
  FIXED_ACTIVITY_TEMPLATES,
  WEEKDAY_LABELS,
  groupActivitiesByWeekday,
  formatTimeRange,
  emptyFixedActivity,
  type FixedActivityDraft,
} from "@/lib/fixed-activities";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function serializeActivities(list: FixedActivityDraft[]): string {
  const valid = list
    .filter((e) => e.activity.trim() && e.days.length > 0 && e.start && e.end)
    .map((e) => ({
      activity: e.activity.trim(),
      days: [...e.days].sort(),
      start: e.start,
      end: e.end,
    }))
    .sort((a, b) => a.activity.localeCompare(b.activity));
  return JSON.stringify(valid);
}

const AGE_SUGGESTION_TEMPLATES = ["tuition", "sports", "dance"] as const;

export function FixedActivitiesInlineCard({
  childId,
  childName,
  childAge,
  activities,
  onActivitiesChange,
  profileActivities,
  highlightDay,
}: {
  childId: number;
  childName: string;
  childAge: number;
  activities: FixedActivityDraft[];
  onActivitiesChange: (next: FixedActivityDraft[]) => void;
  /** Normalized activities from child profile (for dirty detection). */
  profileActivities: FixedActivityDraft[];
  highlightDay?: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateChild = useUpdateChild();

  const [editorOpen, setEditorOpen] = useState(false);
  const [savePromptOpen, setSavePromptOpen] = useState(false);

  const validActivities = useMemo(
    () =>
      activities.filter(
        (e) => e.activity.trim() && e.days.length > 0 && e.start && e.end,
      ),
    [activities],
  );

  const profileSerialized = useMemo(
    () => serializeActivities(profileActivities),
    [profileActivities],
  );
  const isDirty = profileSerialized !== serializeActivities(activities);

  const grouped = useMemo(
    () => groupActivitiesByWeekday(validActivities),
    [validActivities],
  );

  const openEditor = useCallback(() => setEditorOpen(true), []);

  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    if (serializeActivities(activities) !== profileSerialized) {
      setSavePromptOpen(true);
    }
  }, [activities, profileSerialized]);

  useEffect(() => {
    if (!isDirty) setSavePromptOpen(false);
  }, [isDirty]);

  const addTemplate = (key: string) => {
    const tpl = FIXED_ACTIVITY_TEMPLATES.find((x) => x.key === key);
    if (!tpl) return;
    onActivitiesChange([
      ...activities,
      {
        activity: tpl.activity,
        days: [...tpl.days],
        start: tpl.start,
        end: tpl.end,
      },
    ]);
    setEditorOpen(true);
  };

  const saveToProfile = () => {
    const payload =
      validActivities.length > 0
        ? validActivities
        : null;
    updateChild.mutate(
      {
        id: childId,
        data: { fixedActivities: payload },
      },
      {
        onSuccess: () => {
          setSavePromptOpen(false);
          queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetChildQueryKey(childId) });
          toast({
            title: t("pages.routines.fixed.saved_profile", {
              defaultValue: "Weekly activities saved",
            }),
            description: t("pages.routines.fixed.saved_profile_hint", {
              defaultValue: "Future routines will use these times automatically.",
            }),
          });
        },
        onError: () => {
          toast({
            title: t("pages.routines.fixed.save_failed", {
              defaultValue: "Could not save activities",
            }),
            variant: "destructive",
          });
        },
      },
    );
  };

  const who = childName.trim() || "your child";
  const showAgeSuggestions = childAge > 5 && validActivities.length === 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 shadow-sm overflow-hidden">
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <CalendarClock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">
                {t("pages.routines.fixed.inline_title", {
                  defaultValue: "{{name}}'s weekly activities",
                  name: who,
                })}
              </p>
              {validActivities.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("pages.routines.fixed.inline_count", {
                    defaultValue: "{{count}} scheduled",
                    count: validActivities.length,
                  })}
                  {isDirty && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {" "}
                      · {t("pages.routines.fixed.unsaved", { defaultValue: "unsaved" })}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 leading-snug">
                  {t("pages.routines.fixed.empty_title", {
                    defaultValue: "No weekly activities added",
                  })}
                  <br />
                  {t("pages.routines.fixed.empty_subtitle", {
                    defaultValue:
                      "Add tuition, sports, or classes to improve routine accuracy",
                  })}
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant={validActivities.length > 0 ? "outline" : "default"}
            size="sm"
            className="rounded-full shrink-0 h-8 text-xs font-bold"
            onClick={() => (editorOpen ? closeEditor() : openEditor())}
          >
            {validActivities.length > 0 ? (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {t("pages.routines.fixed.edit", { defaultValue: "Edit" })}
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("pages.routines.fixed.add_cta", { defaultValue: "Add activities" })}
              </>
            )}
          </Button>
        </div>

        {validActivities.length > 0 && !editorOpen && (
          <ul className="space-y-1.5 text-xs border-t border-border/50 pt-2">
            {WEEKDAY_LABELS.map((day) => {
              const items = grouped[day];
              if (items.length === 0) return null;
              const isToday =
                highlightDay &&
                day.toLowerCase().startsWith(highlightDay.toLowerCase().slice(0, 3));
              return (
                <li
                  key={day}
                  className={cn(
                    "flex gap-2 rounded-lg px-2 py-1",
                    isToday && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "font-bold w-8 shrink-0",
                      isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {day}
                  </span>
                  <span className="text-foreground/90 min-w-0">
                    {items
                      .map(
                        (a) =>
                          `${a.activity} (${formatTimeRange(a.start, a.end)})`,
                      )
                      .join(" · ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {validActivities.length === 0 && !editorOpen && (
          <div className="flex flex-col gap-2">
            {showAgeSuggestions && (
              <div className="flex flex-wrap gap-1.5">
                {AGE_SUGGESTION_TEMPLATES.map((key) => {
                  const tpl = FIXED_ACTIVITY_TEMPLATES.find((x) => x.key === key);
                  if (!tpl) return null;
                  return (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="rounded-full h-7 text-[11px] font-semibold"
                      onClick={() => addTemplate(key)}
                    >
                      {tpl.emoji}{" "}
                      {t(`pages.routines.fixed.chip_${key}`, {
                        defaultValue:
                          key === "tuition"
                            ? "Add tuition"
                            : key === "sports"
                              ? "Add sports"
                              : "Add class",
                      })}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-primary/80 flex items-center gap-1.5 bg-primary/5 rounded-lg px-2.5 py-1.5 border border-primary/10">
          <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
          {t("pages.routines.fixed.accuracy_hint", {
            defaultValue: "Adding weekly activities improves accuracy",
          })}
        </p>

        {savePromptOpen && isDirty && (
          <div
            className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 space-y-2"
            role="status"
          >
            <p className="text-xs font-medium text-foreground">
              {t("pages.routines.fixed.save_prompt", {
                defaultValue: "Save for future routines?",
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="rounded-full h-8 text-xs"
                disabled={updateChild.isPending}
                onClick={saveToProfile}
              >
                {updateChild.isPending
                  ? t("pages.routines.fixed.saving", { defaultValue: "Saving…" })
                  : t("pages.routines.fixed.save_yes", { defaultValue: "Save to profile" })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full h-8 text-xs"
                onClick={() => setSavePromptOpen(false)}
              >
                {t("pages.routines.fixed.save_skip", {
                  defaultValue: "Just this routine",
                })}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Collapsible
        open={editorOpen}
        onOpenChange={(open) => {
          if (open) setEditorOpen(true);
          else closeEditor();
        }}
      >
        <CollapsibleTrigger className="sr-only" aria-hidden />
        <CollapsibleContent>
          <div className="border-t border-border px-4 py-4 space-y-3 bg-muted/20">
            <FixedActivitiesEditor
              value={activities.length > 0 ? activities : [emptyFixedActivity()]}
              onChange={(next) => {
                const cleaned =
                  next.length === 1 &&
                  !next[0]?.activity.trim() &&
                  next[0]?.days.length === 0
                    ? []
                    : next;
                onActivitiesChange(cleaned);
              }}
              compact
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => onActivitiesChange([...profileActivities])}
              >
                {t("pages.routines.fixed.reset", { defaultValue: "Reset" })}
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={closeEditor}
              >
                {t("pages.routines.fixed.done", { defaultValue: "Done" })}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {editorOpen && (
        <button
          type="button"
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-muted-foreground border-t border-border/50 hover:bg-muted/40"
          onClick={closeEditor}
        >
          <ChevronUp className="h-3 w-3" />
          {t("pages.routines.fixed.collapse", { defaultValue: "Collapse" })}
        </button>
      )}
    </div>
  );
}
