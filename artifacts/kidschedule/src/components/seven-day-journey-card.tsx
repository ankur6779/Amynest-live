import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle2, Sparkles, Trophy } from "lucide-react";
import { useJourney } from "@/hooks/use-journey";

function ProgressDots({
  totalDays,
  completedDays,
  currentDay,
}: {
  totalDays: number;
  completedDays: number[];
  currentDay: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalDays }, (_, i) => {
        const day = i + 1;
        const done = completedDays.includes(day);
        const active = !done && day === currentDay;
        return (
          <div
            key={day}
            className={[
              "h-2 rounded-full transition-all duration-300",
              done ? "w-5 bg-emerald-400" : active ? "w-5 bg-violet-400" : "w-2 bg-white/20",
            ].join(" ")}
            aria-hidden
          />
        );
      })}
    </div>
  );
}

export function SevenDayJourneyCard() {
  const { t } = useTranslation();
  const { status, isLoading, isActive, refetch } = useJourney();
  const [celebrateDay, setCelebrateDay] = useState<number | null>(null);
  const [showFinished, setShowFinished] = useState(false);

  useEffect(() => {
    if (!status?.completedAt) return;
    if (sessionStorage.getItem("journey-finished-banner")) return;
    setShowFinished(true);
  }, [status?.completedAt]);

  useEffect(() => {
    if (!status?.completedDays?.length || status.completedAt) return;
    const last = status.completedDays[status.completedDays.length - 1];
    const key = `journey-celebrate-${last}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setCelebrateDay(last);
    const timer = setTimeout(() => setCelebrateDay(null), 4000);
    return () => clearTimeout(timer);
  }, [status?.completedDays, status?.completedAt]);

  if (isLoading || !status) return null;

  if (showFinished && status.completedAt) {
    return (
      <div
        className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 to-violet-950/60 p-4 shadow-lg"
        data-testid="journey-complete-card"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-quicksand font-bold text-sm text-white">
              {t("journey.complete_title")}
            </p>
            <p className="text-xs text-white/70 mt-0.5 leading-snug">
              {t("journey.complete_desc")}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-white/50 hover:text-white/80 shrink-0"
            onClick={() => {
              sessionStorage.setItem("journey-finished-banner", "1");
              setShowFinished(false);
            }}
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  if (!isActive || !status.todayTask) return null;

  const task = status.todayTask;

  return (
    <div
      className="rounded-2xl border border-violet-400/35 bg-gradient-to-br from-violet-900/80 via-indigo-950/70 to-purple-950/60 p-4 shadow-[0_8px_32px_rgba(139,92,246,0.22)] relative overflow-hidden"
      data-testid="journey-card"
    >
      <div className="absolute -top-12 -right-8 h-32 w-32 rounded-full bg-violet-500/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      {celebrateDay != null ? (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-white text-sm font-bold shadow-lg animate-in zoom-in duration-300">
            <CheckCircle2 className="h-4 w-4" />
            {t("journey.day_complete_toast", { day: celebrateDay })}
          </div>
        </div>
      ) : null}

      <div className="relative flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-500/25 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-violet-200" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300/80">
              {t("journey.badge")}
            </p>
            <p className="font-quicksand font-bold text-sm text-white leading-tight">
              {t("journey.day_of", { day: status.currentDay, total: status.totalDays })}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-violet-200/80 tabular-nums">
          {status.progressPct}%
        </span>
      </div>

      <ProgressDots
        totalDays={status.totalDays}
        completedDays={status.completedDays}
        currentDay={status.currentDay}
      />

      <div className="relative mt-3 mb-3">
        <p className="font-semibold text-sm text-white">{t(task.titleKey)}</p>
        <p className="text-xs text-white/65 mt-0.5 leading-snug">{t(task.descriptionKey)}</p>
      </div>

      <Link href={task.ctaPath} onClick={() => refetch()} className="relative block">
        <button
          type="button"
          className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(139,92,246,0.40)] transition-all"
          data-testid={task.taskId === "routine_generate" ? "dashboard-generate-routine-btn" : "journey-cta"}
        >
          {t(task.ctaKey)}
          <ArrowRight className="h-4 w-4" />
        </button>
      </Link>
    </div>
  );
}
