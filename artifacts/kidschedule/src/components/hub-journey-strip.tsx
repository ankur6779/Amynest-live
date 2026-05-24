import { useTranslation } from "react-i18next";
import type { HubJourneyAccess, ChildProgressSnapshot } from "@workspace/parent-hub-journey";
import { calendarCountdownMessage } from "@/lib/hub-journey-ux";

interface HubJourneyStripProps {
  childName: string;
  access: HubJourneyAccess;
  progress?: ChildProgressSnapshot;
  isPremium: boolean;
}

export function HubJourneyStrip({
  childName,
  access,
  progress,
  isPremium,
}: HubJourneyStripProps) {
  const { t } = useTranslation();

  if (isPremium) {
    return (
      <div
        data-testid="hub-journey-strip"
        className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card px-4 py-3"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              {t("parent_hub.journey.premium_active")}
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">
              {t("parent_hub.journey.premium_subtitle", { name: childName })}
            </p>
          </div>
          {progress && progress.lifeSkillsStreak > 0 && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              🔥 {progress.lifeSkillsStreak} {t("parent_hub.journey.day_streak")}
            </span>
          )}
        </div>
      </div>
    );
  }

  const dots = Array.from({ length: access.daysTotal }, (_, i) => i + 1);
  const countdown = !access.isLocked
    ? calendarCountdownMessage(access.calendarDaysLeft, t)
    : null;

  return (
    <div
      data-testid="hub-journey-strip"
      className={[
        "rounded-2xl border px-4 py-3",
        access.isLocked
          ? "border-primary/30 bg-gradient-to-r from-primary/8 to-card"
          : "border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            {access.isLocked
              ? t("parent_hub.journey.continue_journey_header", { name: childName })
              : t("parent_hub.journey.day_of", {
                  current: Math.min(access.daysCompleted + 1, access.daysTotal),
                  total: access.daysTotal,
                  name: childName,
                })}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
            {access.isLocked
              ? t("parent_hub.journey.unlock_to_continue_soft")
              : t("parent_hub.journey.complete_path_hint")}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {dots.map((d) => (
            <span
              key={d}
              className={[
                "h-2.5 w-2.5 rounded-full transition-colors",
                d <= access.daysCompleted
                  ? "bg-primary shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  : d === access.daysCompleted + 1 && !access.isLocked
                    ? "bg-primary/40 ring-2 ring-primary/30"
                    : "bg-muted",
              ].join(" ")}
              aria-hidden
            />
          ))}
        </div>
      </div>

      {countdown && (
        <p
          className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
          data-testid="journey-calendar-countdown"
        >
          ⏳ {countdown}
        </p>
      )}

      {progress && (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {progress.lifeSkillsDone > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              ✅ {t("parent_hub.journey.stat_life_skills", { count: progress.lifeSkillsDone })}
            </span>
          )}
          {progress.lifeSkillsStreak > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              🔥 {progress.lifeSkillsStreak} {t("parent_hub.journey.day_streak")}
            </span>
          )}
          {progress.levelLabel && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              ⭐ {progress.levelLabel}
            </span>
          )}
          {progress.consistencyDays > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5">
              📅 {t("parent_hub.journey.consistency", { count: progress.consistencyDays })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
