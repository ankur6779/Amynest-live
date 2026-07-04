import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { DashboardGlassCard } from "@/components/dashboard-glass-card";
import { DASHBOARD_TINTS } from "@/lib/dashboard-premium";

const FEATURE_COPY: Record<string, { title: string; body: string; href: string }> = {
  hub_phonics: {
    title: "Phonics Practice",
    body: "A quick letter sound activity for today.",
    href: "/phonics",
  },
  hub_story_hub: {
    title: "Bedtime Stories",
    body: "Wind down with a personalized story.",
    href: "/bedtime-stories",
  },
  speech_coach: {
    title: "Speech Coach",
    body: "Practice pronunciation with Amy today.",
    href: "/speech-coach",
  },
  hub_smart_study: {
    title: "Smart Study",
    body: "Try a focused learning activity together.",
    href: "/parenting-hub",
  },
  hub_nutrition: {
    title: "Nutrition Planner",
    body: "Plan a balanced meal for today.",
    href: "/nutrition",
  },
  audio_lessons: {
    title: "Audio Lessons",
    body: "Listen to a guided lesson together.",
    href: "/audio-lessons",
  },
  amy_coach: {
    title: "Amy Coach",
    body: "Ask Amy for today's parenting tip.",
    href: "/amy-coach",
  },
  smart_math: {
    title: "Smart Math",
    body: "Try a quick math trick activity.",
    href: "/learning-zone/smart-math-tricks",
  },
  bedtime_stories: {
    title: "Bedtime Stories",
    body: "Wind down with a personalized story.",
    href: "/bedtime-stories",
  },
};

type Props = { featureId: string };

export function TrialPremiumSpotlight({ featureId }: Props) {
  const { t } = useTranslation();
  const copy = FEATURE_COPY[featureId] ?? {
    title: t("retention.premium_feature", "Premium feature"),
    body: t("retention.premium_try", "Try something special in your trial."),
    href: "/parenting-hub",
  };

  return (
    <DashboardGlassCard tintRgb={DASHBOARD_TINTS.amy}>
      <Link href={copy.href} className="block p-4 group">
        <p className="text-[10px] uppercase tracking-wide text-violet-200/80 font-semibold">
          {t("retention.todays_premium", "Today's premium pick")}
        </p>
        <div className="flex items-start gap-3 mt-1">
          <div className="rounded-xl bg-violet-500/20 p-2 border border-violet-400/25">
            <Sparkles className="h-5 w-5 text-violet-200" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-sm">{copy.title}</p>
            <p className="text-xs text-white/65 mt-0.5">{copy.body}</p>
          </div>
        </div>
      </Link>
    </DashboardGlassCard>
  );
}
