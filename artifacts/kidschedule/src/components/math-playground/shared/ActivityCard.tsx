import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ACTIVITY_CARDS, isActivityUnlocked } from "@workspace/math-playground";

type CardDef = (typeof ACTIVITY_CARDS)[number];

interface ActivityCardProps {
  card: CardDef;
  ageYears: number;
  completions?: number;
  masteryScore?: number;
  isPracticeTarget?: boolean;
  onSelect: () => void;
}

export function ActivityCard({
  card,
  ageYears,
  completions,
  masteryScore,
  isPracticeTarget,
  onSelect,
}: ActivityCardProps) {
  const { t } = useTranslation();
  const unlocked = isActivityUnlocked(card.id, ageYears);
  const showMastery = unlocked && masteryScore !== undefined && (completions ?? 0) > 0;

  return (
    <motion.button
      type="button"
      disabled={!unlocked}
      onClick={onSelect}
      whileTap={unlocked ? { scale: 0.95 } : undefined}
      className="relative flex flex-col items-center justify-center rounded-2xl p-4 min-h-[140px] text-center transition-opacity"
      style={{
        background: unlocked
          ? `linear-gradient(145deg, ${card.color}33, rgba(0,0,0,0.35))`
          : "rgba(255,255,255,0.04)",
        border: `2px solid ${
          isPracticeTarget ? "hsl(var(--brand-amber-400))" : unlocked ? `${card.color}55` : "rgba(255,255,255,0.08)"
        }`,
        opacity: unlocked ? 1 : 0.45,
      }}
    >
      {!unlocked && (
        <span className="absolute top-2 right-2 text-sm" aria-hidden>
          🔒
        </span>
      )}
      {isPracticeTarget && (
        <span
          className="absolute top-2 left-2 text-[8px] font-black px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(245,158,11,0.35)", color: "hsl(var(--brand-amber-300))" }}
        >
          {t("components.math_playground.practice_tag")}
        </span>
      )}
      <span className="text-3xl mb-2">{card.emoji}</span>
      <span className="text-xs font-black text-white/90 leading-tight">
        {t(`components.math_playground.${card.titleKey}`)}
      </span>
      {showMastery && (
        <div className="w-full mt-2 px-1">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.25)" }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${masteryScore}%`, background: card.color }}
            />
          </div>
          <span className="text-[9px] text-white/40">{masteryScore}%</span>
        </div>
      )}
      {(completions ?? 0) > 0 && !showMastery && (
        <span className="text-[10px] font-bold mt-1" style={{ color: card.color }}>
          ✓ {completions}
        </span>
      )}
    </motion.button>
  );
}
