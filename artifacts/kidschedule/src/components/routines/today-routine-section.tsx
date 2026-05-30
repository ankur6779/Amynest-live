import { ChevronRight, CheckCircle2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  ROUTINES_HUB_ACCENT,
  hubSectionCardClasses,
  hubAccentBarClasses,
  HUB_BODY,
} from "@/lib/parent-hub-premium";
import {
  formatActivityPreviewChips,
  formatRelativeGeneratedAt,
  pickPreviewTimeline,
  type RoutinePreviewItem,
} from "@/lib/routine-ux";

type TodayRoutineSectionProps = {
  childName: string;
  title: string;
  createdAt: string;
  items: RoutinePreviewItem[];
  onView: () => void;
  onRegenerate?: () => void;
  showSuccessBanner?: boolean;
};

export function TodayRoutineSection({
  childName,
  title,
  createdAt,
  items,
  onView,
  onRegenerate,
  showSuccessBanner = false,
}: TodayRoutineSectionProps) {
  const { t } = useTranslation();
  const chips = formatActivityPreviewChips(items);
  const timeline = pickPreviewTimeline(items, 5);
  const generatedAgo = formatRelativeGeneratedAt(createdAt);

  return (
    <div className="space-y-3 hub-page-enter">
      {showSuccessBanner && (
        <div
          className={cn(
            "rounded-[20px] border border-emerald-400/35 p-4",
            "bg-[rgba(16,185,129,0.08)] backdrop-blur-[18px]",
          )}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="font-bold text-foreground">
                {t("pages.routines.index.routine_ready_title", {
                  defaultValue: "Routine ready",
                })}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("pages.routines.index.routine_ready_body", {
                  defaultValue:
                    "Amy created a personalized routine using weather, child age, family preferences, and energy level.",
                })}
              </p>
              <ul className="text-[11px] text-muted-foreground/90 space-y-0.5 list-none">
                <li>• {t("pages.routines.index.success_weather", { defaultValue: "Weather" })}</li>
                <li>• {t("pages.routines.index.success_age", { defaultValue: "Child age" })}</li>
                <li>• {t("pages.routines.index.success_family", { defaultValue: "Family preferences" })}</li>
                <li>• {t("pages.routines.index.success_energy", { defaultValue: "Energy level" })}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className={cn(hubSectionCardClasses(ROUTINES_HUB_ACCENT), "overflow-hidden")}>
        <div className="flex">
          <div className={hubAccentBarClasses(ROUTINES_HUB_ACCENT)} />
          <div className="flex-1 p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
                  {t("pages.routines.index.todays_generated", {
                    defaultValue: "Today's generated routine",
                  })}
                </p>
                <h3 className="font-quicksand font-bold text-lg text-foreground mt-1 leading-snug">
                  {title}
                </h3>
                <p className={cn(HUB_BODY, "mt-0.5 opacity-100 text-xs")}>
                  {childName} · {t("pages.routines.index.generated_ago", {
                    time: generatedAgo,
                    defaultValue: "Generated {{time}}",
                  })}
                </p>
              </div>
              <Sparkles className="h-5 w-5 text-amber-300/80 shrink-0" />
            </div>

            {chips ? (
              <p className="text-sm text-foreground/85 font-medium leading-snug">{chips}</p>
            ) : null}

            {timeline.length > 0 && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("pages.routines.index.preview_title", {
                    defaultValue: "Today's routine preview",
                  })}
                </p>
                {timeline.map((row, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <span className="font-bold text-amber-200/90 shrink-0 w-14">{row.time}</span>
                    <span className="text-foreground/90 truncate">{row.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={onView}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5",
                  "text-sm font-bold text-foreground",
                  "bg-[rgba(255,184,0,0.14)] border border-[rgba(255,184,0,0.45)]",
                  "hover:bg-[rgba(255,184,0,0.22)] transition-all active:scale-[0.985]",
                )}
              >
                {t("pages.routines.index.view_routine", { defaultValue: "View routine" })}
                <ChevronRight className="h-4 w-4" />
              </button>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="text-xs font-semibold text-muted-foreground hover:text-amber-200/90 py-2.5 px-3 underline-offset-2 hover:underline"
                >
                  {t("pages.routines.index.regenerate_secondary", {
                    defaultValue: "Regenerate routine",
                  })}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
