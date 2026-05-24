import { Link } from "wouter";
import { ArrowRight, BookOpen, Pencil, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AdaptiveMood, AdaptiveSleepQuality } from "@workspace/family-routine";
import {
  buildParentingHubDeepLink,
  isHubPlayActivity,
  suggestHubTileForRoutineItem,
} from "@/lib/hub-activity-cross-link";

type RoutineItemLike = {
  activity: string;
  category: string;
  status?: string;
};

export function RoutineDayPanel({
  dateMode,
  childName,
  amyTip,
  items,
  todayMood,
  todaySleep,
  onMoodChange,
  onSleepChange,
  delayedCount = 0,
  adjustedCount = 0,
}: {
  dateMode: "past" | "today" | "future";
  childName?: string;
  amyTip: string;
  items: RoutineItemLike[];
  todayMood: AdaptiveMood;
  todaySleep: AdaptiveSleepQuality;
  onMoodChange: (m: AdaptiveMood) => void;
  onSleepChange: (s: AdaptiveSleepQuality) => void;
  delayedCount?: number;
  adjustedCount?: number;
}) {
  const { t } = useTranslation();

  if (dateMode === "past") return null;

  const playItems =
    dateMode === "today"
      ? items.filter(
          (i) =>
            isHubPlayActivity(i.category, i.activity) &&
            (i.status ?? "pending") !== "completed" &&
            (i.status ?? "pending") !== "skipped",
        )
      : [];
  const hubHighlight = playItems[0];
  const hubHref = hubHighlight
    ? buildParentingHubDeepLink(
        suggestHubTileForRoutineItem(hubHighlight.category, hubHighlight.activity).tileId,
      )
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-sm p-4 space-y-3">
      {dateMode === "today" && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
            {t("pages.routines.detail.how_is")} {childName ?? t("pages.routines.detail.your_child", { defaultValue: "your child" })}{" "}
            {t("pages.routines.detail.today_2")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">{t("pages.routines.detail.mood")}</span>
            {(["low", "neutral", "active"] as AdaptiveMood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMoodChange(m)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  todayMood === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-foreground border-border hover:bg-muted"
                }`}
                aria-pressed={todayMood === m}
              >
                {m === "low" ? "😔 Low" : m === "active" ? "🤸 Active" : "🙂 Neutral"}
              </button>
            ))}
            <span className="text-[11px] font-semibold text-muted-foreground ml-1">{t("pages.routines.detail.sleep")}</span>
            {(["poor", "ok", "good"] as AdaptiveSleepQuality[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSleepChange(s)}
                className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  todaySleep === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-foreground border-border hover:bg-muted"
                }`}
                aria-pressed={todaySleep === s}
              >
                {s === "poor" ? "😴 Poor" : s === "ok" ? "🌙 OK" : "✨ Good"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">
            {t("pages.routines.detail.amy_ai_suggests")}
          </p>
          <p className="text-sm text-foreground font-medium leading-snug">{amyTip}</p>
          {dateMode === "today" && (delayedCount > 0 || adjustedCount > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {delayedCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
                  ⏱ {delayedCount} {t("pages.routines.detail.delayed_2")}
                </span>
              )}
              {adjustedCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
                  ⚡ {adjustedCount} {t("pages.routines.detail.auto_adjusted")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/60">
        {hubHref && hubHighlight ? (
          <Link
            href={hubHref}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t("components.routine_hub_banner.cta", { defaultValue: "Explore in Parent Hub" })}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground flex-1" />
        )}
        <p className="text-[11px] text-muted-foreground sm:text-right">
          <Pencil className="h-3 w-3 inline mr-1 align-text-bottom opacity-70" />
          {t("pages.routines.detail.tap_the")}{" "}
          <span className="font-semibold text-foreground">{t("pages.routines.detail.edit")}</span>{" "}
          {t("pages.routines.detail.chip_on_any_task_to_change_its_time_name_or_duration_i_ll_ke")}
        </p>
      </div>
    </div>
  );
}
