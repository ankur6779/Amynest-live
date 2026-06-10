import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  buildParentRetentionSnapshot,
  deriveSkillTrend,
  type ParentRetentionSnapshot,
  type PlaygroundLearningState,
  type PlaygroundRewardState,
  type SkillBreakdown,
  type SkillTrend,
} from "@workspace/math-playground";

const SKILL_ORDER: (keyof SkillBreakdown)[] = [
  "counting",
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "patterns",
];

interface ParentRetentionDashboardProps {
  learning: PlaygroundLearningState;
  rewards: PlaygroundRewardState;
  ageYears: number;
  snapshot?: ParentRetentionSnapshot;
}

export function ParentRetentionDashboard({
  learning,
  rewards,
  ageYears,
  snapshot: savedSnapshot,
}: ParentRetentionDashboardProps) {
  const { t } = useTranslation();

  const snapshot = useMemo(() => {
    if (savedSnapshot) return savedSnapshot;
    if (learning.sessionHistory.length === 0) return null;
    return buildParentRetentionSnapshot(learning, rewards, ageYears);
  }, [savedSnapshot, learning, rewards, ageYears]);

  if (!snapshot || snapshot.sessionCount === 0) return null;

  const visibleSkills = SKILL_ORDER.filter((key) => snapshot.skillBreakdown[key] > 0);

  if (visibleSkills.length === 0) return null;

  return (
    <div
      className="mt-3 pt-3 border-t"
      style={{ borderColor: "rgba(245,158,11,0.15)" }}
    >
      <p className="text-[10px] font-bold text-amber-300/70 uppercase mb-2">
        {t("components.math_playground.parent_confidence_title")}
      </p>

      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="text-sm"
            style={{ opacity: i < snapshot.mathConfidenceStars ? 1 : 0.25 }}
          >
            ⭐
          </span>
        ))}
      </div>

      <div className="space-y-2 mb-3">
        {visibleSkills.map((skill) => (
          <SkillBar
            key={skill}
            label={t(`components.math_playground.parent_skill_${skill}`)}
            score={snapshot.skillBreakdown[skill]}
            trend={deriveSkillTrend(learning, skill)}
            trendLabel={t(`components.math_playground.parent_trend_${deriveSkillTrend(learning, skill)}`)}
          />
        ))}
      </div>

      <div
        className="rounded-lg px-2.5 py-2"
        style={{ background: "rgba(245,158,11,0.08)" }}
      >
        <p className="text-[10px] text-white/50">
          {t("components.math_playground.parent_recommended")}
        </p>
        <p className="text-xs font-bold text-white/90">
          {t(`components.math_playground.${snapshot.recommendedActivityId}`)}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: trendColor(snapshot.recommendedTrend) }}>
          {t(`components.math_playground.parent_trend_${snapshot.recommendedTrend}`)}
        </p>
      </div>
    </div>
  );
}

function SkillBar({
  label,
  score,
  trend,
  trendLabel,
}: {
  label: string;
  score: number;
  trend: SkillTrend;
  trendLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-white/70 font-medium">{label}</span>
        <span className="font-bold" style={{ color: trendColor(trend) }}>
          {score}% {trendArrow(trend)} {trendLabel}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, score)}%`,
            background: "linear-gradient(90deg, hsl(var(--brand-amber-400)), hsl(var(--brand-amber-300)))",
          }}
        />
      </div>
    </div>
  );
}

function trendArrow(trend: SkillTrend): string {
  switch (trend) {
    case "improving":
      return "↑";
    case "needs_practice":
      return "↓";
    default:
      return "→";
  }
}

function trendColor(trend: SkillTrend): string {
  switch (trend) {
    case "improving":
      return "hsl(var(--brand-green-400))";
    case "needs_practice":
      return "hsl(var(--brand-pink-400))";
    default:
      return "hsl(var(--brand-cyan-400))";
  }
}
