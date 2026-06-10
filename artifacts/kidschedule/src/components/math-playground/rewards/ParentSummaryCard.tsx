import { useTranslation } from "react-i18next";
import {
  buildParentAdaptiveInsights,
  topPlaygroundActivities,
  type PlaygroundLearningState,
  type PlaygroundRewardState,
} from "@workspace/math-playground";

interface ParentSummaryCardProps {
  childName: string;
  rewards: PlaygroundRewardState;
  learning: PlaygroundLearningState;
  ageYears: number;
}

export function ParentSummaryCard({
  childName,
  rewards,
  learning,
  ageYears,
}: ParentSummaryCardProps) {
  const { t } = useTranslation();
  const top = topPlaygroundActivities(rewards);
  const adaptive = buildParentAdaptiveInsights(learning, ageYears);

  if (top.length === 0 && rewards.stars === 0) return null;

  return (
    <div
      className="rounded-xl px-3 py-2.5 mb-3"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-amber-300/80 uppercase mb-1">
        {t("components.math_playground.parent_summary_title")}
      </p>
      <p className="text-xs text-white/70 leading-snug">
        {t("components.math_playground.parent_summary_body", {
          name: childName,
          stars: rewards.stars,
          streak: rewards.streakDays,
        })}
      </p>

      {adaptive.averageMastery > 0 && (
        <p className="text-[10px] text-white/50 mt-1.5">
          {t("components.math_playground.parent_mastery_avg", {
            score: adaptive.averageMastery,
          })}
        </p>
      )}

      {adaptive.practicing.length > 0 && (
        <p className="text-[10px] mt-1.5" style={{ color: "hsl(var(--brand-cyan-400))" }}>
          {t("components.math_playground.parent_practicing")}:{" "}
          {adaptive.practicing
            .map((id) => t(`components.math_playground.${id}`))
            .join(", ")}
        </p>
      )}

      {adaptive.strengthening.length > 0 && (
        <p className="text-[10px] mt-1 text-white/45">
          {t("components.math_playground.parent_strengthening")}:{" "}
          {adaptive.strengthening
            .map((id) => t(`components.math_playground.${id}`))
            .join(", ")}
        </p>
      )}

      {top.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {top.map(({ activityId, count }) => (
            <span
              key={activityId}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(245,158,11,0.15)", color: "hsl(var(--brand-amber-300))" }}
            >
              {t(`components.math_playground.${activityId}`)} ×{count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
