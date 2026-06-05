import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT } from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";

/**
 * Premium "day at a glance" hero — shown on today's routine only.
 * Pairs a circular completion ring with a live "what's happening now"
 * read-out so a parent can grasp the day in one look.
 */
export function RoutineNowHero({
  childName,
  childPhotoUrl,
  completed,
  total,
  currentActivity,
  currentTime,
  nextActivity,
  nextTime,
}: {
  childName?: string;
  childPhotoUrl?: string | null;
  completed: number;
  total: number;
  currentActivity?: string;
  currentTime?: string;
  nextActivity?: string;
  nextTime?: string;
}) {
  const { t } = useTranslation();
  if (total <= 0) return null;

  const pct = Math.min(100, Math.round((completed / total) * 100));
  const allDone = completed >= total;

  // Ring geometry
  const size = 76;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;

  const focus: { kind: "now" | "next" | "done"; activity?: string; time?: string } =
    allDone
      ? { kind: "done" }
      : currentActivity
        ? { kind: "now", activity: currentActivity, time: currentTime }
        : nextActivity
          ? { kind: "next", activity: nextActivity, time: nextTime }
          : { kind: "done" };

  return (
    <div
      className={cn(
        HUB_GLASS_SURFACE,
        ROUTINES_HUB_ACCENT.border,
        ROUTINES_HUB_ACCENT.shadow,
        "relative overflow-hidden rounded-[24px] p-4 sm:p-5",
      )}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl"
      />

      <div className="relative flex items-center gap-4">
        {/* Completion ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#routineNowHeroRing)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="routineNowHeroRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-quicksand text-lg font-black leading-none text-foreground tabular-nums">
              {pct}%
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide text-foreground/55 tabular-nums mt-0.5">
              {completed}/{total}
            </span>
          </div>
        </div>

        {/* Live read-out */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300/90">
            {childPhotoUrl ? (
              <img
                src={childPhotoUrl}
                alt={childName ?? ""}
                className="h-4 w-4 rounded-full object-cover ring-1 ring-amber-300/40"
              />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
            <span className="truncate">
              {childName
                ? t("pages.routines.detail.hero_childs_day", {
                    defaultValue: "{{name}}'s day",
                    name: childName,
                  })
                : t("pages.routines.detail.hero_todays_day", { defaultValue: "Today's plan" })}
            </span>
          </div>

          {focus.kind === "done" ? (
            <p className="mt-1.5 font-quicksand text-lg font-bold text-foreground leading-tight">
              {t("pages.routines.detail.hero_all_done", {
                defaultValue: "All done for today 🎉",
              })}
            </p>
          ) : (
            <>
              <div className="mt-1.5 flex items-center gap-1.5">
                {focus.kind === "now" && (
                  <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground/60">
                  {focus.kind === "now"
                    ? t("pages.routines.detail.hero_happening_now", { defaultValue: "Happening now" })
                    : t("pages.routines.detail.hero_up_next", { defaultValue: "Up next" })}
                </span>
              </div>
              <p className="font-quicksand text-base sm:text-lg font-bold text-foreground leading-tight truncate">
                {focus.activity}
              </p>
              {focus.time && (
                <p className="text-xs text-foreground/55 font-medium">{focus.time}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
