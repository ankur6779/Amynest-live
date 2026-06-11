import { useTranslation } from "react-i18next";
import type { RecommendationBundle } from "@workspace/math-playground";

export function RecommendationPanel({ bundle }: { bundle: RecommendationBundle }) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(34,211,238,0.15)",
      }}
    >
      <p className="text-[10px] font-bold text-cyan-300/80 uppercase mb-2">
        {t("components.math_playground.recommendations_title")}
      </p>
      <div className="space-y-1.5">
        {bundle.items.map((item) => (
          <div key={item.horizon} className="text-[10px] text-white/70">
            <span className="font-bold text-white/90">
              {t(`components.math_playground.rec_horizon_${item.horizon}`)}:
            </span>{" "}
            {item.activityId
              ? t(`components.math_playground.${item.activityId}`)
              : item.skillFocus
                ? t(`components.math_playground.parent_skill_${item.skillFocus}`)
                : t(item.titleKey)}
          </div>
        ))}
      </div>
    </div>
  );
}
