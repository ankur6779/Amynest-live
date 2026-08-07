import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Flame,
  Sparkles,
  Star,
  Coins,
  Target,
  ArrowRight,
  PlayCircle,
  Shield,
} from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import { useRetention } from "@/hooks/use-retention";
import { readActivationResume } from "@/lib/activation-resume";
import { trackRetentionEvent } from "@/lib/retention/retention-analytics";
import { isValidRetentionStatus } from "@/lib/retention/retention-api";
import { STREAK_MILESTONES } from "@workspace/retention-system";
import { DailyGoalsCard } from "@/components/retention/daily-goals-card";
import { StreakCelebration } from "@/components/retention/streak-celebration";
import { StreakShieldDialog } from "@/components/retention/streak-shield-dialog";
import { TrialPremiumSpotlight } from "@/components/retention/trial-premium-spotlight";
import { SubscriptionValueBridgeBanner } from "@/components/subscription-value-bridge-banner";
import { WinbackBanner } from "@/components/retention/winback-banner";
import { ChildProgressDashboard } from "@/components/retention/child-progress-dashboard";
import { WeeklySummaryCard } from "@/components/retention/weekly-summary-card";
import { ConfettiBurst } from "@/components/study-engagement";

type Props = {
  childName?: string | null;
  routineCompletionPct?: number;
  hasTodayRoutine: boolean;
  onGenerateRoutine: () => void;
  tipText?: string;
  learningHref?: string;
  learningLabel?: string;
};

function greetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return "retention.good_morning";
  if (h < 17) return "retention.good_afternoon";
  return "retention.good_evening";
}

