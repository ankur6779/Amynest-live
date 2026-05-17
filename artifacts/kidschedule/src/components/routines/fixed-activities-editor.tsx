import { useTranslation } from "react-i18next";
import { Plus, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FIXED_ACTIVITY_TEMPLATES,
  WEEKDAY_LABELS,
  emptyFixedActivity,
  type FixedActivityDraft,
} from "@/lib/fixed-activities";
import { cn } from "@/lib/utils";

export function FixedActivitiesEditor({
  value,
  onChange,
  compact,
}: {
  value: FixedActivityDraft[];
  onChange: (next: FixedActivityDraft[]) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  const update = (index: number, patch: Partial<FixedActivityDraft>) => {
    const next = value.map((row, i) => (i === index ? { ...row, ...patch } : row));
    onChange(next);
  };

  const toggleDay = (index: number, day: string) => {
    const row = value[index];
    if (!row) return;
    const has = row.days.includes(day);
    update(index, {
      days: has ? row.days.filter((d) => d !== day) : [...row.days, day],
    });
  };

  const addTemplate = (key: string) => {
    const tpl = FIXED_ACTIVITY_TEMPLATES.find((x) => x.key === key);
    if (!tpl) return;
    onChange([
      ...value,
      {
        activity: tpl.activity,
        days: [...tpl.days],
        start: tpl.start,
        end: tpl.end,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FIXED_ACTIVITY_TEMPLATES.map((tpl) => (
          <Button
            key={tpl.key}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-semibold"
            onClick={() => addTemplate(tpl.key)}
          >
            <span className="mr-1" aria-hidden>
              {tpl.emoji}
            </span>
            {tpl.label}
          </Button>
        ))}
      </div>

      {value.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-xl bg-muted/40 border border-dashed border-border px-4 py-3">
          {t("pages.routines.fixed.empty", {
            defaultValue:
              "Add tuition, sports, or classes that repeat every week. Amy will lock these times in every routine.",
          })}
        </p>
      )}

      {value.map((row, index) => (
        <div
          key={index}
          className={cn(
            "rounded-2xl border border-border bg-card p-4 space-y-3",
            compact && "p-3",
          )}
        >
          <div className="flex items-start gap-2">
            <CalendarClock className="h-4 w-4 text-primary mt-3 shrink-0" aria-hidden />
            <div className="flex-1 space-y-3 min-w-0">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t("pages.routines.fixed.activity_name", { defaultValue: "Activity" })}
                </Label>
                <Input
                  value={row.activity}
                  onChange={(e) => update(index, { activity: e.target.value })}
                  placeholder={t("pages.routines.fixed.activity_placeholder", {
                    defaultValue: "e.g. Piano lesson",
                  })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t("pages.routines.fixed.days", { defaultValue: "Days" })}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((day) => {
                    const on = row.days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(index, day)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors",
                          on
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40",
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("pages.routines.fixed.start", { defaultValue: "Start" })}
                  </Label>
                  <Input
                    type="time"
                    value={row.start}
                    onChange={(e) => update(index, { start: e.target.value })}
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {t("pages.routines.fixed.end", { defaultValue: "End" })}
                  </Label>
                  <Input
                    type="time"
                    value={row.end}
                    onChange={(e) => update(index, { end: e.target.value })}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={t("pages.routines.fixed.remove", { defaultValue: "Remove" })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full rounded-xl"
        onClick={() => onChange([...value, emptyFixedActivity()])}
      >
        <Plus className="h-4 w-4 mr-2" />
        {t("pages.routines.fixed.add", { defaultValue: "Add recurring activity" })}
      </Button>
    </div>
  );
}