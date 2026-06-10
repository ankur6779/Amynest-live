import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ACTIVITY_CARDS, pickComebackActivity, type PlaygroundLearningState } from "@workspace/math-playground";

interface ComebackMissionCardProps {
  ageYears: number;
  learning: PlaygroundLearningState;
  onSelect: () => void;
}

export function ComebackMissionCard({ ageYears, learning, onSelect }: ComebackMissionCardProps) {
  const { t } = useTranslation();
  const activityId = pickComebackActivity(learning, ageYears);
  if (!activityId) return null;

  const card = ACTIVITY_CARDS.find((c) => c.id === activityId);
  const stats = learning.activityStats[activityId];
  if (!card || !stats) return null;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className="w-full rounded-2xl px-3 py-3 mb-3 text-left"
      style={{
        background: `linear-gradient(135deg, ${card.color}22, rgba(0,0,0,0.35))`,
        border: `1px solid ${card.color}55`,
      }}
    >
      <p className="text-[10px] font-bold uppercase" style={{ color: card.color }}>
        {t("components.math_playground.comeback_title")}
      </p>
      <p className="text-sm font-black text-white mt-0.5">
        {card.emoji} {t(`components.math_playground.${card.titleKey}`)}
      </p>
      <p className="text-[10px] text-white/50 mt-1">
        {t("components.math_playground.comeback_body", { mastery: stats.masteryScore })}
      </p>
    </motion.button>
  );
}