export function DailyCheckInCard({
  childName,
  routineCompletionPct = 0,
  hasTodayRoutine,
  onGenerateRoutine,
  tipText,
  learningHref = "/parenting-hub",
  learningLabel,
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const {
    data,
    checkIn,
    isCheckingIn,
    isLoading,
    isError,
    error,
  } = useRetention({ routineCompletionPct });
  const [celebrateMilestone, setCelebrateMilestone] = useState<number | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const confettiFired = useRef(false);
  const localResume = readActivationResume();

  const checkinStarted = useRef(false);
  const [shieldPrompt, setShieldPrompt] = useState(false);

  const retentionReady = data != null && isValidRetentionStatus(data);

  useEffect(() => {
    if (!isError) return;
    console.error("[retention] status unavailable — hiding check-in card", error);
  }, [isError, error]);

  useEffect(() => {
    if (!retentionReady || data.checkedInToday || checkinStarted.current || isCheckingIn) return;
    if (data.canUseShield) {
      setShieldPrompt(true);
      return;
    }
    checkinStarted.current = true;
    checkIn();
  }, [
    data?.checkedInToday,
    data?.canUseShield,
    checkIn,
    data,
    isCheckingIn,
    retentionReady,
  ]);

  const handleShieldChoice = (useShield: boolean) => {
    if (checkinStarted.current || isCheckingIn) return;
    checkinStarted.current = true;
    setShieldPrompt(false);
    checkIn(useShield);
  };

  useEffect(() => {
    if (!data?.checkedInToday || confettiFired.current) return;
    confettiFired.current = true;
    setConfettiTrigger((t) => t + 1);
  }, [data?.checkedInToday]);

  const resume = useMemo(() => {
    const server = data?.resumeItems?.[0];
    if (server) return server;
    if (localResume) {
      return {
        type: "routine" as const,
        href: localResume.href,
        label: localResume.title ?? t("retention.continue_routine", "Continue routine"),
        progressPct: localResume.total
          ? Math.round((localResume.done / localResume.total) * 100)
          : 0,
        updatedAt: localResume.updatedAt,
      };
    }
    return null;
  }, [data?.resumeItems, localResume, t]);

  const streak = data?.state?.currentStreak ?? 0;
  const score = data?.parentingScore ?? 0;
  const progressScores = useMemo(() => {
    const base = Math.min(100, score);
    return {
      learning: Math.round(base),
      speech: Math.round(Math.min(100, (data?.state?.parentXp ?? 0) % 100)),
      creativity: Math.round(Math.min(100, streak * 8)),
      health: Math.round(Math.min(100, (data?.goalsComplete ?? 0) * 25)),
      nutrition: Math.round(Math.min(100, base * 0.7)),
      behavior: Math.round(Math.min(100, base * 0.85)),
      sleep: Math.round(Math.min(100, base * 0.6)),
    };
  }, [score, data?.state?.parentXp, data?.goalsComplete, streak]);

  if (isLoading && !retentionReady) return null;
  if (isError || !retentionReady) return null;

  const stars = data.state?.totalStars ?? 0;
  const coins = data.state?.totalCoins ?? 0;
  const isSunday = new Date().getDay() === 0;

  const prefs = data.preferences as Record<string, unknown> | undefined;
  const personalized =
    (Array.isArray(prefs?.favoriteStories) && prefs.favoriteStories.length > 0) ||
    prefs?.preferredBedtime ||
    prefs?.preferredLearningCategory;

  const nextMilestone = STREAK_MILESTONES.find((m) => m > streak);

  return (
    <div className="flex flex-col gap-3" data-testid="daily-check-in-card">
      <ConfettiBurst trigger={confettiTrigger} />
      {shieldPrompt && !data.checkedInToday ? (
        <StreakShieldDialog
          streak={data.state?.currentStreak ?? 0}
          onUseShield={() => handleShieldChoice(true)}
          onStartFresh={() => handleShieldChoice(false)}
          isLoading={isCheckingIn}
        />
      ) : null}
      <WinbackBanner
        level={data.state?.winbackLevel ?? 0}
        inactiveDays={data.state?.inactiveDays ?? 0}
      />

      <DashboardGlassCard tintRgb={DASHBOARD_TINTS.journey}>
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-quicksand font-bold text-white">
                {t(greetingKey(), "Good morning")}
                {childName ? `, ${childName}` : ""}{" "}
                <span aria-hidden>🌞</span>
              </p>
              <p className="text-xs text-white/65 mt-1">
                {personalized
                  ? t(
                      "retention.welcome_back_personalized",
                      "Welcome back — a quiet plan is here whenever you’re ready.",
                    )
                  : data.checkedInToday
                    ? t("retention.checked_in_today", "Today is already held")
                    : t("retention.checking_in", "Noticing you’re here…")}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-orange-500/20 px-3 py-1.5 border border-orange-400/30">
              <Flame className="h-4 w-4 text-orange-300" aria-hidden />
              <span className="font-black text-white text-sm">{streak}</span>
              <span className="text-[10px] text-white/60 uppercase">
                {t("dashboard.day_streak", "quiet days")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/8 border border-white/10 py-2 px-1">
              <p className="text-[10px] text-white/55 uppercase">{t("retention.parent_score", "Care rhythm")}</p>
              <p className="text-lg font-bold text-amber-300">{score}</p>
            </div>
            <div className="rounded-xl bg-white/8 border border-white/10 py-2 px-1">
              <p className="text-[10px] text-white/55 uppercase flex items-center justify-center gap-0.5">
                <Star className="h-3 w-3" aria-hidden /> {t("retention.stars", "Quiet wins")}
              </p>
              <p className="text-lg font-bold text-white">{stars}</p>
            </div>
            <div className="rounded-xl bg-white/8 border border-white/10 py-2 px-1">
              <p className="text-[10px] text-white/55 uppercase flex items-center justify-center gap-0.5">
                <Coins className="h-3 w-3" aria-hidden /> {t("retention.coins", "Thanks")}
              </p>
              <p className="text-lg font-bold text-white">{coins}</p>
            </div>
          </div>

          {!hasTodayRoutine ? (
            <button
              type="button"
              onClick={onGenerateRoutine}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold text-sm py-3 shadow-lg"
              data-testid="retention-generate-routine"
            >
              <Sparkles className="h-4 w-4" />
              {t("retention.todays_routine", "See today’s plan")}
            </button>
          ) : (
            <p className="text-xs text-emerald-300 font-medium flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              {t("retention.routine_ready", "Today's routine is ready")}
            </p>
          )}

          {tipText ? (
            <p className="text-xs text-white/75 leading-snug border-l-2 border-violet-400/60 pl-3">
              <span className="font-semibold text-violet-200">{t("retention.tip", "Tip")}: </span>
              {tipText}
            </p>
          ) : null}

          <Link
            href={learningHref}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/12 bg-white/6 px-3 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
            onClick={() =>
              trackRetentionEvent("resume_clicked", {
                resume_type: "learning",
                href: learningHref,
              })
            }
          >
            <span>{learningLabel ?? t("retention.learning_activity", "Today's learning activity")}</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/50" />
          </Link>

          {resume ? (
            <Link
              href={resume.href}
              className="flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2.5"
              data-testid="retention-continue-yesterday"
              onClick={() =>
                trackRetentionEvent("resume_clicked", {
                  resume_type: resume.type,
                  href: resume.href,
                })
              }
            >
              <PlayCircle className="h-5 w-5 text-amber-300 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">
                  {t("retention.continue_yesterday", "Continue where you left off")}
                </p>
                <p className="text-[10px] text-white/60 truncate">{resume.label}</p>
              </div>
              <span className="text-xs font-bold text-amber-300">{resume.progressPct}%</span>
            </Link>
          ) : null}

          {data.shieldAvailable && streak > 0 && nextMilestone ? (
            <p className="text-[10px] text-white/45 flex items-center gap-1">
              <Shield className="h-3 w-3" aria-hidden />
              {t("retention.shield_hint", "{{n}} more quiet days toward {{m}} — a gentle hold is available this month", {
                n: nextMilestone - streak,
                m: nextMilestone,
              })}
            </p>
          ) : null}
        </div>
      </DashboardGlassCard>

      <DailyGoalsCard goals={data.state?.dailyGoals} goalsComplete={data.goalsComplete ?? 0} />

      <ChildProgressDashboard {...progressScores} />

      {data.trialPremiumFeature ? (
        <TrialPremiumSpotlight featureId={data.trialPremiumFeature} />
      ) : null}

      {isSunday ? <WeeklySummaryCard summary={data.weeklySummary} parentingScore={score} /> : null}

      <SubscriptionValueBridgeBanner moment="weekly_summary" />

      <AnimatePresence>
        {celebrateMilestone != null && !reduceMotion ? (
          <StreakCelebration
            milestone={celebrateMilestone}
            onDone={() => setCelebrateMilestone(null)}
          />
        ) : null}
      </AnimatePresence>

      {isCheckingIn ? (
        <span className="sr-only" role="status">
          {t("retention.checking_in", "Checking you in…")}
        </span>
      ) : null}
    </div>
  );
}
