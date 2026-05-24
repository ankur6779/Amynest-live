import { useTranslation } from "react-i18next";

export function RoutineProgressRail({
  completed,
  total,
  nextActivity,
  nextTime,
}: {
  completed: number;
  total: number;
  nextActivity?: string;
  nextTime?: string;
}) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  const pct = Math.round((completed / total) * 100);

  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <span className="text-foreground">
          {t("pages.routines.detail.progress_done", {
            defaultValue: "{{done}}/{{total}} done",
            done: completed,
            total,
          })}
        </span>
        <span className="text-primary">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-border/80 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      {nextActivity && nextTime ? (
        <p className="text-xs text-muted-foreground">
          {t("pages.routines.detail.next_up_label", { defaultValue: "Next up" })}:{" "}
          <span className="font-semibold text-foreground">{nextActivity}</span>
          <span className="text-muted-foreground"> · {nextTime}</span>
        </p>
      ) : null}
    </div>
  );
}
