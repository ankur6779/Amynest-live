import { ChevronLeft, Sparkles, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AmyUnderstandingView } from "@/lib/coach-understanding";

export function CoachUnderstandingScreen({
  goalTitle,
  understanding,
  onBack,
  onGenerate,
}: {
  goalTitle: string;
  understanding: AmyUnderstandingView;
  onBack: () => void;
  onGenerate: () => void;
}) {
  const { t } = useTranslation();

  const personalizationItems = [
    t("pages.ai_coach.understanding_signal_age", "Child age"),
    t("pages.ai_coach.understanding_signal_goal", "Goal type"),
    t("pages.ai_coach.understanding_signal_patterns", "Situation patterns"),
    t("pages.ai_coach.understanding_signal_feedback", "Your feedback on each win"),
  ];

  return (
    <div
      className="app-fixed-below-header fixed inset-0 z-40 overflow-y-auto"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)" }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6 pb-10">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-violet-300/80 hover:text-violet-200 w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> {t("pages.ai_coach.back_3")}
        </button>

        {/* Amy presence + header */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
              boxShadow: "0 0 24px rgba(139,92,246,0.45)",
            }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/90">
              {goalTitle}
            </p>
            <h1 className="font-quicksand text-xl font-bold text-white">
              {t("pages.ai_coach.amys_understanding", "Amy's Understanding")}
            </h1>
          </div>
        </div>

        {/* Main summary card */}
        <section
          className="rounded-3xl p-5 space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(139,92,246,0.22)",
            boxShadow: "0 8px 32px rgba(15,12,41,0.35)",
          }}
        >
          <p className="text-sm font-semibold text-violet-200/95">
            {t("pages.ai_coach.heres_what_im_hearing", "Here's what I'm hearing:")}
          </p>
          <ul className="space-y-2.5">
            {understanding.bullets.map((bullet) => (
              <li key={bullet} className="flex gap-2.5 text-sm text-white/85 leading-snug">
                <span className="text-violet-300 mt-0.5 shrink-0">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-white/70 leading-relaxed pt-1 border-t border-white/8">
            {understanding.closingLine}
          </p>
        </section>

        {/* Amy's approach */}
        <section
          className="rounded-2xl p-4 space-y-2"
          style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.18)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/85">
            {t("pages.ai_coach.amys_approach", "Amy's Approach")}
          </p>
          <p className="text-sm text-white/78 leading-relaxed">
            {t(
              "pages.ai_coach.approach_body",
              "Most parenting challenges improve through small repeated actions. You do not need to change everything at once. We'll focus on one practical win at a time.",
            )}
          </p>
        </section>

        {/* Personalization signals */}
        <section
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/85">
            {t("pages.ai_coach.coaching_tailored_using", "Your coaching will be tailored using:")}
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {personalizationItems.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-white/75">
                <Check size={14} className="text-emerald-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Journey preview — examples, not commitments */}
        <section
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-300/85">
            {t("pages.ai_coach.what_coaching_may_focus_on", "What coaching may focus on")}
          </p>
          <ul className="space-y-2">
            {understanding.focusAreas.map((area) => (
              <li key={area} className="flex items-center gap-2 text-sm text-white/75">
                <Check size={14} className="text-violet-300 shrink-0" />
                {area}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/45 leading-relaxed">
            {t(
              "pages.ai_coach.focus_disclaimer",
              "These are examples, not commitments — Amy adapts based on your progress.",
            )}
          </p>
        </section>

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-1">
          <button
            type="button"
            data-on-dark
            onClick={onGenerate}
            className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all"
            style={{
              background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
              boxShadow: "0 0 28px rgba(139,92,246,0.4)",
            }}
          >
            {t("pages.ai_coach.generate_my_first_win", "Generate My First Win")}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3 rounded-2xl font-semibold text-sm text-violet-200/80 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {t("pages.ai_coach.back_3", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
}

export const COACH_LOADING_MESSAGES = [
  "pages.ai_coach.loading_state_understanding",
  "pages.ai_coach.loading_state_starting_point",
  "pages.ai_coach.loading_state_personalizing",
  "pages.ai_coach.loading_state_preparing",
] as const;

export function CoachGeneratingScreen({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();

  return (
    <div
      className="app-fixed-below-header fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #0f0c29 0%, #1a1040 55%, #0c1220 100%)" }}
    >
      <div className="text-center text-white px-8 space-y-6 w-full max-w-sm">
        <div
          className="relative w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, hsl(var(--brand-violet-500)), hsl(var(--brand-pink-500)))",
            boxShadow: "0 0 32px rgba(139,92,246,0.45)",
          }}
        >
          <Sparkles className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="font-quicksand text-2xl font-bold">
          {t("pages.ai_coach.loading_headline", "Amy is preparing your coaching")}
        </h2>
        <p className="text-sm text-white/75 min-h-[2.5rem] transition-opacity duration-500">
          {t(messageKey)}
        </p>
        <div className="h-1 rounded-full overflow-hidden bg-white/10">
          <div
            className="h-full rounded-full animate-pulse"
            style={{
              width: "45%",
              background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
