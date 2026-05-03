import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { ChevronLeft, BarChart3, Sparkles, Trophy, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Session {
  sessionId: string;
  goalId: string;
  goalLabel: string;
  planTitle: string;
  totalWins: number;
  completed: number;
  lastFeedback: string;
  lastUpdated: string;
  feedbacks: { win: number; feedback: string; at: string }[];
}

const FEEDBACK_EMOJI: Record<string, string> = { yes: "🎉", somewhat: "👍", no: "💪" };

export default function AICoachProgressPage() {
  const { t } = useTranslation();
  const FEEDBACK_LABEL: Record<string, string> = {
    yes: t("screens.ai_coach_progress.feedback_yes"),
    somewhat: t("screens.ai_coach_progress.feedback_somewhat"),
    no: t("screens.ai_coach_progress.feedback_no"),
  };
  const authFetch = useAuthFetch();
  const [, setLocation] = useLocation();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/ai-coach/progress");
        if (res.ok) {
          const data = (await res.json()) as { sessions: Session[] };
          setSessions(data.sessions);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [authFetch]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link href="/amy-coach" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {t("screens.ai_coach_progress.back_to_coach")}
      </Link>

      <div>
        <h1 className="font-quicksand text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-foreground" />
          {t("screens.ai_coach_progress.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("screens.ai_coach_progress.subtitle")}
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-sm text-muted-foreground animate-pulse">
          {t("screens.ai_coach_progress.loading")}
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center space-y-3">
          <Sparkles className="h-10 w-10 text-foreground mx-auto" />
          <h3 className="font-bold">{t("screens.ai_coach_progress.empty_title")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("screens.ai_coach_progress.empty_body")}
          </p>
          <button
            onClick={() => setLocation("/amy-coach")}
            className="mt-2 px-5 py-2.5 rounded-full bg-card text-primary-foreground font-bold text-sm"
          >
            {t("screens.ai_coach_progress.start_plan")}
          </button>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-4">
          {sessions.map((s) => {
            const pct = s.totalWins > 0 ? Math.round((s.completed / s.totalWins) * 100) : 0;
            return (
              <div key={s.sessionId} className="rounded-2xl border-2 border-border bg-card overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold tracking-wider text-foreground uppercase">{s.goalLabel}</p>
                      <h3 className="font-quicksand font-bold text-base mt-0.5 leading-tight">{s.planTitle}</h3>
                    </div>
                    {s.completed === s.totalWins && (
                      <Trophy className="h-5 w-5 text-foreground shrink-0" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-muted-foreground">
                        {t("screens.ai_coach_progress.wins_count", { done: s.completed, total: s.totalWins })}
                      </span>
                      <span className="font-bold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-card transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Feedback dots per win */}
                  <div className="flex gap-1.5 flex-wrap">
                    {Array.from({ length: s.totalWins }).map((_, i) => {
                      const wn = i + 1;
                      const fb = s.feedbacks.find((f) => f.win === wn);
                      return (
                        <div
                          key={wn}
                          title={fb ? t("screens.ai_coach_progress.win_done_title", { n: wn, label: FEEDBACK_LABEL[fb.feedback] }) : t("screens.ai_coach_progress.win_pending_title", { n: wn })}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            fb
                              ? "bg-muted text-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {fb ? FEEDBACK_EMOJI[fb.feedback] : wn}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      {t("screens.ai_coach_progress.last_updated", { date: new Date(s.lastUpdated).toLocaleDateString() })}
                    </p>
                    <button
                      onClick={() => setLocation(`/amy-coach?resume=${s.sessionId}`)}
                      className="flex items-center gap-1 text-xs font-bold text-foreground hover:text-foreground"
                    >
                      {t("screens.ai_coach_progress.continue_plan")} <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
