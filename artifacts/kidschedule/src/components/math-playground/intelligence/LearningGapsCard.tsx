import { useTranslation } from "react-i18next";
import type { LearningGapSummary } from "@workspace/math-playground";

export function LearningGapsCard({ gaps }: { gaps: LearningGapSummary }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(244,114,182,0.2)",
      }}
    >
      <p className="text-[10px] font-bold text-pink-300/80 uppercase mb-1.5">
        {t("components.math_playground.learning_gaps_title")}
      </p>
      <ul className="space-y-1 mb-2">
        {gaps.gaps.slice(0, 4).map((gap) => (
          <li key={gap.skill} className="text-[10px] text-white/70">
            • {t(`components.math_playground.parent_skill_${gap.skill}`)} ({gap.masteryScore}%)
          </li>
        ))}
      </ul>
      {gaps.recommendedFocus.length > 0 && (
        <p className="text-[10px]" style={{ color: "hsl(var(--brand-cyan-400))" }}>
          {t("components.math_playground.recommended_focus")}:{" "}
          {gaps.recommendedFocus
            .map((id) => t(`components.math_playground.${id}`))
            .join(", ")}
        </p>
      )}
    </div>
  );
}
