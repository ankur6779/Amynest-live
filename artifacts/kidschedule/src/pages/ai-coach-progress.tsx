import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AppLink } from "@/components/app-link";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAuth } from "@/lib/firebase-auth-hooks";
import {
  ChevronLeft,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Minus,
  TrendingDown,
  Heart,
  Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  type CoachProgressViewModel,
  type MilestoneCelebration,
  type ProgressTrend,
  shouldSuggestGoalReactivation,
} from "@workspace/coach-journey";
import {
  getGraduationForSession,
  loadCoachGraduations,
  pastSuccessesFromGraduations,
  type CoachGraduationRecord,
} from "@/lib/coach-graduation-state";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { resolveActiveChild, isCoachEligible } from "@/lib/coach-age-nav";

const TREND_STYLE: Record<
  ProgressTrend,
  { icon: typeof TrendingUp; color: string; bg: string }
> = {
  improving: { icon: TrendingUp, color: "#86efac", bg: "rgba(34,197,94,0.12)" },
  strong_momentum: { icon: TrendingUp, color: "#a78bfa", bg: "rgba(139,92,246,0.14)" },
  building_consistency: { icon: Minus, color: "#fcd34d", bg: "rgba(251,191,36,0.12)" },
  needs_attention: { icon: TrendingDown, color: "#fca5a5", bg: "rgba(248,113,113,0.12)" },
};

const MILESTONE_EMOJI: Record<MilestoneCelebration, string> = {
  building_momentum: "✨",
  halfway: "🎉",
  major_improvement: "🌟",
  goal_complete: "🌱",
};

function GraduationHero({ session, t }: { session: CoachProgressViewModel; t: TFunction }) {
  return (
    <div
      className="rounded-2xl px-4 py-4 space-y-2"
      style={{
        background: "linear-gradient(135deg, rgba(167,139,250,0.14), rgba(236,72,153,0.08))",
        border: "1px solid rgba(167,139,250,0.28)",
      }}
    >
      <p className="font-quicksand text-lg font-bold text-white leading-snug">
        {t("screens.ai_coach_progress.graduation_headline", "You've come a long way")}
      </p>
      <p className="text-sm text-white/70 leading-relaxed">
        {t(
          "screens.ai_coach_progress.graduation_subheadline",
          "This challenge is no longer creating the same level of difficulty it once did. Amy is here if you want to maintain, strengthen, or explore something new.",
        )}
      </p>
    </div>
  );
}

