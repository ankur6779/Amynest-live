import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowRight, Heart } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { AmyIcon } from "@/components/amy-icon";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_SECTION_BODY, DASHBOARD_SECTION_HEADER, DASHBOARD_TINTS } from "@/lib/dashboard-premium";
import { useAmyCoachCheckIn } from "@/hooks/use-amy-coach-check-in";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { resolveActiveChild, isCoachEligible } from "@/lib/coach-age-nav";

export function AmyCoachCheckInCard() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { loading, primarySession, checkIn, lastCheckInLabel, respond } = useAmyCoachCheckIn();
  const { data: childrenList } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), staleTime: 60_000 },
  });
  const activeChild = resolveActiveChild(childrenList ?? undefined);
  const coachEligible = isCoachEligible(activeChild);
  const [clarifying, setClarifying] = useState(false);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    setThanks(false);
    setClarifying(false);
  }, [checkIn?.kind, checkIn?.sessionId]);

  if (loading) return null;

  if (!primarySession) {
    return (
      <DashboardGlassCard tintRgb={DASHBOARD_TINTS.amy}>
        <div className={DASHBOARD_SECTION_HEADER}>
          <AmyIcon size={16} bounce />
          <span className="font-quicksand font-bold text-sm text-white">
            {t("dashboard.amy_coach_card.title", "Amy Coach")}
          </span>
        </div>
        <div className={DASHBOARD_SECTION_BODY}>
          <p className="text-sm text-white/75 leading-snug">
            {t(
              "dashboard.amy_coach_card.empty",
              "Pick a parenting goal and Amy will coach you through small, practical wins.",
            )}
          </p>
          <AppLink href="/amy-coach" source="dashboard-amy-coach-start">
            <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-violet-300 hover:underline">
              {coachEligible
                ? t("dashboard.amy_coach_card.start", "Start coaching")
                : t("dashboard.amy_coach_card.browse_goals", "Browse goals")}{" "}
              <ArrowRight className="h-3 w-3" />
            </span>
          </AppLink>
          {!coachEligible && (
            <p className="text-[11px] text-violet-200/70 mt-2">
              {t("pages.ai_coach.preview_available_from_age_2", "Available from age 2+")}
            </p>
          )}
        </div>
      </DashboardGlassCard>
    );
  }

  const handleOption = async (optionId: string, label: string) => {
    if (optionId === "clarify") {
      setClarifying(true);
      return;
    }
    if (optionId === "refresher") {
      setLocation(`/amy-coach?resume=${primarySession.sessionId}`);
      return;
    }
    if (optionId === "different" || optionId === "advanced" || optionId === "need_help") {
      setLocation(`/amy-coach?resume=${primarySession.sessionId}`);
      return;
    }
    if (optionId === "challenges_return") {
      setLocation(`/amy-coach?resume=${primarySession.sessionId}&graduation=1`);
      return;
    }
    await respond(optionId, label);
    setThanks(true);
    setClarifying(false);
  };

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.amy}>
      <div className={DASHBOARD_SECTION_HEADER}>
        <AmyIcon size={16} bounce />
        <span className="font-quicksand font-bold text-sm text-white">
          {t("dashboard.amy_coach_card.title", "Amy Coach")}
        </span>
        {primarySession.progressPct >= 100 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold uppercase text-violet-200/90">
            <Heart size={10} /> {t("dashboard.amy_coach_card.maintenance", "Maintenance")}
          </span>
        )}
      </div>

      <div className={`${DASHBOARD_SECTION_BODY} space-y-3`}>
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/80">
            {t("dashboard.amy_coach_card.current_goal", "Current Goal")}
          </p>
          <p className="text-sm font-semibold text-white leading-snug">{primarySession.planTitle}</p>
        </div>

        {primarySession.currentFocus && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300/80">
              {t("dashboard.amy_coach_card.current_focus", "Current Focus")}
            </p>
            <p className="text-xs text-white/70 leading-snug line-clamp-2">
              {primarySession.currentFocus.title}
            </p>
          </div>
        )}

        {lastCheckInLabel && (
          <p className="text-[11px] text-white/50">
            {t("dashboard.amy_coach_card.last_check_in", "Last check-in")}: {lastCheckInLabel}
          </p>
        )}

        {checkIn?.memoryLine && (
          <p className="text-xs text-white/65 italic leading-snug border-l-2 border-violet-400/40 pl-2">
            {checkIn.memoryLine}
          </p>
        )}

        {thanks ? (
          <p className="text-sm text-emerald-300/90">
            {t("dashboard.amy_coach_card.thanks", "Thanks — Amy updated your coaching plan.")}
          </p>
        ) : checkIn && !clarifying ? (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(167,139,250,0.22)",
            }}
          >
            <div className="flex items-center gap-1.5 text-violet-200/90">
              <Sparkles size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wide">
                {checkIn.title}
              </span>
            </div>
            <p className="text-sm text-white/85 leading-snug">{checkIn.prompt}</p>
            <div className="flex flex-wrap gap-1.5">
              {checkIn.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void handleOption(opt.id, opt.label)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-white/90 hover:text-white transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : clarifying && checkIn?.clarificationQuestion ? (
          <div
            className="rounded-xl p-3 space-y-2.5"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(167,139,250,0.22)",
            }}
          >
            <p className="text-sm text-white/85 leading-snug">{checkIn.clarificationQuestion}</p>
            <div className="flex flex-wrap gap-1.5">
              {checkIn.clarificationOptions?.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => void respond("clarify", opt.label, opt.label)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full text-white/90"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          coachEligible ? (
          <AppLink href={`/amy-coach?resume=${primarySession.sessionId}`} source="dashboard-amy-coach-continue">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-300 hover:underline">
              {t("dashboard.amy_coach_card.continue", "Continue coaching")} <ArrowRight className="h-3 w-3" />
            </span>
          </AppLink>
          ) : (
            <AppLink href="/amy-coach" source="dashboard-amy-coach-browse">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-300 hover:underline">
                {t("dashboard.amy_coach_card.browse_goals", "Browse goals")} <ArrowRight className="h-3 w-3" />
              </span>
            </AppLink>
          )
        )}

        {coachEligible ? (
        <div className="flex items-center justify-between text-[11px] text-white/45 pt-0.5">
          <span>
            {t("dashboard.amy_coach_card.progress", "{{pct}}% toward goal", {
              pct: primarySession.progressPct,
            })}
          </span>
          <AppLink href="/amy-coach/progress" source="dashboard-amy-coach-progress">
            <span className="text-violet-300/80 hover:underline">
              {t("dashboard.amy_coach_card.view_journey", "View journey")}
            </span>
          </AppLink>
        </div>
        ) : (
          <p className="text-[11px] text-violet-200/70 pt-0.5">
            {t("pages.ai_coach.preview_available_from_age_2", "Available from age 2+")}
          </p>
        )}
      </div>
    </DashboardGlassCard>
  );
}
