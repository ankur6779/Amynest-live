import { useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight, Heart, TrendingUp, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CoachGraduationViewModel, GraduationPath } from "@workspace/coach-journey";
import "@/components/amy-coach/amy-coach-living-room.css";

function ProgressRingComplete({ size = 88 }: { size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const t = requestAnimationFrame(() => setOffset(0));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#grad-ring)"
          strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s ease-out" }}
        />
        <defs>
          <linearGradient id="grad-ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white"
        aria-label="100 percent"
      >
        100
      </span>
    </div>
  );
}

export interface CoachGraduationScreenProps {
  view: CoachGraduationViewModel;
  onChoosePath: (path: GraduationPath, strengthenGoalId?: string) => void;
  onPickRecommendedGoal?: (goalId: string) => void;
  /** Experience-only sanctuary face. */
  living?: boolean;
}

export function CoachGraduationScreen({
  view,
  onChoosePath,
  onPickRecommendedGoal,
  living = false,
}: CoachGraduationScreenProps) {
  const { t } = useTranslation();

  const pathCards = useMemo(
    () => [
      {
        path: "maintenance" as const,
        icon: Heart,
        title: t("pages.ai_coach.graduation_maintain_title", "Maintain Progress"),
        body: t(
          "pages.ai_coach.graduation_maintain_body",
          "Amy checks in occasionally and helps prevent regression.",
        ),
      },
      {
        path: "strengthen" as const,
        icon: TrendingUp,
        title: view.strengthenOption?.title ?? t("pages.ai_coach.graduation_strengthen_title", "Strengthen Further"),
        body:
          view.strengthenOption?.description ??
          t(
            "pages.ai_coach.graduation_strengthen_body",
            "Continue improving this area beyond the original goal.",
          ),
      },
      {
        path: "new_goal" as const,
        icon: Compass,
        title: t("pages.ai_coach.graduation_new_goal_title", "Start a New Goal"),
        body: t(
          "pages.ai_coach.graduation_new_goal_body",
          "Choose another challenge Amy can help with.",
        ),
      },
    ],
    [t, view.strengthenOption],
  );

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${living ? "amy-coach-living-phase" : ""}`}
      style={
        living
          ? undefined
          : {
              background: "linear-gradient(165deg, #0f0c29 0%, #1a1040 50%, #0c1220 100%)",
            }
      }
    >
      <div className="max-w-lg mx-auto px-5 py-10 pb-16 space-y-7">
        <div className="flex flex-col items-center text-center space-y-4 pt-4">
          <ProgressRingComplete />
          <div className="inline-flex items-center gap-1.5 text-violet-300/90 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            {view.goalTitle}
          </div>
          <h1 className="font-quicksand text-2xl sm:text-[1.65rem] font-bold text-white leading-tight">
            {t("pages.ai_coach.graduation_headline", view.headline)}
          </h1>
          <p className="text-sm text-white/65 leading-relaxed max-w-md">
            {t("pages.ai_coach.graduation_subheadline", view.subheadline)}
          </p>
        </div>

        {/* Progress reflection */}
        <section
          className="rounded-2xl p-4 sm:p-5 space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
        >
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/85">
              {t("pages.ai_coach.graduation_when_started", "When you started")}
            </p>
            <ul className="space-y-1.5">
              {view.whenStarted.map((item) => (
                <li key={item} className="text-sm text-white/72 flex gap-2 leading-snug">
                  <span className="text-pink-300/80 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.35), transparent)" }}
          />
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-300/85">
              {t("pages.ai_coach.graduation_today", "Today")}
            </p>
            <ul className="space-y-1.5">
              {view.today.map((item) => (
                <li key={item} className="text-sm text-white/85 flex gap-2 leading-snug">
                  <span className="text-emerald-400 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Amy's observation */}
        <section
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(139,92,246,0.06))",
            border: "1px solid rgba(167,139,250,0.22)",
          }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/90">
            {living
              ? t("amy_coach.living.quiet_note", {
                  defaultValue: "A quiet note from Amy",
                })
              : t("pages.ai_coach.graduation_amy_observation", "Amy's Observation")}
          </p>
          <p className="text-sm text-white/75">
            {t("pages.ai_coach.graduation_amy_strengths_intro", "The biggest improvements came from:")}
          </p>
          <ul className="space-y-1.5">
            {view.amyStrengths.map((s) => (
              <li key={s} className="text-sm text-white/88 flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Next paths */}
        <section className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/80 px-1">
            {t("pages.ai_coach.graduation_next_paths", "What's next with Amy")}
          </p>
          <div className="space-y-2.5">
            {pathCards.map(({ path, icon: Icon, title, body }) => (
              <button
                key={path}
                type="button"
                onClick={() =>
                  onChoosePath(
                    path,
                    path === "strengthen" ? view.strengthenOption?.goalId : undefined,
                  )
                }
                className="w-full text-left rounded-2xl p-4 transition-transform active:scale-[0.99]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(139,92,246,0.18)" }}
                  >
                    <Icon size={18} className="text-violet-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white text-sm">{title}</p>
                    <p className="text-xs text-white/55 mt-1 leading-relaxed">{body}</p>
                  </div>
                  <ArrowRight size={16} className="text-violet-300/60 shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Recommended goals (shown when new goal path context) */}
        {view.recommendedGoals.length > 0 && onPickRecommendedGoal && (
          <section className="space-y-3">
            <p className="text-sm text-white/70 leading-relaxed px-1">
              {t(
                "pages.ai_coach.graduation_recommendations_intro",
                "Based on your coaching journey, Amy recommends:",
              )}
            </p>
            <div className="space-y-2">
              {view.recommendedGoals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onPickRecommendedGoal(g.id)}
                  className="w-full text-left rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(139,92,246,0.1)",
                    border: "1px solid rgba(139,92,246,0.22)",
                  }}
                >
                  <p className="font-semibold text-white">{g.title}</p>
                  <p className="text-xs text-white/50 mt-0.5">{g.reason}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