function GoalProgressCard({
  session,
  graduation,
  onContinue,
  onReassess,
  onViewGraduation,
  t,
}: {
  session: CoachProgressViewModel;
  graduation?: CoachGraduationRecord;
  onContinue: () => void;
  onReassess: () => void;
  onViewGraduation: () => void;
  t: TFunction;
}) {
  const trend = TREND_STYLE[session.progressTrend];
  const TrendIcon = trend.icon;
  const milestoneKey = session.milestoneCelebration;
  const milestoneToPct = session.nextMilestonePct;
  const milestoneFromPct = session.progressPct;
  const isGraduated = session.progressPct >= 100;
  const inMaintenance = graduation?.maintenanceMode === true;

  const suggestReactivation =
    inMaintenance &&
    shouldSuggestGoalReactivation({
      maintenanceMode: true,
      graduatedAt: graduation?.graduatedAt,
      recentFeedbacks: session.recentOutcomes.map((o) => ({ feedback: o.feedback })),
    });

  return (
    <article
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #120e2e 0%, #1a1040 55%, #0f1224 100%)",
        border: "1px solid rgba(139,92,246,0.22)",
        boxShadow: "0 12px 40px rgba(15,12,41,0.35)",
      }}
    >
      <div className="p-5 sm:p-6 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-bold tracking-wide uppercase text-violet-300/90">
              {session.goalLabel}
            </p>
            {inMaintenance && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full text-violet-200"
                style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(167,139,250,0.3)" }}
              >
                <Heart size={10} />
                {t("screens.ai_coach_progress.maintenance_mode", "Maintenance")}
              </span>
            )}
          </div>
          <h2 className="font-quicksand text-xl sm:text-2xl font-bold text-white leading-tight">
            {session.planTitle}
          </h2>
          <p className="text-sm font-semibold text-violet-200">
            {t("screens.ai_coach_progress.progress_toward_goal", {
              pct: session.progressPct,
            })}
          </p>

          <div className="h-3 rounded-full overflow-hidden bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${session.progressPct}%`,
                background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
              }}
            />
          </div>

          {isGraduated && <GraduationHero session={session} t={t} />}

          {!isGraduated && session.currentFocus && (
            <div className="pt-1 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
                {t("screens.ai_coach_progress.current_focus", "Current Focus")}
              </p>
              <p className="text-sm text-white/85 leading-snug">{session.currentFocus.summary}</p>
            </div>
          )}

          {!isGraduated && (
            <p className="text-xs text-white/55 leading-relaxed">
              {t("screens.ai_coach_progress.wins_completed_summary", {
                count: session.coachingWinsCompleted,
              })}
            </p>
          )}
        </div>

        {milestoneKey && !isGraduated && (
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <p className="text-sm font-semibold text-white">
              {MILESTONE_EMOJI[milestoneKey]}{" "}
              {t(`screens.ai_coach_progress.milestone_${milestoneKey}`)}
            </p>
          </div>
        )}

        {!isGraduated && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
              {t("screens.ai_coach_progress.progress_trend", "Progress Trend")}
            </p>
            <div className="flex flex-wrap gap-2">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ background: trend.bg, color: trend.color }}
              >
                <TrendIcon size={14} />
                {t(`screens.ai_coach_progress.trend_${session.progressTrend}`)}
              </div>
              {session.coachingStreakDays >= 2 && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-violet-200"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {t("screens.ai_coach_progress.streak", { count: session.coachingStreakDays })}
                </div>
              )}
            </div>
          </div>
        )}

        {!isGraduated && session.currentFocus && (
          <section
            className="rounded-2xl p-4 space-y-2"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
              {t("screens.ai_coach_progress.current_focus", "Current Focus")}
            </p>
            <p className="font-quicksand text-base font-bold text-white">{session.currentFocus.title}</p>
            <p className="text-xs text-white/55 leading-relaxed">
              <span className="font-semibold text-violet-200/90">
                {t("screens.ai_coach_progress.why_amy_selected", "Why Amy selected this:")}
              </span>{" "}
              {session.currentFocus.reason}
            </p>
          </section>
        )}

        {session.progressPct < 100 && (
          <section
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
              {t("screens.ai_coach_progress.next_milestone", "Next Milestone")}
            </p>
            <p className="font-semibold text-white text-sm">
              {t("screens.ai_coach_progress.reach_pct", { pct: milestoneToPct })}
            </p>
            <p className="text-xs text-white/55">
              {t("screens.ai_coach_progress.milestone_expectation", "Amy expects improvement when you consistently:")}
            </p>
            <ul className="space-y-1.5">
              {session.milestoneHints.map((hint) => (
                <li key={hint} className="text-xs text-white/75 flex gap-2">
                  <span className="text-violet-300">•</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 text-xs font-bold text-violet-200">
              <span>{milestoneFromPct}%</span>
              <span className="text-white/40">→</span>
              <span>{milestoneToPct}%</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden ml-1">
                <div
                  className="h-full rounded-full bg-violet-400/80 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((milestoneFromPct / milestoneToPct) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}

        {session.recentOutcomes.length > 0 && (
          <section className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
              {t("screens.ai_coach_progress.recent_progress", "Recent Progress")}
            </p>
            <ul className="space-y-2">
              {session.recentOutcomes.map((item) => (
                <li
                  key={`${item.at}-${item.label}`}
                  className="flex gap-2.5 text-sm text-white/80 leading-snug"
                >
                  <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80">
            {t("screens.ai_coach_progress.amy_insight", "Amy's Insight")}
          </p>
          <p className="text-sm text-white/78 leading-relaxed">{session.coachInsight}</p>
        </section>

        {suggestReactivation && (
          <section
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)" }}
          >
            <p className="text-sm font-semibold text-white leading-snug">
              {t(
                "screens.ai_coach_progress.reactivation_title",
                "Amy noticed this challenge may be returning.",
              )}
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              {t(
                "screens.ai_coach_progress.reactivation_body",
                "Would you like a quick refresher?",
              )}
            </p>
            <button
              type="button"
              onClick={onContinue}
              className="text-xs font-bold text-violet-200 hover:text-white transition-colors"
            >
              {t("screens.ai_coach_progress.reactivation_cta", "Get a quick refresher")} →
            </button>
          </section>
        )}

        {session.suggestReassess && !isGraduated && (
          <section
            className="rounded-2xl p-4 space-y-3"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)" }}
          >
            <p className="text-sm font-semibold text-amber-100/95 leading-snug">
              {t("screens.ai_coach_progress.reassess_title")}
            </p>
            <p className="text-xs text-amber-100/70 leading-relaxed">
              {t("screens.ai_coach_progress.reassess_body")}
            </p>
            <button
              type="button"
              onClick={onReassess}
              className="text-xs font-bold text-amber-200 hover:text-white transition-colors"
            >
              {t("screens.ai_coach_progress.reassess_goal", "Reassess Goal")} →
            </button>
          </section>
        )}

        <div className="flex items-center justify-between pt-1 gap-3 flex-wrap">
          <p className="text-[11px] text-white/45">
            {t("screens.ai_coach_progress.last_updated", {
              date: new Date(session.lastUpdated).toLocaleDateString(),
            })}
          </p>
          {isGraduated ? (
            <button
              type="button"
              onClick={onViewGraduation}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
              }}
            >
              {t("screens.ai_coach_progress.review_growth", "Review your growth")}{" "}
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
              }}
            >
              {t("screens.ai_coach_progress.continue_coaching", "Continue Coaching")}{" "}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function PastSuccessesSection({
  records,
  t,
}: {
  records: CoachGraduationRecord[];
  t: TFunction;
}) {
  if (records.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-quicksand text-lg font-bold text-white">
        {t("screens.ai_coach_progress.past_successes", "Past Successes")}
      </h2>
      <ul className="space-y-2">
        {records.map((r) => (
          <li
            key={r.sessionId}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <Check size={16} className="text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white truncate">{r.goalTitle}</p>
              <p className="text-xs text-white/50">
                {t("screens.ai_coach_progress.completed_on", {
                  date: new Date(r.graduatedAt).toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  }),
                })}
              </p>
            </div>
            {r.maintenanceMode && (
              <span className="text-[10px] font-bold uppercase text-violet-300/80 shrink-0">
                {t("screens.ai_coach_progress.maintenance_mode", "Maintenance")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AICoachProgressPage() {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const { userId } = useAuth();
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<CoachProgressViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: childrenList } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), staleTime: 60_000 },
  });
  const activeChild = resolveActiveChild(childrenList ?? undefined);
  const coachEligible = isCoachEligible(activeChild);

  const graduations = useMemo(
    () => pastSuccessesFromGraduations(loadCoachGraduations(userId ?? "anon")),
    [userId],
  );

  const activeSessions = useMemo(
    () =>
      sessions.filter((s) => {
        if (s.progressPct < 100) return true;
        return !getGraduationForSession(userId ?? "anon", s.sessionId);
      }),
    [sessions, userId],
  );

  useEffect(() => {
    if (!coachEligible) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await authFetch("/api/ai-coach/progress");
        if (res.ok) {
          const data = (await res.json()) as { sessions: CoachProgressViewModel[] };
          setSessions(data.sessions);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch, coachEligible]);

  if (!coachEligible) {
    return (
      <div
        className="min-h-full pb-8"
        style={{ background: "linear-gradient(180deg, #0f0c29 0%, #141028 40%, #0c1220 100%)" }}
      >
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          <AppLink
            href="/amy-coach"
            source="ai-coach-progress-back"
            className="flex items-center gap-1 text-sm text-violet-300/80 hover:text-violet-200"
          >
            <ChevronLeft className="h-4 w-4" /> {t("screens.ai_coach_progress.back_to_coach")}
          </AppLink>
          <div
            className="rounded-2xl px-4 py-5 space-y-2"
            style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(167,139,250,0.28)" }}
          >
            <h1 className="font-quicksand text-xl font-bold text-white">
              {t("pages.ai_coach.preview_available_from_age_2", "Available from age 2+")}
            </h1>
            <p className="text-sm text-white/75 leading-relaxed">
              {t(
                "pages.ai_coach.preview_age_gate_body",
                "Browse goals and sample wins now. Personalized plan generation unlocks when your child turns 2.",
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-full pb-8"
      style={{ background: "linear-gradient(180deg, #0f0c29 0%, #141028 40%, #0c1220 100%)" }}
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <AppLink
          href="/amy-coach"
          source="ai-coach-progress-back"
          className="flex items-center gap-1 text-sm text-violet-300/80 hover:text-violet-200"
        >
          <ChevronLeft className="h-4 w-4" /> {t("screens.ai_coach_progress.back_to_coach")}
        </AppLink>

        <div>
          <h1 className="font-quicksand text-2xl font-bold text-white">
            {t("screens.ai_coach_progress.title")}
          </h1>
          <p className="text-sm text-white/55 mt-1 leading-relaxed">
            {t("screens.ai_coach_progress.subtitle")}
          </p>
        </div>

        {loading && (
          <div className="text-center py-16 text-sm text-white/45 animate-pulse">
            {t("screens.ai_coach_progress.loading")}
          </div>
        )}

        {!loading && sessions.length === 0 && graduations.length === 0 && (
          <div
            className="rounded-3xl p-10 text-center space-y-3"
            style={{ border: "1px dashed rgba(139,92,246,0.35)", background: "rgba(255,255,255,0.03)" }}
          >
            <Sparkles className="h-10 w-10 text-violet-300 mx-auto" />
            <h3 className="font-bold text-white">{t("screens.ai_coach_progress.empty_title")}</h3>
            <p className="text-sm text-white/55">{t("screens.ai_coach_progress.empty_body")}</p>
            <button
              type="button"
              onClick={() => setLocation("/amy-coach")}
              className="mt-2 px-5 py-2.5 rounded-full font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
            >
              {t("screens.ai_coach_progress.start_plan")}
            </button>
          </div>
        )}

        {!loading && graduations.length > 0 && (
          <PastSuccessesSection records={graduations} t={t} />
        )}

        {!loading && activeSessions.length > 0 && (
          <div className="space-y-6">
            {activeSessions.map((s) => (
              <GoalProgressCard
                key={s.sessionId}
                session={s}
                graduation={getGraduationForSession(userId ?? "anon", s.sessionId)}
                t={t}
                onContinue={() => {
                  if (s.canResume) setLocation(`/amy-coach?resume=${s.sessionId}`);
                  else setLocation("/amy-coach");
                }}
                onReassess={() => setLocation("/amy-coach")}
                onViewGraduation={() => setLocation(`/amy-coach?resume=${s.sessionId}&graduation=1`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
